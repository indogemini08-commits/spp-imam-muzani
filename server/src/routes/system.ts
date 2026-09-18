import { Router } from 'express';
import { query, get, run, exportDatabaseState, importDatabaseState, persistDb } from '../db/database';
import { seedDatabase } from '../db/seed';
import { Transaction, Student, Bill, AuditLog } from '../types';

const router = Router();

// Dashboard Summary & Charts
router.get('/dashboard-stats', (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7); // e.g. "2026-09"
    const currentYearStr = todayStr.substring(0, 4); // e.g. "2026"
    const className = (req.query.class_name as string)?.trim();
    const hasClass = Boolean(className && className !== 'ALL');

    // 1. Penerimaan Hari Ini
    const incomeTodayRow = hasClass
      ? get<{ total: number }>(`
          SELECT COALESCE(SUM(t.total_amount), 0) as total
          FROM transactions t
          JOIN students s ON t.student_id = s.id
          WHERE t.date = ? AND t.status = 'SUCCESS' AND s.class_name = ?
        `, [todayStr, className])
      : get<{ total: number }>(`
          SELECT COALESCE(SUM(total_amount), 0) as total
          FROM transactions
          WHERE date = ? AND status = 'SUCCESS'
        `, [todayStr]);

    // 2. Penerimaan Bulan Ini
    const incomeThisMonthRow = hasClass
      ? get<{ total: number }>(`
          SELECT COALESCE(SUM(t.total_amount), 0) as total
          FROM transactions t
          JOIN students s ON t.student_id = s.id
          WHERE t.date LIKE ? AND t.status = 'SUCCESS' AND s.class_name = ?
        `, [`${currentMonthStr}%`, className])
      : get<{ total: number }>(`
          SELECT COALESCE(SUM(total_amount), 0) as total
          FROM transactions
          WHERE date LIKE ? AND status = 'SUCCESS'
        `, [`${currentMonthStr}%`]);

    // 3. Total Penerimaan Tahun Berjalan
    const incomeThisYearRow = hasClass
      ? get<{ total: number }>(`
          SELECT COALESCE(SUM(t.total_amount), 0) as total
          FROM transactions t
          JOIN students s ON t.student_id = s.id
          WHERE t.date LIKE ? AND t.status = 'SUCCESS' AND s.class_name = ?
        `, [`${currentYearStr}%`, className])
      : get<{ total: number }>(`
          SELECT COALESCE(SUM(total_amount), 0) as total
          FROM transactions
          WHERE date LIKE ? AND status = 'SUCCESS'
        `, [`${currentYearStr}%`]);

    // 4. Total Tunggakan
    const arrearsRow = hasClass
      ? get<{ total: number }>(`
          SELECT COALESCE(SUM(b.remaining_amount), 0) as total
          FROM bills b
          JOIN students s ON b.student_id = s.id
          WHERE b.remaining_amount > 0 AND (b.status = 'TUNGGAKAN' OR b.due_date < ?) AND s.class_name = ?
        `, [todayStr, className])
      : get<{ total: number }>(`
          SELECT COALESCE(SUM(remaining_amount), 0) as total
          FROM bills
          WHERE remaining_amount > 0 AND (status = 'TUNGGAKAN' OR due_date < ?)
        `, [todayStr]);

    // 5. Total Santri
    const studentCountRow = hasClass
      ? get<{ count: number }>('SELECT COUNT(*) as count FROM students WHERE status = "Aktif" AND class_name = ?', [className])
      : get<{ count: number }>('SELECT COUNT(*) as count FROM students WHERE status = "Aktif"');

    // 6 & 7. Lunas vs Belum Lunas
    const students = hasClass
      ? query<Student>('SELECT id FROM students WHERE status = "Aktif" AND class_name = ?', [className])
      : query<Student>('SELECT id FROM students WHERE status = "Aktif"');
    let paidStudentsCount = 0;
    let unpaidStudentsCount = 0;

    for (const s of students) {
      const remaining = get<{ total: number }>('SELECT COALESCE(SUM(remaining_amount), 0) as total FROM bills WHERE student_id = ?', [s.id]);
      if (remaining && remaining.total === 0) {
        paidStudentsCount++;
      } else {
        unpaidStudentsCount++;
      }
    }

    // 8. Tagihan Jatuh Tempo (Bulan Ini)
    const dueBillsRow = hasClass
      ? get<{ count: number; total: number }>(`
          SELECT COUNT(*) as count, COALESCE(SUM(b.remaining_amount), 0) as total
          FROM bills b
          JOIN students s ON b.student_id = s.id
          WHERE b.remaining_amount > 0 AND b.due_date <= ? AND s.class_name = ?
        `, [todayStr, className])
      : get<{ count: number; total: number }>(`
          SELECT COUNT(*) as count, COALESCE(SUM(remaining_amount), 0) as total
          FROM bills
          WHERE remaining_amount > 0 AND due_date <= ?
        `, [todayStr]);

    // Chart 1: Tren Penerimaan 12 Bulan (Juli s.d. Juni)
    const monthsOrder = [
      { name: 'Juli', code: '07' },
      { name: 'Agustus', code: '08' },
      { name: 'September', code: '09' },
      { name: 'Oktober', code: '10' },
      { name: 'November', code: '11' },
      { name: 'Desember', code: '12' },
      { name: 'Januari', code: '01' },
      { name: 'Februari', code: '02' },
      { name: 'Maret', code: '03' },
      { name: 'April', code: '04' },
      { name: 'Mei', code: '05' },
      { name: 'Juni', code: '06' }
    ];

    const monthlyTrends = monthsOrder.map(m => {
      const row = hasClass
        ? get<{ total: number }>(`
            SELECT COALESCE(SUM(t.total_amount), 0) as total
            FROM transactions t
            JOIN students s ON t.student_id = s.id
            WHERE t.date LIKE ? AND t.status = 'SUCCESS' AND s.class_name = ?
          `, [`%-${m.code}-%`, className])
        : get<{ total: number }>(`
            SELECT COALESCE(SUM(total_amount), 0) as total
            FROM transactions
            WHERE date LIKE ? AND status = 'SUCCESS'
          `, [`%-${m.code}-%`]);
      return {
        month: m.name,
        amount: row?.total || 0
      };
    });

    // Chart 2: Penerimaan berdasarkan Jenis Tagihan
    const categoryBreakdown = hasClass
      ? query<{ category: string; total: number }>(`
          SELECT ti.category, COALESCE(SUM(ti.amount_allocated), 0) as total
          FROM transaction_items ti
          JOIN transactions t ON ti.transaction_id = t.id
          JOIN students s ON t.student_id = s.id
          WHERE t.status = 'SUCCESS' AND s.class_name = ?
          GROUP BY ti.category
        `, [className])
      : query<{ category: string; total: number }>(`
          SELECT ti.category, COALESCE(SUM(ti.amount_allocated), 0) as total
          FROM transaction_items ti
          JOIN transactions t ON ti.transaction_id = t.id
          WHERE t.status = 'SUCCESS'
          GROUP BY ti.category
        `);

    // Chart 3: Penerimaan per Kelas
    const incomePerClass = query<{ class_name: string; total: number }>(`
      SELECT s.class_name, COALESCE(SUM(t.total_amount), 0) as total
      FROM transactions t
      JOIN students s ON t.student_id = s.id
      WHERE t.status = 'SUCCESS'
      GROUP BY s.class_name
      ORDER BY s.class_name ASC
    `);

    // Chart 4: Tunggakan per Kelas
    const arrearsPerClass = query<{ class_name: string; total: number }>(`
      SELECT s.class_name, COALESCE(SUM(b.remaining_amount), 0) as total
      FROM bills b
      JOIN students s ON b.student_id = s.id
      WHERE b.remaining_amount > 0 AND (b.status = 'TUNGGAKAN' OR b.due_date < date('now', 'localtime'))
      GROUP BY s.class_name
      ORDER BY s.class_name ASC
    `);

    // Transaksi Terbaru (Limit 8)
    const recentTransactions = hasClass
      ? query<any>(`
          SELECT 
            t.*,
            s.name as student_name,
            s.nis as student_nis,
            s.class_name as student_class
          FROM transactions t
          JOIN students s ON t.student_id = s.id
          WHERE s.class_name = ?
          ORDER BY t.date DESC, t.time DESC
          LIMIT 8
        `, [className])
      : query<any>(`
          SELECT 
            t.*,
            s.name as student_name,
            s.nis as student_nis,
            s.class_name as student_class
          FROM transactions t
          JOIN students s ON t.student_id = s.id
          ORDER BY t.date DESC, t.time DESC
          LIMIT 8
        `);

    for (const trx of recentTransactions) {
      const items = query<any>('SELECT bill_name, category FROM transaction_items WHERE transaction_id = ?', [trx.id]);
      trx.items = items;
      trx.item_summary = items.map(i => i.bill_name).join(', ');
    }

    return res.json({
      metrics: {
        income_today: incomeTodayRow?.total || 0,
        income_this_month: incomeThisMonthRow?.total || 0,
        income_this_year: incomeThisYearRow?.total || 0,
        total_arrears: arrearsRow?.total || 0,
        total_students: studentCountRow?.count || 0,
        paid_students_count: paidStudentsCount,
        unpaid_students_count: unpaidStudentsCount,
        due_bills_count: dueBillsRow?.count || 0,
        due_bills_amount: dueBillsRow?.total || 0
      },
      charts: {
        monthly_trends: monthlyTrends,
        category_breakdown: categoryBreakdown,
        income_per_class: incomePerClass,
        arrears_per_class: arrearsPerClass,
        settlement_ratio: [
          { name: 'Lunas', count: paidStudentsCount },
          { name: 'Belum Lunas / Sebagian', count: unpaidStudentsCount }
        ]
      },
      recent_transactions: recentTransactions
    });
  } catch (err: any) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Full JSON Backup Export
