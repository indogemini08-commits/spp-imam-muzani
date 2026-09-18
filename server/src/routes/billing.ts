import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { Bill, Student } from '../types';
import { recalculateBillStatus, ensureStudent12MonthSppBills, ensureStudent12MonthEskulBills, ensureStudentPreviousArrearsBill, syncAnnualBills } from '../services/billingEngine';

const router = Router();

// Get all bills with rich filters
router.get('/', (req, res) => {
  try {
    const { student_id, category, status, class_name, period_month, search, limit = 100 } = req.query;

    let sqlStr = `
      SELECT 
        b.*,
        s.name as student_name,
        s.nis as student_nis,
        s.class_name as student_class
      FROM bills b
      JOIN students s ON b.student_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (student_id) {
      sqlStr += ' AND b.student_id = ?';
      params.push(student_id);
    }
    if (category) {
      sqlStr += ' AND b.category = ?';
      params.push(category);
    }
    if (status) {
      sqlStr += ' AND b.status = ?';
      params.push(status);
    }
    if (class_name) {
      sqlStr += ' AND s.class_name = ?';
      params.push(class_name);
    }
    if (period_month) {
      sqlStr += ' AND b.period_month = ?';
      params.push(period_month);
    }
    if (search) {
      sqlStr += ' AND (s.name LIKE ? OR s.nis LIKE ? OR b.bill_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sqlStr += ' ORDER BY b.due_date ASC, s.name ASC LIMIT ?';
    params.push(Number(limit));

    const rows = query<any>(sqlStr, params);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get bills grouped for a student
router.get('/student/:id', (req, res) => {
  try {
    const { id } = req.params;
    const student = get<any>(`
      SELECT 
        s.*,
        sp.name as spp_type_name,
        sp.monthly_amount as spp_amount
      FROM students s
      LEFT JOIN spp_types sp ON s.spp_type_id = sp.id
      WHERE s.id = ? OR s.nis = ?
    `, [id, id]);
    if (!student) return res.status(404).json({ error: 'Santri tidak ditemukan' });

    if (!student.spp_type_name) {
      const fallbackSpp = get<any>('SELECT name, monthly_amount FROM spp_types WHERE is_active = 1 LIMIT 1');
      if (fallbackSpp) {
        student.spp_type_name = fallbackSpp.name;
        student.spp_amount = fallbackSpp.monthly_amount;
      }
    }

    // Automatically ensure all 12 months (Juli s.d. Juni) of SPP bills exist
    ensureStudent12MonthSppBills(student.id);
    // Automatically ensure all 12 months (Juli s.d. Juni) of enrolled Eskul bills exist
    ensureStudent12MonthEskulBills(student.id);
    // Automatically ensure previous academic year arrears bill exists
    ensureStudentPreviousArrearsBill(student.id);
    // Automatically ensure annual bills are synchronized
    syncAnnualBills(student.id);

    const activeEskulIds = new Set(query<{ id: string }>('SELECT id FROM eskul_types').map(e => e.id));
    let studentEskuls: string[] = [];
    try {
      studentEskuls = JSON.parse(student.eskul_ids || '[]');
    } catch {}
    student.eskul_ids = (Array.isArray(studentEskuls) ? studentEskuls : []).filter(id => activeEskulIds.has(id));

    const bills = query<Bill>('SELECT * FROM bills WHERE student_id = ? ORDER BY due_date ASC', [student.id]);

    // Filter out historical manual ad-hoc items from checkout bills
    const activeBills = bills.filter(b => b.category_id !== 'manual_adhoc');

    const sppBills = activeBills.filter(b => b.category === 'SPP');
    const eskulBills = activeBills.filter(b => b.category === 'ESKUL' && activeEskulIds.has(b.category_id));
    const annualBills = activeBills.filter(b => b.category === 'DAFTAR_ULANG' || b.category === 'TAHUNAN');
    const prevArrearsBills = activeBills.filter(b => b.category_id === 'prev_arrears' || b.id.startsWith('bill_prev_'));
    const khususBills = activeBills.filter(b => b.category_id === 'tagihan_khusus' || b.id.startsWith('bill_khusus_'));
    const otherBills = activeBills.filter(b => 
      b.category === 'LAINNYA' && 
      b.category_id !== 'prev_arrears' && 
      !b.id.startsWith('bill_prev_') &&
      b.category_id !== 'tagihan_khusus' && 
      !b.id.startsWith('bill_khusus_')
    );

    const totalBills = activeBills.reduce((sum, b) => sum + b.amount, 0);
    const totalPaid = activeBills.reduce((sum, b) => sum + b.paid_amount, 0);
    const totalRemaining = activeBills.reduce((sum, b) => sum + b.remaining_amount, 0);

    return res.json({
      student,
      bills: activeBills,
      grouped: {
        spp: sppBills,
        eskul: eskulBills,
        annual: annualBills,
        prev_arrears: prevArrearsBills,
        khusus: khususBills,
        other: otherBills
      },
      summary: {
        totalBills,
        totalPaid,
        totalRemaining
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get Tagihan Khusus Santri (Kebutuhan personal: seragam, selimut, peci, dsb)
router.get('/khusus', (req, res) => {
  try {
    const { class_name, status, search } = req.query;
    let sqlStr = `
      SELECT 
        b.*,
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
      sqlStr += ' AND b.status = ?';
      params.push(status);
    }
    if (search) {
      sqlStr += ' AND (s.name LIKE ? OR s.nis LIKE ? OR b.bill_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sqlStr += ' ORDER BY b.created_at DESC, b.due_date DESC';
    const rows = query<any>(sqlStr, params);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create Tagihan Khusus Santri (support single item or multi-items array)
router.post('/khusus', async (req, res) => {
  try {
    const { student_id, items, item_name, quantity, unit_price, total_amount, due_date, notes } = req.body;
    if (!student_id) {
      return res.status(400).json({ error: 'Santri wajib dipilih' });
    }
    const student = get<Student>('SELECT * FROM students WHERE id = ?', [student_id]);
    if (!student) return res.status(404).json({ error: 'Santri tidak ditemukan' });

    const todayStr = new Date().toISOString().split('T')[0];

    // Multi-items payload
    if (Array.isArray(items) && items.length > 0) {
      const createdIds: string[] = [];
      const itemSummaries: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const name = (item.item_name || '').trim();
        const itemQty = Math.max(1, parseInt(item.quantity) || 1);
        const itemUnitPrice = Math.max(0, parseFloat(item.unit_price) || 0);
        const amt = parseFloat(item.total_amount ?? (itemQty * itemUnitPrice));
        if (!name || isNaN(amt) || amt <= 0) {
          continue; // Skip invalid item
        }

        const billId = `bill_khusus_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 5)}`;
        const dueDateStr = item.due_date || todayStr;
        const status = dueDateStr < todayStr ? 'TUNGGAKAN' : 'BELUM_BAYAR';

        const qty = itemQty > 1 ? ` (${itemQty} pcs)` : '';
        const catStr = item.category ? ` [${item.category}]` : '';
        const noteStr = item.notes ? ` - Catatan: ${item.notes}` : '';
        const fullBillName = `${name}${qty}${catStr}${noteStr}`;

        run(`
          INSERT INTO bills (
            id, student_id, academic_year_id, category, category_id, bill_name,
            period_month, period_year, amount, paid_amount, remaining_amount,
            due_date, status
          ) VALUES (
            ?, ?, 'ta_2026_2027', 'LAINNYA', 'tagihan_khusus', ?,
            NULL, 2026, ?, 0, ?,
            ?, ?
          )
        `, [
          billId,
          student.id,
          fullBillName,
          amt,
          amt,
          dueDateStr,
          status
        ]);

        createdIds.push(billId);
        itemSummaries.push(`${name} (Rp ${amt.toLocaleString('id-ID')})`);
      }

      if (createdIds.length === 0) {
        return res.status(400).json({ error: 'Tidak ada item tagihan yang valid untuk dibuat (periksa nama & nominal)' });
      }

      run(
        'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Tambah Tagihan Khusus Multi-Item", ?, datetime("now", "localtime"))',
        [`audit_${Date.now()}`, `Membuat ${createdIds.length} tagihan khusus untuk ${student.name} (${student.nis}): ${itemSummaries.join(', ')}`]
      );

      await persistDb();
      return res.json({ message: `${createdIds.length} tagihan khusus santri berhasil dibuat`, ids: createdIds });
    }

    // Single item fallback
    if (!item_name || total_amount === undefined) {
      return res.status(400).json({ error: 'Nama kebutuhan/tagihan dan nominal wajib diisi' });
    }

    const billId = `bill_khusus_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const amt = parseFloat(total_amount);
    const dueDateStr = due_date || todayStr;
    const status = dueDateStr < todayStr ? 'TUNGGAKAN' : 'BELUM_BAYAR';

    const qty = quantity && Number(quantity) > 1 ? ` (${quantity} pcs)` : '';
    const noteStr = notes ? ` [${notes}]` : '';
    const fullBillName = `${item_name}${qty}${noteStr}`;

    run(`
      INSERT INTO bills (
        id, student_id, academic_year_id, category, category_id, bill_name,
        period_month, period_year, amount, paid_amount, remaining_amount,
        due_date, status
      ) VALUES (
        ?, ?, 'ta_2026_2027', 'LAINNYA', 'tagihan_khusus', ?,
        NULL, 2026, ?, 0, ?,
        ?, ?
      )
    `, [
      billId,
      student.id,
      fullBillName,
      amt,
      amt,
      dueDateStr,
      status
    ]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Tambah Tagihan Khusus", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Membuat tagihan khusus "${fullBillName}" untuk ${student.name} (${student.nis}) senilai Rp ${amt.toLocaleString('id-ID')}`]
    );

    await persistDb();
    return res.json({ message: 'Tagihan khusus santri berhasil dibuat', id: billId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create manual ad-hoc bill (e.g. Study Tour, Laundry, Asrama, dsb.)
router.post('/manual-bill', async (req, res) => {
  try {
    const { student_id, category, bill_name, amount, due_date } = req.body;
    if (!student_id || !bill_name || amount === undefined) {
      return res.status(400).json({ error: 'Santri, nama tagihan, dan nominal wajib diisi' });
    }

    const student = get<Student>('SELECT * FROM students WHERE id = ?', [student_id]);
    if (!student) return res.status(404).json({ error: 'Santri tidak ditemukan' });

    const billId = `bill_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const amt = parseFloat(amount);
    const todayStr = new Date().toISOString().split('T')[0];
    const dueDateStr = due_date || todayStr;
    const status = dueDateStr < todayStr ? 'TUNGGAKAN' : 'BELUM_BAYAR';

    run(`
      INSERT INTO bills (
        id, student_id, academic_year_id, category, category_id, bill_name,
        period_month, period_year, amount, paid_amount, remaining_amount,
        due_date, status
      ) VALUES (
        ?, ?, 'ta_2026_2027', ?, NULL, ?,
        NULL, 2026, ?, 0, ?,
        ?, ?
      )
    `, [
      billId,
      student.id,
      category || 'LAINNYA',
      bill_name,
      amt,
      amt,
      dueDateStr,
      status
    ]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Tambah Tagihan Manual", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Membuat tagihan manual ${bill_name} untuk ${student.name} senilai Rp ${amt.toLocaleString('id-ID')}`]
    );

    await persistDb();
    return res.json({ message: 'Tagihan berhasil dibuat', id: billId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete unpaid bill
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bill = get<Bill>('SELECT * FROM bills WHERE id = ?', [id]);
    if (!bill) return res.status(404).json({ error: 'Tagihan tidak ditemukan' });

    if (bill.paid_amount > 0) {
      return res.status(400).json({ error: 'Tagihan yang sudah memiliki riwayat pembayaran tidak dapat dihapus langsung' });
    }

    run('DELETE FROM bills WHERE id = ?', [id]);
    await persistDb();
    return res.json({ message: 'Tagihan berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
