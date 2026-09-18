import { Router } from 'express';
import { query, get } from '../db/database';
import { Student, Bill, Transaction, SchoolSettings } from '../types';

const router = Router();

// Parent Portal Student Lookup
router.get('/check-nis/:nis', (req, res) => {
  try {
    const { nis } = req.params;
    const { pin } = req.query;

    const student = get<any>(`
      SELECT 
        s.*,
        sp.name as spp_type_name,
        sp.monthly_amount as spp_amount
      FROM students s
      LEFT JOIN spp_types sp ON s.spp_type_id = sp.id
      WHERE s.nis = ?
    `, [nis.trim()]);

    if (!student) {
      return res.status(404).json({ error: 'Data santri dengan NIS tersebut tidak ditemukan. Mohon periksa kembali nomor induk Anda.' });
    }

    if (pin && student.access_pin && student.access_pin !== pin) {
      return res.status(401).json({ error: 'PIN / Kode Akses tidak sesuai' });
    }

    // Bills with is_mandatory check for annual bills
    const bills = query<any>(`
      SELECT 
        b.*,
        abt.is_mandatory,
        abt.allow_installment
      FROM bills b
      LEFT JOIN annual_bill_types abt ON b.category_id = abt.id
      WHERE b.student_id = ?
      ORDER BY b.due_date ASC
    `, [student.id]);

    // Payment history
    const transactions = query<any>(`
      SELECT t.*
      FROM transactions t
      WHERE t.student_id = ? AND t.status = 'SUCCESS'
      ORDER BY t.date DESC, t.time DESC
    `, [student.id]);

    for (const trx of transactions) {
      const items = query<any>('SELECT * FROM transaction_items WHERE transaction_id = ?', [trx.id]);
      trx.items = items;
    }

    // Pending confirmations
    const confirmations = query<any>(`
      SELECT * FROM payment_confirmations
      WHERE student_id = ?
      ORDER BY date DESC
    `, [student.id]);

    // School payment details
    const school = get<SchoolSettings>('SELECT * FROM school_settings WHERE id = "school_main"') || {
      name: 'IMAM MUZANI BOARDING SCHOOL',
      phone: '(0251) 8345678',
      whatsapp: '081298765432',
      address: 'Jl. Pendidikan Islam No. 45, Kompleks Islamic Center, Bogor'
    } as any;

    let totalBills = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalOptional = 0;

    for (const b of bills) {
      const isAnnual = b.category === 'DAFTAR_ULANG' || b.category === 'TAHUNAN';
      const isOptional = isAnnual && (b.is_mandatory === 0 || b.is_mandatory === false);

      // If it's an optional/infaq bill, never treat it as tunggakan
      if (isOptional) {
        totalOptional += b.amount;
        totalPaid += b.paid_amount;
        if (b.status === 'TUNGGAKAN') {
          b.status = b.remaining_amount <= 0 ? 'LUNAS' : (b.paid_amount > 0 ? 'SEBAGIAN' : 'BELUM_BAYAR');
        }
      } else {
        totalBills += b.amount;
        totalPaid += b.paid_amount;
        totalRemaining += b.remaining_amount;
      }
    }

    return res.json({
      school,
      student: {
        id: student.id,
        nis: student.nis,
        name: student.name,
        class_name: student.class_name,
        level: student.level,
        spp_type_name: student.spp_type_name,
        parent_phone: student.parent_phone,
        father_name: student.father_name,
        mother_name: student.mother_name
      },
      summary: {
        total_bills: totalBills,
        total_paid: totalPaid,
        total_remaining: totalRemaining,
        total_optional: totalOptional
      },
      bills: {
        spp: bills.filter(b => b.category === 'SPP'),
        eskul: bills.filter(b => b.category === 'ESKUL'),
        annual: bills.filter(b => b.category === 'DAFTAR_ULANG' || b.category === 'TAHUNAN'),
        other: bills.filter(b => b.category === 'LAINNYA' || b.category === 'KHUSUS')
      },
      transactions,
      confirmations,
      payment_accounts: (() => {
        try {
          const accs = typeof school.bank_accounts === 'string' ? JSON.parse(school.bank_accounts || '[]') : school.bank_accounts;
          if (Array.isArray(accs) && accs.length > 0) {
            return accs.filter(a => a.is_active !== false).map(a => ({
              bank: a.bank_name,
              code: a.bank_code,
              account_number: a.account_number,
              account_name: a.account_name
            }));
          }
        } catch {}
        return [
          { bank: 'Bank Syariah Indonesia (BSI)', code: '451', account_number: '7123-456-789', account_name: 'IMBS Keuangan SPP' },
          { bank: 'Bank Central Asia (BCA)', code: '014', account_number: '800-123-4567', account_name: 'Yayasan Imam Muzani Boarding School' },
          { bank: 'Bank Muamalat', code: '147', account_number: '102-000-8899', account_name: 'SPP Imam Muzani' }
        ];
      })()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
