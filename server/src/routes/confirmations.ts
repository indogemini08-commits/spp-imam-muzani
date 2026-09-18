import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { PaymentConfirmation, Student, Bill } from '../types';
import { processPayment } from '../services/billingEngine';

const router = Router();

// Get all confirmations
router.get('/', (req, res) => {
  try {
    const { status } = req.query;
    let sqlStr = `
      SELECT 
        c.*,
        s.name as student_name,
        s.nis as student_nis,
        s.class_name as student_class,
        s.parent_phone as student_phone
      FROM payment_confirmations c
      JOIN students s ON c.student_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sqlStr += ' AND c.status = ?';
      params.push(status);
    }

    sqlStr += ' ORDER BY c.date DESC, c.created_at DESC';

    const rows = query<any>(sqlStr, params);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Submit Confirmation (from Parent Portal)
router.post('/', async (req, res) => {
  try {
    const { student_id, sender_name, bank_name, amount, payment_method, proof_url, notes, target_bill_ids } = req.body;
    if (!student_id || !sender_name || !amount) {
      return res.status(400).json({ error: 'Data santri, pengirim, dan nominal konfirmasi wajib diisi' });
    }

    const student = get<Student>('SELECT * FROM students WHERE id = ? OR nis = ?', [student_id, student_id]);
    if (!student) return res.status(404).json({ error: 'Santri tidak ditemukan' });

    const id = `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const dateStr = new Date().toISOString().split('T')[0];
    const billIdsStr = JSON.stringify(target_bill_ids || []);

    run(`
      INSERT INTO payment_confirmations (
        id, student_id, date, sender_name, bank_name, amount, payment_method,
        proof_url, notes, target_bill_ids, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'Menunggu'
      )
    `, [
      id,
      student.id,
      dateStr,
      sender_name,
      bank_name || 'Transfer Bank',
      parseFloat(amount),
      payment_method || 'Transfer Bank',
      proof_url || '',
      notes || 'Konfirmasi pembayaran via portal orang tua',
      billIdsStr
    ]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "portal", "Orang Tua", "Konfirmasi Pembayaran", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Wali dari ${student.name} mengunggah bukti transfer senilai Rp ${parseFloat(amount).toLocaleString('id-ID')}`]
    );

    await persistDb();
    return res.json({ message: 'Bukti pembayaran berhasil dikirim untuk verifikasi admin', id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Approve confirmation -> automatically creates transaction and updates ledger
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewer_name, reviewer_id } = req.body;

    const conf = get<PaymentConfirmation>('SELECT * FROM payment_confirmations WHERE id = ?', [id]);
    if (!conf) return res.status(404).json({ error: 'Data konfirmasi tidak ditemukan' });
    if (conf.status !== 'Menunggu') {
      return res.status(400).json({ error: `Konfirmasi ini sudah berstatus ${conf.status}` });
    }

    const student = get<Student>('SELECT * FROM students WHERE id = ?', [conf.student_id]);
    if (!student) return res.status(404).json({ error: 'Santri tidak ditemukan' });

    // Determine target bills to allocate
    let targetBillIds: string[] = [];
    try {
      targetBillIds = JSON.parse(conf.target_bill_ids as any || '[]');
    } catch {}

    // If specific bills not selected, automatically find oldest unpaid bills for this student
    if (targetBillIds.length === 0) {
      const unpaid = query<Bill>('SELECT id, remaining_amount FROM bills WHERE student_id = ? AND remaining_amount > 0 ORDER BY due_date ASC', [student.id]);
      targetBillIds = unpaid.map(u => u.id);
    }

    // Allocate confirmation amount across targets
    let remainingToAllocate = conf.amount;
    const allocations: { billId: string; amount: number }[] = [];

    for (const bId of targetBillIds) {
      if (remainingToAllocate <= 0) break;
      const b = get<Bill>('SELECT * FROM bills WHERE id = ?', [bId]);
      if (!b || b.remaining_amount <= 0) continue;

      const alloc = Math.min(remainingToAllocate, b.remaining_amount);
      allocations.push({ billId: b.id, amount: alloc });
      remainingToAllocate -= alloc;
    }

    if (allocations.length === 0) {
      return res.status(400).json({ error: 'Tidak ada tagihan tertunggak yang dapat dialokasikan untuk santri ini' });
    }

    // Process payment through billing engine
    const payResult = await processPayment({
      studentId: student.id,
      paymentMethod: conf.payment_method || 'Transfer Bank',
      allocations,
      cashierId: reviewer_id || 'usr_bendahara',
      cashierName: reviewer_name || 'Bendahara',
      notes: `Disetujui dari Konfirmasi Transfer a.n ${conf.sender_name} (${conf.bank_name})`,
      discount: 0
    });

    // Update confirmation status
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    run(`
      UPDATE payment_confirmations
      SET status = 'Disetujui', reviewed_by = ?, reviewed_at = ?, transaction_id = ?
      WHERE id = ?
    `, [reviewer_name || 'Bendahara', nowStr, payResult.transaction.id, id]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, ?, ?, "Approve Pembayaran", ?, datetime("now", "localtime"))',
      [
        `audit_${Date.now()}`,
        reviewer_id || 'usr_bendahara',
        reviewer_name || 'Bendahara',
        `Menyetujui bukti transfer santri ${student.name} senilai Rp ${conf.amount.toLocaleString('id-ID')} -> Transaksi ${payResult.receiptNo}`
      ]
    );

    await persistDb();

    return res.json({
      message: 'Konfirmasi disetujui, transaksi berhasil dicatat di pembukuan',
      transaction: payResult.transaction,
      receiptNo: payResult.receiptNo
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Reject confirmation
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, reviewer_name, reviewer_id } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Alasan penolakan wajib disertakan' });
    }

    const conf = get<PaymentConfirmation>('SELECT * FROM payment_confirmations WHERE id = ?', [id]);
    if (!conf) return res.status(404).json({ error: 'Data konfirmasi tidak ditemukan' });

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    run(`
      UPDATE payment_confirmations
      SET status = 'Ditolak', reviewed_by = ?, reviewed_at = ?, rejection_reason = ?
      WHERE id = ?
    `, [reviewer_name || 'Bendahara', nowStr, reason, id]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, ?, ?, "Tolak Konfirmasi Pembayaran", ?, datetime("now", "localtime"))',
      [
        `audit_${Date.now()}`,
        reviewer_id || 'usr_bendahara',
        reviewer_name || 'Bendahara',
        `Menolak bukti transfer konfirmasi #${id}. Alasan: ${reason}`
      ]
    );

    await persistDb();
    return res.json({ message: 'Konfirmasi berhasil ditolak' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
