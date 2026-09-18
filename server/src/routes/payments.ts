import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { Transaction, TransactionItem, SchoolSettings, Student, Bill } from '../types';
import { processPayment } from '../services/billingEngine';

const router = Router();

// Process Payment (Multi-bill allocation)
router.post('/', async (req, res) => {
  try {
    const student_id = req.body.student_id || req.body.studentId;
    const payment_method = req.body.payment_method || req.body.paymentMethod;
    const allocations = (req.body.allocations || []).map((a: any) => ({
      billId: a.billId || a.bill_id,
      amount: Number(a.amount || 0)
    }));
    const manual_items = (req.body.manual_items || req.body.manualItems || []).map((m: any) => ({
      name: String(m.name || m.bill_name || '').trim(),
      amount: Number(m.amount || 0),
      notes: m.notes || ''
    })).filter((m: any) => m.name && m.amount > 0);

    const cashier_id = req.body.cashier_id || req.body.cashierId;
    const cashier_name = req.body.cashier_name || req.body.cashierName;
    const notes = req.body.notes;
    const discount = req.body.discount;
    const cash_received = req.body.cash_received || req.body.cashReceived;
    const change_returned = req.body.change_returned || req.body.changeReturned;

    if (!student_id || !payment_method || (allocations.length === 0 && manual_items.length === 0)) {
      return res.status(400).json({ error: 'Data pembayaran tidak lengkap (santri, metode, atau alokasi tagihan/item kosong)' });
    }

    const result = await processPayment({
      studentId: student_id,
      paymentMethod: payment_method,
      allocations,
      manualItems: manual_items,
      cashierId: cashier_id || 'usr_super_admin',
      cashierName: cashier_name || 'Fakhrur Rodhi (Super Admin)',
      notes,
      discount: Number(discount || 0),
      cashReceived: Number(cash_received || 0),
      changeReturned: Number(change_returned || 0)
    });

    return res.json({
      message: 'Pembayaran berhasil diproses dan kwitansi diterbitkan',
      transaction: result.transaction,
      receiptNo: result.receiptNo
    });
  } catch (err: any) {
    console.error('Error processing payment:', err);
    return res.status(500).json({ error: err.message });
  }
});

