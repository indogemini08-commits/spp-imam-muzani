import { Router } from 'express';
import { query, get } from '../db/database';
import { Student, Bill, SPPType, EskulType, AnnualBillType } from '../types';
import { syncAnnualBills } from '../services/billingEngine';

const router = Router();

// 1. Laporan Penerimaan (Dynamic Columns based on active bill types)
router.get('/penerimaan', (req, res) => {
  try {
    const { class_name, academic_year_id = 'ta_2026_2027', date_from, date_to } = req.query;

    const classes = query<{ class_name: string }>('SELECT DISTINCT class_name FROM students ORDER BY class_name ASC');
    const eskulTypes = query<EskulType>('SELECT id, name FROM eskul_types WHERE is_active = 1');
    const annualTypes = query<AnnualBillType>('SELECT id, name FROM annual_bill_types WHERE is_active = 1');

    // Build dynamic columns list
    const dynamicColumns: { key: string; label: string }[] = [
      { key: 'spp', label: 'SPP' },
      ...eskulTypes.map(e => ({ key: `eskul_${e.id}`, label: `Eskul ${e.name}` })),
      ...annualTypes.map(a => ({ key: `ann_${a.id}`, label: a.name })),
      { key: 'lainnya', label: 'Tagihan Lainnya' }
    ];

    let queryTransactions = `
      SELECT 
        ti.category,
        ti.bill_name,
        ti.amount_allocated,
        s.class_name,
        b.category_id
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN students s ON t.student_id = s.id
      LEFT JOIN bills b ON ti.bill_id = b.id
      WHERE t.status = 'SUCCESS'
    `;
    const params: any[] = [];

    if (class_name) {
      queryTransactions += ' AND s.class_name = ?';
      params.push(class_name);
    }
    if (date_from) {
      queryTransactions += ' AND t.date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      queryTransactions += ' AND t.date <= ?';
      params.push(date_to);
    }

    const items = query<any>(queryTransactions, params);

    // Group by class
    const classRowsMap = new Map<string, Record<string, number>>();
    for (const c of classes) {
      if (class_name && c.class_name !== class_name) continue;
      const initialRow: Record<string, number> = { total: 0 };
      for (const col of dynamicColumns) {
        initialRow[col.key] = 0;
      }
      classRowsMap.set(c.class_name, initialRow);
    }

    // Accumulate items into classes and columns
    for (const it of items) {
      const row = classRowsMap.get(it.class_name);
      if (!row) continue;

      let targetKey = 'lainnya';
      if (it.category === 'SPP') {
        targetKey = 'spp';
      } else if (it.category === 'ESKUL' && it.category_id) {
        targetKey = `eskul_${it.category_id}`;
      } else if (it.category_id && row[`ann_${it.category_id}`] !== undefined) {
        targetKey = `ann_${it.category_id}`;
      }

      if (row[targetKey] === undefined) {
        row[targetKey] = 0;
      }

      row[targetKey] += it.amount_allocated;
      row.total += it.amount_allocated;
    }

    const rows = Array.from(classRowsMap.entries()).map(([cName, vals]) => ({
      class_name: cName,
      ...vals
    }));

    // Grand totals
    const grandTotals: Record<string, number> = { total: 0 };
    for (const col of dynamicColumns) {
      grandTotals[col.key] = 0;
    }
    for (const r of (rows as any[])) {
      for (const col of dynamicColumns) {
        grandTotals[col.key] += r[col.key] || 0;
      }
      grandTotals.total += r.total || 0;
    }

    return res.json({
      columns: dynamicColumns,
      rows,
      grandTotals
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Laporan Status Pelunasan
router.get('/pelunasan', (req, res) => {
  try {
    const { class_name, status, search } = req.query;

    let studentsSql = `
      SELECT s.id, s.nis, s.name, s.class_name, s.status as student_status, sp.name as spp_name
      FROM students s
      LEFT JOIN spp_types sp ON s.spp_type_id = sp.id
      WHERE s.status = 'Aktif'
    `;
    const params: any[] = [];

    if (class_name) {
      studentsSql += ' AND s.class_name = ?';
      params.push(class_name);
    }
    if (search) {
      studentsSql += ' AND (s.name LIKE ? OR s.nis LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    studentsSql += ' ORDER BY s.class_name ASC, s.name ASC';
    const students = query<any>(studentsSql, params);

    const reportRows = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const bills = query<Bill>('SELECT category, amount, paid_amount, remaining_amount, status FROM bills WHERE student_id = ?', [s.id]);

      let totalSpp = 0;
      let paidSpp = 0;
      let remainingSpp = 0;

      let totalEskul = 0;
      let remainingEskul = 0;

      let totalAnnual = 0;
      let remainingAnnual = 0;

      let totalRemaining = 0;

      for (const b of bills) {
        if (b.category === 'SPP') {
          totalSpp += b.amount;
          paidSpp += b.paid_amount;
          remainingSpp += b.remaining_amount;
        } else if (b.category === 'ESKUL') {
          totalEskul += b.amount;
          remainingEskul += b.remaining_amount;
        } else if (b.category === 'DAFTAR_ULANG' || b.category === 'TAHUNAN') {
          totalAnnual += b.amount;
          remainingAnnual += b.remaining_amount;
        }
        totalRemaining += b.remaining_amount;
      }

      const totalPaidOverall = bills.reduce((acc, b) => acc + (b.paid_amount || 0), 0);
      let pelunasanStatus = 'Lunas';
      if (totalRemaining <= 0) {
        pelunasanStatus = 'Lunas';
      } else if (totalPaidOverall > 0) {
        pelunasanStatus = 'Sebagian';
      } else {
        pelunasanStatus = 'Belum Lunas';
      }

      if (status && pelunasanStatus !== status) {
        continue;
      }

      reportRows.push({
        no: i + 1,
        id: s.id,
        nis: s.nis,
        name: s.name,
        class_name: s.class_name,
        total_spp: totalSpp,
        paid_spp: paidSpp,
        remaining_spp: remainingSpp,
        remaining_eskul: remainingEskul,
        remaining_annual: remainingAnnual,
        total_remaining: totalRemaining,
        status: pelunasanStatus
      });
    }

    return res.json(reportRows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Laporan Tunggakan & Summary
router.get('/tunggakan', (req, res) => {
  try {
    const { class_name } = req.query;

    let studentsSql = 'SELECT id, nis, name, class_name, parent_phone FROM students WHERE status = "Aktif"';
    const params: any[] = [];
    if (class_name) {
      studentsSql += ' AND class_name = ?';
      params.push(class_name);
    }
    studentsSql += ' ORDER BY class_name ASC, name ASC';

    const students = query<any>(studentsSql, params);

    let totalStudentsOverdue = 0;
    let totalOverdueAmount = 0;
    let sppOverdueAmount = 0;
    let eskulOverdueAmount = 0;
    let annualOverdueAmount = 0;

    const overdueList = [];

    for (const s of students) {
      const unpaidBills = query<Bill>(`
        SELECT category, bill_name, amount, paid_amount, remaining_amount, due_date, status
        FROM bills
        WHERE student_id = ? AND remaining_amount > 0 AND (status = 'TUNGGAKAN' OR due_date < date('now', 'localtime'))
        ORDER BY due_date ASC
      `, [s.id]);

      if (unpaidBills.length === 0) continue;

      let sSpp = 0;
      let sEskul = 0;
      let sAnnual = 0;
      let sTotal = 0;

      for (const b of unpaidBills) {
        if (b.category === 'SPP') sSpp += b.remaining_amount;
        else if (b.category === 'ESKUL') sEskul += b.remaining_amount;
        else sAnnual += b.remaining_amount;

        sTotal += b.remaining_amount;
      }

      totalStudentsOverdue++;
      totalOverdueAmount += sTotal;
      sppOverdueAmount += sSpp;
      eskulOverdueAmount += sEskul;
      annualOverdueAmount += sAnnual;

      overdueList.push({
        id: s.id,
        nis: s.nis,
        name: s.name,
        class_name: s.class_name,
        parent_phone: s.parent_phone,
        earliest_due_date: unpaidBills[0]?.due_date,
        unpaid_count: unpaidBills.length,
        spp_arrears: sSpp,
        eskul_arrears: sEskul,
        annual_arrears: sAnnual,
        total_arrears: sTotal,
        bill_details: unpaidBills.map(b => `${b.bill_name} (Rp ${b.remaining_amount.toLocaleString('id-ID')})`).join(', '),
        unpaid_bills: unpaidBills
      });
    }

    return res.json({
      summary: {
        total_students_overdue: totalStudentsOverdue,
        total_overdue_amount: totalOverdueAmount,
        spp_overdue_amount: sppOverdueAmount,
        eskul_overdue_amount: eskulOverdueAmount,
        annual_overdue_amount: annualOverdueAmount
      },
      rows: overdueList
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Matrix SPP 12 Bulan (Juli - Juni)
router.get('/matrix-spp', (req, res) => {
  try {
    const { class_name, search } = req.query;

    const months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

    let sqlStr = `
      SELECT s.id, s.nis, s.name, s.class_name, sp.name as spp_type_name, sp.monthly_amount
      FROM students s
      LEFT JOIN spp_types sp ON s.spp_type_id = sp.id
      WHERE s.status = 'Aktif'
    `;
    const params: any[] = [];

    if (class_name) {
      sqlStr += ' AND s.class_name = ?';
      params.push(class_name);
    }
    if (search) {
      sqlStr += ' AND (s.name LIKE ? OR s.nis LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sqlStr += ' ORDER BY s.class_name ASC, s.name ASC';
    const students = query<any>(sqlStr, params);

    const matrixRows = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const sppBills = query<Bill>('SELECT period_month, amount, paid_amount, remaining_amount, status FROM bills WHERE student_id = ? AND category = "SPP"', [s.id]);
      const monthMap = new Map(sppBills.map(b => [b.period_month, b]));

      const row: any = {
        no: i + 1,
        id: s.id,
        nis: s.nis,
        name: s.name,
        class_name: s.class_name,
        spp_type_name: s.spp_type_name,
        months: {},
        total_kurang: 0,
        status: 'Lunas'
      };

      let totalKurang = 0;
      let totalTerbayar = 0;
      let totalBeban = 0;

      for (const m of months) {
        const b = monthMap.get(m);
        if (b) {
          row.months[m] = {
            status: b.status,
            amount: b.amount,
            paid: b.paid_amount,
            remaining: b.remaining_amount
          };
          totalKurang += (b.remaining_amount || 0);
          totalTerbayar += (b.paid_amount || 0);
          totalBeban += (b.amount || 0);
        } else {
          row.months[m] = {
            status: 'BELUM_DITAGIH',
            amount: s.monthly_amount || 0,
            paid: 0,
            remaining: s.monthly_amount || 0
          };
        }
      }

      row.total_kurang = totalKurang;
      row.total_terbayar = totalTerbayar;
      row.total_beban = totalBeban;

      if (row.total_kurang > 0) {
        row.status = row.total_kurang === (s.monthly_amount * 12) ? 'Belum Bayar' : 'Sebagian';
      }

      matrixRows.push(row);
    }

    // Compute monthly aggregate totals across all students
    const monthTotals: Record<string, { amount: number; paid: number; remaining: number; lunasCount: number }> = {};
    for (const m of months) {
      monthTotals[m] = { amount: 0, paid: 0, remaining: 0, lunasCount: 0 };
    }

    let grandTotalPaid = 0;
    let grandTotalRemaining = 0;
    let grandTotalBeban = 0;

    for (const r of matrixRows) {
      grandTotalPaid += (r.total_terbayar || 0);
      grandTotalRemaining += (r.total_kurang || 0);
      grandTotalBeban += (r.total_beban || 0);

      for (const m of months) {
        const mData = r.months[m];
        if (mData) {
          monthTotals[m].amount += (mData.amount || 0);
          monthTotals[m].paid += (mData.paid || 0);
          monthTotals[m].remaining += (mData.remaining || 0);
          if (mData.status === 'LUNAS') {
            monthTotals[m].lunasCount++;
          }
        }
      }
    }

    return res.json({
      months,
      rows: matrixRows,
      monthTotals,
      grandTotals: {
        paid: grandTotalPaid,
        remaining: grandTotalRemaining,
        amount: grandTotalBeban
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Matrix Eskul
router.get('/matrix-eskul', (req, res) => {
  try {
    const { class_name, eskul_id } = req.query;

    let sqlStr = 'SELECT id, nis, name, class_name, eskul_ids FROM students WHERE status = "Aktif"';
    const params: any[] = [];
    if (class_name) {
      sqlStr += ' AND class_name = ?';
      params.push(class_name);
    }
    sqlStr += ' ORDER BY class_name ASC, name ASC';

    const students = query<any>(sqlStr, params);
    const eskulTypes = query<EskulType>('SELECT * FROM eskul_types');
    const eskulMap = new Map(eskulTypes.map(e => [e.id, e]));

    const rows = [];
    for (const s of students) {
      let enrolled: string[] = [];
      try {
        enrolled = JSON.parse(s.eskul_ids || '[]');
      } catch {}

      if (eskul_id && !enrolled.includes(String(eskul_id))) continue;

      // Match only active/filtered eskuls
      const matchingEskulIds = eskul_id
        ? enrolled.filter(eId => eId === eskul_id)
        : enrolled;

      if (matchingEskulIds.length === 0) continue;

      const eskulDetails = [];
      let totalAmountPerMonth = 0;
      let totalKurang = 0;
      let totalPaid = 0;

      for (const eId of matchingEskulIds) {
        const eType = eskulMap.get(eId);
        if (!eType) continue;

        const bills = query<Bill>('SELECT period_month, amount, paid_amount, remaining_amount, status FROM bills WHERE student_id = ? AND category = "ESKUL" AND category_id = ?', [s.id, eId]);

        let eskulKurang = 0;
        let eskulPaid = 0;
        const monthsData: Record<string, any> = {};
        for (const b of bills) {
          if (b.period_month) {
            monthsData[b.period_month] = b;
          }
          eskulKurang += (b.remaining_amount || 0);
          eskulPaid += (b.paid_amount || 0);
        }

        totalAmountPerMonth += (eType.amount || 0);
        totalKurang += eskulKurang;
        totalPaid += eskulPaid;

        eskulDetails.push({
          id: eType.id,
          name: eType.name,
          amount: eType.amount,
          months: monthsData,
          total_kurang: eskulKurang,
          total_paid: eskulPaid,
          status: eskulKurang === 0 ? 'Lunas' : 'Belum Lunas'
        });
      }

      if (eskulDetails.length === 0) continue;

      rows.push({
        student_id: s.id,
        nis: s.nis,
        name: s.name,
        class_name: s.class_name,
        eskuls: eskulDetails,
        eskul_name: eskulDetails.map(e => e.name).join(', '),
        amount_per_month: totalAmountPerMonth,
        total_kurang: totalKurang,
        total_paid: totalPaid,
        status: totalKurang === 0 ? 'Lunas' : totalPaid > 0 ? 'Sebagian' : 'Belum Lunas'
      });
    }

    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Laporan Daftar Ulang & Tagihan Tahunan
router.get('/daftar-ulang', (req, res) => {
  try {
    // Reconcile and synchronize all annual bills for active students
    syncAnnualBills();

    const { class_name } = req.query;

    let studentsSql = 'SELECT id, nis, name, class_name FROM students WHERE status = "Aktif"';
    const params: any[] = [];
    if (class_name) {
      studentsSql += ' AND class_name = ?';
      params.push(class_name);
    }
    studentsSql += ' ORDER BY class_name ASC, name ASC';

    const students = query<any>(studentsSql, params);
    const annualTypes = query<AnnualBillType>('SELECT id, name, amount, target_classes, is_mandatory FROM annual_bill_types ORDER BY amount DESC');

    const rows = [];

    for (const s of students) {
      const bills = query<Bill>('SELECT category_id, bill_name, amount, paid_amount, remaining_amount, status FROM bills WHERE student_id = ? AND (category = "DAFTAR_ULANG" OR category = "TAHUNAN")', [s.id]);
      const billMap = new Map(bills.map(b => [b.category_id, b]));

      let totalNominal = 0;
      let totalDibayar = 0;
      let totalKurang = 0;

      const itemBreakdown: Record<string, any> = {};
      for (const ann of annualTypes) {
        // Check if this annual bill targets this student's class
        let isTargeted = true;
        if (ann.target_classes && ann.target_classes !== 'ALL') {
          let allowedClasses: string[] = [];
          try {
            allowedClasses = typeof ann.target_classes === 'string' && ann.target_classes.startsWith('[')
              ? JSON.parse(ann.target_classes)
              : [ann.target_classes];
          } catch (_) {
            allowedClasses = [ann.target_classes];
          }
          if (Array.isArray(allowedClasses) && allowedClasses.length > 0) {
            isTargeted = allowedClasses.includes(s.class_name);
          }
        }

        if (!isTargeted) {
          // This annual bill is NOT applicable to this student's class
          itemBreakdown[ann.id] = {
            name: ann.name,
            amount: 0,
            paid: 0,
            remaining: 0,
            status: 'BUKAN_SASARAN'
          };
          continue;
        }

        const b = billMap.get(ann.id);
        if (b) {
          itemBreakdown[ann.id] = {
            name: ann.name,
            amount: b.amount,
            paid: b.paid_amount,
            remaining: b.remaining_amount,
            status: b.status
          };
          totalNominal += b.amount;
          totalDibayar += b.paid_amount;
          totalKurang += b.remaining_amount;
        } else {
          itemBreakdown[ann.id] = {
            name: ann.name,
            amount: ann.amount,
            paid: 0,
            remaining: ann.amount,
            status: 'BELUM_BAYAR'
          };
          totalNominal += ann.amount;
          totalKurang += ann.amount;
        }
      }

      let status = 'Belum Lunas';
      if (totalNominal === 0) {
        status = '-';
      } else if (totalKurang === 0) {
        status = 'Lunas';
      } else if (totalDibayar > 0 && totalKurang > 0) {
        status = 'Sebagian';
      } else {
        status = 'Belum Lunas';
      }

      rows.push({
        id: s.id,
        nis: s.nis,
        name: s.name,
        class_name: s.class_name,
        package_name: 'Paket Daftar Ulang Lengkap T.A. 2026/2027',
        items: itemBreakdown,
        total_nominal: totalNominal,
        total_dibayar: totalDibayar,
        total_kurang: totalKurang,
        status
      });
    }

    return res.json({
      annualTypes,
      rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Laporan Tagihan Khusus Santri (Kebutuhan Personal & Asrama)
router.get('/tagihan-khusus', (req, res) => {
  try {
    const { class_name, status, search, category, start_date, end_date } = req.query;

    let sqlStr = `
      SELECT 
        b.id,
        b.student_id,
        b.bill_name,
        b.amount,
        b.paid_amount,
        b.remaining_amount,
        b.due_date,
        b.status,
        b.created_at,
        s.name as student_name,
        s.nis as student_nis,
        s.class_name,
        s.parent_phone,
        s.father_name
      FROM bills b
      JOIN students s ON b.student_id = s.id
      WHERE (b.category_id = 'tagihan_khusus' OR b.id LIKE 'bill_khusus_%')
    `;
    const params: any[] = [];

    if (class_name) {
      sqlStr += ' AND s.class_name = ?';
      params.push(class_name);
    }

    if (status) {
      if (status === 'LUNAS') {
        sqlStr += ' AND b.status = "LUNAS"';
      } else if (status === 'BELUM_LUNAS') {
        sqlStr += ' AND b.status != "LUNAS"';
      } else if (status === 'TUNGGAKAN') {
        sqlStr += ' AND b.status = "TUNGGAKAN"';
      }
    }

    if (category) {
      sqlStr += ' AND b.bill_name LIKE ?';
      params.push(`%[${category}]%`);
    }

    if (start_date) {
      sqlStr += ' AND (b.due_date >= ? OR date(b.created_at) >= ?)';
      params.push(start_date, start_date);
    }

    if (end_date) {
      sqlStr += ' AND (b.due_date <= ? OR date(b.created_at) <= ?)';
      params.push(end_date, end_date);
    }

    if (search) {
      sqlStr += ' AND (s.name LIKE ? OR s.nis LIKE ? OR b.bill_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sqlStr += ' ORDER BY b.created_at DESC, b.due_date DESC';

    const rawRows = query<any>(sqlStr, params);

    // Format rows and extract category tag if available
    const rows = rawRows.map(r => {
      let cat = 'Kebutuhan Santri';
      const catMatch = r.bill_name.match(/\[(.*?)\]/);
      if (catMatch && catMatch[1]) {
        cat = catMatch[1];
      }

      let cleanTitle = r.bill_name;
      if (cleanTitle.includes(' - Catatan:')) {
        cleanTitle = cleanTitle.split(' - Catatan:')[0];
      }

      return {
        ...r,
        item_title: cleanTitle,
        item_category: cat,
        status_label: r.status === 'LUNAS' ? 'Lunas' : r.paid_amount > 0 ? 'Sebagian' : 'Belum Lunas'
      };
    });

    // Summary calculations
    const uniqueStudents = new Set(rows.map(r => r.student_id));
    const total_nominal = rows.reduce((acc, r) => acc + (r.amount || 0), 0);
    const total_terbayar = rows.reduce((acc, r) => acc + (r.paid_amount || 0), 0);
    const total_kurang = rows.reduce((acc, r) => acc + (r.remaining_amount || 0), 0);
    const count_lunas = rows.filter(r => r.status === 'LUNAS').length;
    const count_belum_lunas = rows.length - count_lunas;

    // Group rows by student (1 row per student)
    const studentMap = new Map<string, any>();
    for (const r of rows) {
      if (!studentMap.has(r.student_id)) {
        studentMap.set(r.student_id, {
          student_id: r.student_id,
          student_nis: r.student_nis,
          student_name: r.student_name,
          class_name: r.class_name,
          parent_phone: r.parent_phone,
          father_name: r.father_name,
          items: [],
          total_amount: 0,
          total_paid: 0,
          total_remaining: 0,
          earliest_due_date: r.due_date,
          latest_due_date: r.due_date,
          status: 'LUNAS',
          status_label: 'Lunas'
        });
      }

      const sGroup = studentMap.get(r.student_id);
      sGroup.items.push(r);
      sGroup.total_amount += (r.amount || 0);
      sGroup.total_paid += (r.paid_amount || 0);
      sGroup.total_remaining += (r.remaining_amount || 0);
      if (r.due_date) {
        if (!sGroup.earliest_due_date || r.due_date < sGroup.earliest_due_date) {
          sGroup.earliest_due_date = r.due_date;
        }
        if (!sGroup.latest_due_date || r.due_date > sGroup.latest_due_date) {
          sGroup.latest_due_date = r.due_date;
        }
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const grouped_rows = Array.from(studentMap.values()).map(sg => {
      let overallStatus = 'LUNAS';
      let overallStatusLabel = 'Lunas';
      if (sg.total_remaining > 0) {
        if (sg.total_paid > 0) {
          overallStatus = 'SEBAGIAN';
          overallStatusLabel = 'Sebagian';
        } else {
          const hasOverdue = sg.items.some((it: any) => it.due_date && it.due_date < todayStr && it.status !== 'LUNAS');
          if (hasOverdue) {
            overallStatus = 'TUNGGAKAN';
            overallStatusLabel = 'Tunggakan';
          } else {
            overallStatus = 'BELUM_BAYAR';
            overallStatusLabel = 'Belum Bayar';
          }
        }
      }

      const itemTitles = sg.items.map((it: any) => it.item_title).join(', ');
      const categories = Array.from(new Set(sg.items.map((it: any) => it.item_category))).join(', ');

      return {
        ...sg,
        amount: sg.total_amount,
        paid_amount: sg.total_paid,
        remaining_amount: sg.total_remaining,
        status: overallStatus,
        status_label: overallStatusLabel,
        item_title: itemTitles,
        item_category: categories,
        due_date: sg.earliest_due_date === sg.latest_due_date ? sg.earliest_due_date : `${sg.earliest_due_date} s.d. ${sg.latest_due_date}`
      };
    });

    return res.json({
      summary: {
        total_nominal,
        total_terbayar,
        total_kurang,
        count_items: rows.length,
        count_santri: uniqueStudents.size,
        count_lunas,
        count_belum_lunas
      },
      rows,
      grouped_rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