router.get('/backup', (req, res) => {
  try {
    const state = exportDatabaseState();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=SPP_IMBS_BACKUP_${new Date().toISOString().split('T')[0]}.json`);
    return res.send(JSON.stringify(state, null, 2));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// JSON Restore
router.post('/restore', async (req, res) => {
  try {
    const state = req.body;
    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'File data cadangan tidak valid' });
    }

    await importDatabaseState(state);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Restore Database", "Melakukan pemulihan database dari cadangan JSON", datetime("now", "localtime"))',
      [`audit_${Date.now()}`]
    );

    return res.json({ message: 'Database berhasil dipulihkan secara menyeluruh' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reset Demo Data
router.post('/reset-demo', async (req, res) => {
  try {
    const tables = [
      'users', 'school_settings', 'academic_years', 'spp_types', 'eskul_types',
      'annual_bill_types', 'annual_bill_packages', 'students', 'bills',
      'transactions', 'transaction_items', 'payment_confirmations',
      'whatsapp_templates', 'whatsapp_logs', 'audit_logs'
    ];

    for (const t of tables) {
      run(`DELETE FROM ${t};`);
    }

    await seedDatabase();
    return res.json({ message: 'Database berhasil di-reset ke data demo awal' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Audit Logs
router.get('/audit-logs', (req, res) => {
  try {
    const { search, limit = 100 } = req.query;
    let sqlStr = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sqlStr += ' AND (user_name LIKE ? OR activity LIKE ? OR details LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sqlStr += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Number(limit));

    const rows = query<AuditLog>(sqlStr, params);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