// List Transactions with filters
router.get('/transactions', (req, res) => {
  try {
    const { date_from, date_to, student_id, payment_method, class_name, search, limit = 100 } = req.query;

    let sqlStr = `
      SELECT 
        t.*,
        s.name as student_name,
        s.nis as student_nis,
        s.class_name as student_class
      FROM transactions t
      JOIN students s ON t.student_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date_from) {
      sqlStr += ' AND t.date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      sqlStr += ' AND t.date <= ?';
      params.push(date_to);
    }
    if (student_id) {
      sqlStr += ' AND t.student_id = ?';
      params.push(student_id);
    }
    if (payment_method) {
      sqlStr += ' AND t.payment_method = ?';
      params.push(payment_method);
    }
    if (class_name) {
      sqlStr += ' AND s.class_name = ?';
      params.push(class_name);
    }
    if (search) {
      sqlStr += ' AND (t.transaction_no LIKE ? OR t.receipt_no LIKE ? OR s.name LIKE ? OR s.nis LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sqlStr += ' ORDER BY t.date DESC, t.time DESC LIMIT ?';
    params.push(Number(limit));

    const rows = query<any>(sqlStr, params);

    // Attach items preview to each transaction
    for (const trx of rows) {
      const items = query<TransactionItem>('SELECT * FROM transaction_items WHERE transaction_id = ?', [trx.id]);
      trx.items = items;
      trx.item_count = items.length;
      trx.item_summary = items.map(i => i.bill_name).join(', ');
    }

    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get Transaction Detail
router.get('/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const trx = get<any>(`
      SELECT 
        t.*,
        s.name as student_name,
        s.nis as student_nis,
        s.class_name as student_class,
        s.parent_phone as parent_phone
      FROM transactions t
      JOIN students s ON t.student_id = s.id
      WHERE t.id = ? OR t.transaction_no = ? OR t.receipt_no = ?
    `, [id, id, id]);

    if (!trx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });

    const items = query<TransactionItem>('SELECT * FROM transaction_items WHERE transaction_id = ?', [trx.id]);
    trx.items = items;

    return res.json(trx);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get Kwitansi Data for Printing & PDF Generator
router.get('/receipt/:receiptNo', (req, res) => {
  try {
    const { receiptNo } = req.params;
    const decodedReceiptNo = decodeURIComponent(receiptNo);

    const trx = get<any>(`
      SELECT 
        t.*,
        s.name as student_name,
        s.nis as student_nis,
        s.class_name as student_class,
        s.parent_phone as student_parent_phone
      FROM transactions t
      JOIN students s ON t.student_id = s.id
      WHERE t.receipt_no = ? OR t.transaction_no = ? OR t.id = ?
    `, [decodedReceiptNo, decodedReceiptNo, decodedReceiptNo]);

    if (!trx) return res.status(404).json({ error: 'Data kwitansi tidak ditemukan' });

    const items = query<TransactionItem>('SELECT * FROM transaction_items WHERE transaction_id = ?', [trx.id]);
    const school = get<SchoolSettings>('SELECT * FROM school_settings WHERE id = "school_main"') || {
      name: 'IMAM MUZANI BOARDING SCHOOL',
      address: 'Jl. Pendidikan Islam No. 45, Kompleks Islamic Center, Bogor',
      phone: '(0251) 8345678',
      whatsapp: '081298765432',
      treasurer_name: 'Ustadz Fakhrur Rodhi Al-Hanafi, S.E.',
      treasurer_nip: '198805122014021003'
    } as any;

    return res.json({
      school,
      transaction: trx,
      items
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Cancel Transaction (with audit trail & ledger rollback)
router.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, user_name } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Alasan pembatalan transaksi wajib disertakan untuk audit' });
    }

    const trx = get<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!trx) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    if (trx.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Transaksi ini sudah dibatalkan sebelumnya' });
    }

    const items = query<TransactionItem>('SELECT * FROM transaction_items WHERE transaction_id = ?', [id]);

    // Rollback paid amounts in bills
    for (const item of items) {
      const bill = get<Bill>('SELECT * FROM bills WHERE id = ?', [item.bill_id]);
      if (bill) {
        if (bill.category_id === 'manual_adhoc') {
          // Manual ad-hoc bills were created specifically for this transaction; delete on cancellation
          run('DELETE FROM bills WHERE id = ?', [bill.id]);
        } else {
          const newPaid = Math.max(0, bill.paid_amount - item.amount_allocated);
          const newRemaining = bill.amount - newPaid;
          const todayStr = new Date().toISOString().split('T')[0];
          const newStatus = newPaid === 0 ? (bill.due_date < todayStr ? 'TUNGGAKAN' : 'BELUM_BAYAR') : 'SEBAGIAN';

          run('UPDATE bills SET paid_amount = ?, remaining_amount = ?, status = ? WHERE id = ?', [newPaid, newRemaining, newStatus, bill.id]);
        }
      }
    }

    // Mark transaction as CANCELLED
    run('UPDATE transactions SET status = "CANCELLED", notes = ? WHERE id = ?', [`DIBATALKAN: ${reason}`, id]);

    // Audit log
    run(`
      INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp)
      VALUES (?, ?, ?, 'Pembatalan Transaksi', ?, datetime('now', 'localtime'))
    `, [
      `audit_${Date.now()}`,
      'usr_bendahara',
      user_name || 'Bendahara',
      `Membatalkan transaksi ${trx.transaction_no} (${trx.receipt_no}) senilai Rp ${trx.total_amount.toLocaleString('id-ID')}. Alasan: ${reason}`
    ]);

    await persistDb();
    return res.json({ message: 'Transaksi berhasil dibatalkan dan saldo tagihan telah dikembalikan' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
