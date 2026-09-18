import { query, get, run, persistDb } from '../db/database';
import { Bill, Student, SPPType, EskulType, AnnualBillType, SchoolSettings } from '../../src/types';

export function recalculateBillStatus(billId: string): void {
  const bill = get<Bill>('SELECT * FROM bills WHERE id = ?', [billId]);
  if (!bill) return;

  const todayStr = new Date().toISOString().split('T')[0];
  let newStatus: string;

  if (bill.remaining_amount <= 0) {
    newStatus = 'LUNAS';
  } else if (bill.paid_amount > 0) {
    newStatus = 'SEBAGIAN';
  } else if (bill.due_date && bill.due_date < todayStr) {
    newStatus = 'TUNGGAKAN';
  } else {
    newStatus = 'BELUM_BAYAR';
  }

  run('UPDATE bills SET status = ? WHERE id = ?', [newStatus, billId]);
}

export async function generateAcademicYearBills(academicYearId: string): Promise<{ generatedCount: number; skippedCount: number }> {
  const students = query<Student>('SELECT * FROM students WHERE academic_year_id = ? AND status = "Aktif"', [academicYearId]);
  const sppTypes = query<SPPType>('SELECT * FROM spp_types WHERE is_active = 1');
  const sppMap = new Map<string, SPPType>(sppTypes.map(s => [s.id, s]));

  const eskulTypes = query<EskulType>('SELECT * FROM eskul_types WHERE is_active = 1');
  const eskulMap = new Map<string, EskulType>(eskulTypes.map(e => [e.id, e]));

  const annualBills = query<AnnualBillType>('SELECT * FROM annual_bill_types WHERE academic_year_id = ? AND is_active = 1', [academicYearId]);

  const months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
  const today = new Date();
  const yearNow = today.getFullYear();

  let generatedCount = 0;
  let skippedCount = 0;

  for (const student of students) {
    const studentSpp = sppMap.get(student.spp_type_id);
    if (studentSpp) {
      // Generate SPP for each month
      for (let i = 0; i < months.length; i++) {
        const m = months[i];
        const monthYear = i < 6 ? 2026 : 2027; // Academic year spanning 2 calendar years
        const monthIndex = i < 6 ? i + 7 : i - 5; // 7=July..12=Dec, 1=Jan..6=June
        const dueDate = `${monthYear}-${String(monthIndex).padStart(2, '0')}-10`;

        // Check if bill exists
        const exists = get('SELECT id FROM bills WHERE student_id = ? AND academic_year_id = ? AND category = "SPP" AND period_month = ?', [student.id, academicYearId, m]);
        if (exists) {
          skippedCount++;
          continue;
        }

        const billId = `bill_spp_${student.id}_${m}_${monthYear}`;
        const amount = studentSpp.monthly_amount;
        const initialStatus = dueDate < today.toISOString().split('T')[0] ? 'TUNGGAKAN' : 'BELUM_BAYAR';

        run(`
          INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
          VALUES (?, ?, ?, 'SPP', ?, ?, ?, ?, ?, 0, ?, ?, ?)
        `, [billId, student.id, academicYearId, studentSpp.id, `SPP ${m} ${monthYear}`, m, monthYear, amount, amount, dueDate, initialStatus]);
        generatedCount++;
      }
    }

    // Generate Eskul bills
    let enrolledEskuls: string[] = [];
    try {
      enrolledEskuls = JSON.parse(student.eskul_ids as any || '[]');
    } catch {
      enrolledEskuls = [];
    }

    for (const eskulId of enrolledEskuls) {
      const eType = eskulMap.get(eskulId);
      if (!eType) continue;

      for (let i = 0; i < months.length; i++) {
        const m = months[i];
        const monthYear = i < 6 ? 2026 : 2027;
        const monthIndex = i < 6 ? i + 7 : i - 5;
        const dueDate = `${monthYear}-${String(monthIndex).padStart(2, '0')}-10`;

        const exists = get('SELECT id FROM bills WHERE student_id = ? AND academic_year_id = ? AND category = "ESKUL" AND category_id = ? AND period_month = ?', [student.id, academicYearId, eskulId, m]);
        if (exists) {
          skippedCount++;
          continue;
        }

        const billId = `bill_eskul_${student.id}_${eskulId}_${m}_${monthYear}`;
        const amount = eType.amount;
        const initialStatus = dueDate < today.toISOString().split('T')[0] ? 'TUNGGAKAN' : 'BELUM_BAYAR';

        run(`
          INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
          VALUES (?, ?, ?, 'ESKUL', ?, ?, ?, ?, ?, 0, ?, ?, ?)
        `, [billId, student.id, academicYearId, eskulId, `Eskul ${eType.name} (${m} ${monthYear})`, m, monthYear, amount, amount, dueDate, initialStatus]);
        generatedCount++;
      }
    }

    // Generate Annual Bills
    for (const ann of annualBills) {
      if (ann.target_classes && ann.target_classes !== 'ALL') {
        let allowedClasses: string[] = [];
        try {
          allowedClasses = typeof ann.target_classes === 'string' && ann.target_classes.startsWith('[')
            ? JSON.parse(ann.target_classes)
            : [ann.target_classes];
        } catch (_) {
          allowedClasses = [ann.target_classes];
        }
        if (Array.isArray(allowedClasses) && allowedClasses.length > 0 && !allowedClasses.includes(student.class_name)) {
          continue;
        }
      }

      const exists = get('SELECT id FROM bills WHERE student_id = ? AND academic_year_id = ? AND category_id = ?', [student.id, academicYearId, ann.id]);
      if (exists) {
        skippedCount++;
        continue;
      }

      const billId = `bill_ann_${student.id}_${ann.id}`;
      const isOptional = ann.is_mandatory === 0 || (ann.is_mandatory as any) === false;
      const initialStatus = (!isOptional && ann.due_date < today.toISOString().split('T')[0]) ? 'TUNGGAKAN' : 'BELUM_BAYAR';

      run(`
        INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, ?, 'DAFTAR_ULANG', ?, ?, NULL, 2026, ?, 0, ?, ?, ?)
      `, [billId, student.id, academicYearId, ann.id, ann.name, ann.amount, ann.amount, ann.due_date, initialStatus]);
      generatedCount++;
    }
  }

  await persistDb();
  return { generatedCount, skippedCount };
}

export interface PaymentAllocationItem {
  billId: string;
  amount: number;
}

export interface ManualPaymentItem {
  name: string;
  amount: number;
  notes?: string;
}

export function getNextUniqueSequences(): { trxNo: string; receiptNo: string; nextTrxSeq: number; nextReceiptSeq: number } {
  const settings = get<SchoolSettings>('SELECT * FROM school_settings WHERE id = "school_main"') || {
    trx_prefix: 'TRX',
    receipt_prefix: 'KWT',
    next_trx_seq: 1,
    next_receipt_seq: 1
  } as any;

  const now = new Date();
  const yearStr = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');

  const trxPrefix = settings.trx_prefix || 'TRX';
  const receiptPrefix = settings.receipt_prefix || 'KWT';

  // Read all existing transactions to find the true max numeric sequence
  const trxs = query<{ transaction_no: string; receipt_no: string }>('SELECT transaction_no, receipt_no FROM transactions');
  let maxTrx = 0;
  let maxReceipt = 0;

  for (const t of trxs) {
    if (t.transaction_no) {
      const m = t.transaction_no.match(/(\d+)$/);
      if (m) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxTrx) maxTrx = num;
      }
    }
    if (t.receipt_no) {
      const m = t.receipt_no.match(/(\d+)$/);
      if (m) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxReceipt) maxReceipt = num;
      }
    }
  }

  let trxSeq = Math.max(Number(settings.next_trx_seq) || 1, maxTrx + 1);
  let receiptSeq = Math.max(Number(settings.next_receipt_seq) || 1, maxReceipt + 1);

  // Guarantee uniqueness with active while loop checks
  let candidateTrxNo = `${trxPrefix}/${yearStr}/${monthStr}/${String(trxSeq).padStart(4, '0')}`;
  while (get('SELECT 1 FROM transactions WHERE transaction_no = ?', [candidateTrxNo])) {
    trxSeq++;
    candidateTrxNo = `${trxPrefix}/${yearStr}/${monthStr}/${String(trxSeq).padStart(4, '0')}`;
  }

  let candidateReceiptNo = `${receiptPrefix}/${yearStr}/${monthStr}/${String(receiptSeq).padStart(4, '0')}`;
  while (get('SELECT 1 FROM transactions WHERE receipt_no = ?', [candidateReceiptNo])) {
    receiptSeq++;
    candidateReceiptNo = `${receiptPrefix}/${yearStr}/${monthStr}/${String(receiptSeq).padStart(4, '0')}`;
  }

  return {
    trxNo: candidateTrxNo,
    receiptNo: candidateReceiptNo,
    nextTrxSeq: trxSeq,
    nextReceiptSeq: receiptSeq
  };
}

export async function processPayment(params: {
  studentId: string;
  paymentMethod: string;
  allocations: PaymentAllocationItem[];
  manualItems?: ManualPaymentItem[];
  cashierId: string;
  cashierName: string;
  notes?: string;
  discount?: number;
  cashReceived?: number;
  changeReturned?: number;
}): Promise<{ transaction: any; receiptNo: string }> {
  const student = get<Student>('SELECT * FROM students WHERE id = ?', [params.studentId]);
  if (!student) throw new Error('Santri tidak ditemukan');

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().substring(0, 5);
  const yearStr = now.getFullYear();

  const { trxNo, receiptNo, nextTrxSeq, nextReceiptSeq } = getNextUniqueSequences();
  const trxId = `trx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  let subtotal = 0;
  for (const item of params.allocations) {
    subtotal += item.amount;
  }
  if (params.manualItems && Array.isArray(params.manualItems)) {
    for (const item of params.manualItems) {
      if (item.amount > 0) {
        subtotal += item.amount;
      }
    }
  }

  const discount = params.discount || 0;
  const totalAmount = Math.max(0, subtotal - discount);

  run(`
    INSERT INTO transactions (
      id, transaction_no, receipt_no, date, time, student_id, payment_method,
      subtotal, discount, total_amount, cash_received, change_returned,
      cashier_id, cashier_name, notes, status
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, 'SUCCESS'
    )
  `, [
    trxId, trxNo, receiptNo, dateStr, timeStr, student.id, params.paymentMethod,
    subtotal, discount, totalAmount, params.cashReceived || totalAmount, params.changeReturned || 0,
    params.cashierId, params.cashierName, params.notes || 'Pembayaran SPP / Tagihan Sekolah'
  ]);

  // Allocate to existing bills
  for (const item of params.allocations) {
    const bill = get<Bill>('SELECT * FROM bills WHERE id = ?', [item.billId]);
    if (!bill) continue;

    const newPaid = bill.paid_amount + item.amount;
    const newRemaining = Math.max(0, bill.amount - newPaid);

    let newStatus: string;
    if (newRemaining <= 0) {
      newStatus = 'LUNAS';
    } else if (newPaid > 0) {
      newStatus = 'SEBAGIAN';
    } else {
      newStatus = bill.due_date < dateStr ? 'TUNGGAKAN' : 'BELUM_BAYAR';
    }

    run(`
      UPDATE bills
      SET paid_amount = ?, remaining_amount = ?, status = ?
      WHERE id = ?
    `, [newPaid, newRemaining, newStatus, item.billId]);

    const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    run(`
      INSERT INTO transaction_items (id, transaction_id, bill_id, bill_name, category, period_month, amount_allocated, remaining_after)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [itemId, trxId, bill.id, bill.bill_name, bill.category, bill.period_month, item.amount, newRemaining]);
  }

  // Allocate to manual ad-hoc payment items
  if (params.manualItems && Array.isArray(params.manualItems)) {
    for (const mItem of params.manualItems) {
      if (!mItem.name || mItem.amount <= 0) continue;
      const billId = `bill_manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      run(`
        INSERT INTO bills (
          id, student_id, academic_year_id, category, category_id,
          bill_name, period_month, period_year, amount, paid_amount,
          remaining_amount, due_date, status
        ) VALUES (
          ?, ?, ?, 'LAINNYA', 'manual_adhoc',
          ?, NULL, ?, ?, ?,
          0, ?, 'LUNAS'
        )
      `, [billId, student.id, student.academic_year_id || 'ta_2026_2027', mItem.name, Number(yearStr), mItem.amount, mItem.amount, dateStr]);

      const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      run(`
        INSERT INTO transaction_items (id, transaction_id, bill_id, bill_name, category, period_month, amount_allocated, remaining_after)
        VALUES (?, ?, ?, ?, 'LAINNYA', NULL, ?, 0)
      `, [itemId, trxId, billId, mItem.name, mItem.amount]);
    }
  }

  // Update sequences to ensure next transactions start above the current sequence
  run(`
    UPDATE school_settings
    SET next_trx_seq = ?, next_receipt_seq = ?
    WHERE id = 'school_main'
  `, [nextTrxSeq + 1, nextReceiptSeq + 1]);

  // Record audit log
  run(`
    INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp)
    VALUES (?, ?, ?, 'Input Pembayaran', ?, datetime('now', 'localtime'))
  `, [
    `audit_${Date.now()}`,
    params.cashierId,
    params.cashierName,
    `Transaksi ${trxNo} (${receiptNo}) santri ${student.name} senilai Rp ${totalAmount.toLocaleString('id-ID')}`
  ]);

  await persistDb();

  const trx = get('SELECT * FROM transactions WHERE id = ?', [trxId]);
  return { transaction: trx, receiptNo };
}

export function ensureStudent12MonthSppBills(studentId: string): void {
  const student = get<Student>('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!student) return;

  const academicYearId = student.academic_year_id || 'ta_2026_2027';
  let studentSpp = get<SPPType>('SELECT * FROM spp_types WHERE id = ?', [student.spp_type_id]);
  if (!studentSpp) {
    studentSpp = get<SPPType>('SELECT * FROM spp_types WHERE is_active = 1 LIMIT 1');
    if (studentSpp) {
      run('UPDATE students SET spp_type_id = ? WHERE id = ?', [studentSpp.id, student.id]);
    }
  }
  if (!studentSpp) return;

  const months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
  const todayStr = new Date().toISOString().split('T')[0];
  let createdAny = false;

  for (let i = 0; i < months.length; i++) {
    const m = months[i];
    const monthYear = i < 6 ? 2026 : 2027;
    const monthIndex = i < 6 ? i + 7 : i - 5;
    const dueDate = `${monthYear}-${String(monthIndex).padStart(2, '0')}-10`;
    const expectedBillName = `SPP ${m} ${monthYear}`;

    const exists = get<Bill>('SELECT * FROM bills WHERE student_id = ? AND academic_year_id = ? AND category = "SPP" AND period_month = ?', [student.id, academicYearId, m]);
    if (!exists) {
      const billId = `bill_spp_${student.id}_${m}_${monthYear}`;
      const amount = studentSpp.monthly_amount;
      const initialStatus = dueDate < todayStr ? 'TUNGGAKAN' : 'BELUM_BAYAR';

      run(`
        INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, ?, 'SPP', ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `, [billId, student.id, academicYearId, studentSpp.id, expectedBillName, m, monthYear, amount, amount, dueDate, initialStatus]);
      createdAny = true;
    } else if (exists.paid_amount === 0) {
      // Synchronize amount and category if SPP type or tariff changed
      if (exists.amount !== studentSpp.monthly_amount || exists.category_id !== studentSpp.id) {
        run('UPDATE bills SET amount = ?, remaining_amount = ?, category_id = ? WHERE id = ?', [studentSpp.monthly_amount, studentSpp.monthly_amount, studentSpp.id, exists.id]);
        createdAny = true;
      }
    }
  }

  if (createdAny) {
    persistDb().catch(e => console.error('Error persisting db in ensureStudent12MonthSppBills:', e));
  }
}

export function ensureStudentPreviousArrearsBill(studentId: string): void {
  const student = get<Student>('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!student) return;

  let arrearsItems: Array<{ id?: string; amount: number; note: string }> = [];
  try {
    if (student.additional_arrears) {
      arrearsItems = typeof student.additional_arrears === 'string'
        ? JSON.parse(student.additional_arrears)
        : student.additional_arrears;
    }
  } catch (e) {
    arrearsItems = [];
  }

  // Filter valid items with positive amount
  arrearsItems = (Array.isArray(arrearsItems) ? arrearsItems : []).filter(
    item => (Number(item.amount) || 0) > 0
  );

  const existingBills = query<Bill>(
    'SELECT * FROM bills WHERE student_id = ? AND (category_id = "prev_arrears" OR id LIKE ?)',
    [student.id, `bill_prev_${student.id}%`]
  );

  // If no detailed items, fallback to previous_arrears single bill
  if (arrearsItems.length === 0) {
    const prevAmount = Number(student.previous_arrears || 0);
    const billId = `bill_prev_${student.id}`;
    const existingBill = existingBills.find(b => b.id === billId || b.category_id === 'prev_arrears');

    if (prevAmount > 0) {
      const billName = student.previous_arrears_note && student.previous_arrears_note.trim()
        ? `Tunggakan T.A. Sebelumnya (${student.previous_arrears_note.trim()})`
        : 'Tunggakan Tahun Ajaran Sebelumnya';

      if (!existingBill) {
        run(`
          INSERT INTO bills (
            id, student_id, academic_year_id, category, category_id,
            bill_name, period_month, period_year, amount, paid_amount,
            remaining_amount, due_date, status
          ) VALUES (
            ?, ?, ?, 'LAINNYA', 'prev_arrears',
            ?, NULL, 2025, ?, 0,
            ?, '2026-07-01', 'TUNGGAKAN'
          )
        `, [billId, student.id, student.academic_year_id || 'ta_2026_2027', billName, prevAmount, prevAmount]);
      } else {
        const paid = existingBill.paid_amount || 0;
        const newRemaining = Math.max(0, prevAmount - paid);
        const newStatus = newRemaining <= 0 ? 'LUNAS' : (paid > 0 ? 'SEBAGIAN' : 'TUNGGAKAN');

        run(`
          UPDATE bills
          SET amount = ?, remaining_amount = ?, bill_name = ?, status = ?
          WHERE id = ?
        `, [prevAmount, newRemaining, billName, newStatus, existingBill.id]);
      }

      // Delete any other unpaid prev_arrears bills if any
      for (const eb of existingBills) {
        if (eb.id !== billId && (eb.paid_amount || 0) === 0) {
          run('DELETE FROM bills WHERE id = ?', [eb.id]);
        }
      }
    } else {
      // Amount is 0, delete all unpaid prev bills
      for (const eb of existingBills) {
        if ((eb.paid_amount || 0) === 0) {
          run('DELETE FROM bills WHERE id = ?', [eb.id]);
        }
      }
    }
    persistDb().catch(e => console.error('Error persisting db in ensureStudentPreviousArrearsBill:', e));
    return;
  }

  // Multi-item arrears breakdown
  const desiredBillIds = new Set<string>();

  arrearsItems.forEach((item, idx) => {
    // If only 1 item and existing bill is bill_prev_studentId, reuse it
    const billId = (arrearsItems.length === 1 && existingBills.some(b => b.id === `bill_prev_${student.id}`))
      ? `bill_prev_${student.id}`
      : `bill_prev_${student.id}_${item.id || idx}`;

    desiredBillIds.add(billId);

    const noteTrimmed = (item.note || '').trim();
    const billName = noteTrimmed
      ? `Tunggakan: ${noteTrimmed}`
      : `Tunggakan T.A. Sebelumnya #${idx + 1}`;
    const amount = Number(item.amount || 0);

    const existing = existingBills.find(b => b.id === billId);

    if (!existing) {
      run(`
        INSERT INTO bills (
          id, student_id, academic_year_id, category, category_id,
          bill_name, period_month, period_year, amount, paid_amount,
          remaining_amount, due_date, status
        ) VALUES (
          ?, ?, ?, 'LAINNYA', 'prev_arrears',
          ?, NULL, 2025, ?, 0,
          ?, '2026-07-01', 'TUNGGAKAN'
        )
      `, [billId, student.id, student.academic_year_id || 'ta_2026_2027', billName, amount, amount]);
    } else {
      const paid = existing.paid_amount || 0;
      const newRemaining = Math.max(0, amount - paid);
      const newStatus = newRemaining <= 0 ? 'LUNAS' : (paid > 0 ? 'SEBAGIAN' : 'TUNGGAKAN');

      run(`
        UPDATE bills
        SET amount = ?, remaining_amount = ?, bill_name = ?, status = ?
        WHERE id = ?
      `, [amount, newRemaining, billName, newStatus, existing.id]);
    }
  });

  // Clean up any existing unpaid bills that are no longer in desiredBillIds
  for (const eb of existingBills) {
    if (!desiredBillIds.has(eb.id) && (eb.paid_amount || 0) === 0) {
      run('DELETE FROM bills WHERE id = ?', [eb.id]);
    }
  }

  persistDb().catch(e => console.error('Error persisting db in ensureStudentPreviousArrearsBill:', e));
}

export function ensureStudent12MonthEskulBills(studentId: string): void {
  const student = get<Student>('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!student) return;

  const activeEskuls = query<EskulType>('SELECT * FROM eskul_types WHERE is_active = 1');
  const activeEskulMap = new Map(activeEskuls.map(e => [e.id, e]));

  let enrolledEskuls: string[] = [];
  try {
    enrolledEskuls = JSON.parse(student.eskul_ids as any || '[]');
  } catch {
    enrolledEskuls = [];
  }

  // Filter against active existing eskul_types only
  const validEnrolledIds = (Array.isArray(enrolledEskuls) ? enrolledEskuls : []).filter(id => activeEskulMap.has(id));

  // Auto-heal student record if it contains deleted or non-existent eskul IDs
  if (validEnrolledIds.length !== enrolledEskuls.length) {
    run('UPDATE students SET eskul_ids = ? WHERE id = ?', [JSON.stringify(validEnrolledIds), student.id]);
  }

  // Purge any unpaid bills for eskuls this student is not enrolled in or that no longer exist
  if (validEnrolledIds.length === 0) {
    run('DELETE FROM bills WHERE student_id = ? AND category = "ESKUL" AND paid_amount = 0', [student.id]);
    persistDb().catch(e => console.error('Error persisting db in ensureStudent12MonthEskulBills:', e));
    return;
  } else {
    const placeholders = validEnrolledIds.map(() => '?').join(',');
    run(`DELETE FROM bills WHERE student_id = ? AND category = "ESKUL" AND paid_amount = 0 AND category_id NOT IN (${placeholders})`, [student.id, ...validEnrolledIds]);
  }

  const academicYearId = student.academic_year_id || 'ta_2026_2027';
  const months = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];
  const todayStr = new Date().toISOString().split('T')[0];
  let createdAny = false;

  for (const eskulId of validEnrolledIds) {
    const eType = activeEskulMap.get(eskulId)!;

    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      const monthYear = i < 6 ? 2026 : 2027;
      const monthIndex = i < 6 ? i + 7 : i - 5;
      const dueDate = `${monthYear}-${String(monthIndex).padStart(2, '0')}-10`;
      const expectedBillName = `Eskul ${eType.name} - ${m} ${monthYear}`;

      const exists = get<Bill>('SELECT * FROM bills WHERE student_id = ? AND academic_year_id = ? AND category = "ESKUL" AND category_id = ? AND period_month = ?', [student.id, academicYearId, eskulId, m]);
      if (!exists) {
        const billId = `bill_eskul_${student.id}_${eskulId}_${m}_${monthYear}`;
        const amount = eType.amount;
        const initialStatus = dueDate < todayStr ? 'TUNGGAKAN' : 'BELUM_BAYAR';

        run(`
          INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
          VALUES (?, ?, ?, 'ESKUL', ?, ?, ?, ?, ?, 0, ?, ?, ?)
        `, [billId, student.id, academicYearId, eskulId, expectedBillName, m, monthYear, amount, amount, dueDate, initialStatus]);
        createdAny = true;
      } else if (exists.paid_amount === 0) {
        // Synchronize amount and name if master data was updated
        if (exists.amount !== eType.amount || exists.bill_name !== expectedBillName) {
          run('UPDATE bills SET amount = ?, remaining_amount = ?, bill_name = ? WHERE id = ?', [eType.amount, eType.amount, expectedBillName, exists.id]);
          createdAny = true;
        }
      }
    }
  }

  if (createdAny) {
    persistDb().catch(e => console.error('Error persisting db in ensureStudent12MonthEskulBills:', e));
  }
}

/**
 * Universal Master Data Synchronization & Cleanup:
 * Ensures all students, bills, and relations match existing master data in real-time.
 */
export function synchronizeMasterData(): void {
  try {
    // 1. Eskul Types vs Students & Bills
    const activeEskuls = query<EskulType>('SELECT * FROM eskul_types');
    const validEskulMap = new Map(activeEskuls.map(e => [e.id, e]));

    // Clean students' eskul_ids
    const students = query<Student>('SELECT id, eskul_ids, spp_type_id FROM students');
    for (const st of students) {
      let list: string[] = [];
      try {
        list = JSON.parse(st.eskul_ids as any || '[]');
      } catch {
        list = [];
      }
      const filtered = (Array.isArray(list) ? list : []).filter(id => validEskulMap.has(id));
      if (filtered.length !== list.length) {
        run('UPDATE students SET eskul_ids = ? WHERE id = ?', [JSON.stringify(filtered), st.id]);
      }

      // Delete any unpaid eskul bills for eskuls this student is not enrolled in
      if (filtered.length === 0) {
        run('DELETE FROM bills WHERE student_id = ? AND category = "ESKUL" AND paid_amount = 0', [st.id]);
      } else {
        const placeholders = filtered.map(() => '?').join(',');
        run(`DELETE FROM bills WHERE student_id = ? AND category = "ESKUL" AND paid_amount = 0 AND category_id NOT IN (${placeholders})`, [st.id, ...filtered]);
      }
    }

    // Delete all unpaid bills for non-existent eskuls
    if (activeEskuls.length === 0) {
      run('DELETE FROM bills WHERE category = "ESKUL" AND paid_amount = 0');
    } else {
      const placeholders = activeEskuls.map(() => '?').join(',');
      run(`DELETE FROM bills WHERE category = "ESKUL" AND paid_amount = 0 AND category_id NOT IN (${placeholders})`, activeEskuls.map(e => e.id));
    }

    // Sync unpaid eskul bills with current name and tariff
    for (const eskul of activeEskuls) {
      run(`
        UPDATE bills
        SET amount = ?, remaining_amount = ?, bill_name = 'Eskul ' || ? || ' - ' || period_month || ' ' || period_year
        WHERE category = "ESKUL" AND category_id = ? AND paid_amount = 0
      `, [eskul.amount, eskul.amount, eskul.name, eskul.id]);
    }

    // 2. SPP Types vs Students & Bills
    const activeSpp = query<SPPType>('SELECT * FROM spp_types');
    const sppMap = new Map(activeSpp.map(s => [s.id, s]));
    const defaultSpp = activeSpp.find(s => s.is_active) || activeSpp[0];

    if (defaultSpp) {
      for (const st of students) {
        if (!sppMap.has(st.spp_type_id)) {
          run('UPDATE students SET spp_type_id = ? WHERE id = ?', [defaultSpp.id, st.id]);
        }
      }
    }

    for (const spp of activeSpp) {
      run(`
        UPDATE bills
        SET amount = ?, remaining_amount = ?
        WHERE category = "SPP" AND category_id = ? AND paid_amount = 0
      `, [spp.monthly_amount, spp.monthly_amount, spp.id]);
    }

    // 3. Annual Bills Cleanup & Sync
    syncAnnualBills();

    persistDb().catch(e => console.error('Error persisting db in synchronizeMasterData:', e));
  } catch (err) {
    console.error('Error running synchronizeMasterData:', err);
  }
}

/**
 * Synchronize all annual bills across students based on active annual_bill_types and target_classes.
 * Automatically generates missing bills, updates amounts/due dates, and removes bills for non-targeted classes.
 */
export function syncAnnualBills(targetStudentId?: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const annualTypes = query<AnnualBillType>('SELECT * FROM annual_bill_types WHERE is_active = 1');
    const students = targetStudentId
      ? query<Student>('SELECT id, name, class_name FROM students WHERE id = ?', [targetStudentId])
      : query<Student>('SELECT id, name, class_name FROM students WHERE status = "Aktif"');

    // 1. Delete unpaid annual bills whose pos no longer exists
    if (annualTypes.length === 0) {
      if (targetStudentId) {
        run('DELETE FROM bills WHERE student_id = ? AND (category = "DAFTAR_ULANG" OR category = "TAHUNAN") AND paid_amount = 0', [targetStudentId]);
      } else {
        run('DELETE FROM bills WHERE (category = "DAFTAR_ULANG" OR category = "TAHUNAN") AND paid_amount = 0');
      }
      return;
    } else {
      const annPlaceholders = annualTypes.map(() => '?').join(',');
      if (targetStudentId) {
        run(
          `DELETE FROM bills WHERE student_id = ? AND (category = "DAFTAR_ULANG" OR category = "TAHUNAN") AND paid_amount = 0 AND category_id NOT IN (${annPlaceholders})`,
          [targetStudentId, ...annualTypes.map(a => a.id)]
        );
      } else {
        run(
          `DELETE FROM bills WHERE (category = "DAFTAR_ULANG" OR category = "TAHUNAN") AND paid_amount = 0 AND category_id NOT IN (${annPlaceholders})`,
          annualTypes.map(a => a.id)
        );
      }
    }

    // 2. Loop each student and each active annual bill type
    for (const st of students) {
      for (const ann of annualTypes) {
        // Check target_classes
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
            const cleanStClass = (st.class_name || '').replace(/^Kelas\s+/i, '').trim().toLowerCase();
            isTargeted = allowedClasses.some(ac => (ac || '').replace(/^Kelas\s+/i, '').trim().toLowerCase() === cleanStClass);
          }
        }

        const existingBill = get<Bill>(
          'SELECT id, paid_amount, amount FROM bills WHERE student_id = ? AND (category = "DAFTAR_ULANG" OR category = "TAHUNAN") AND category_id = ?',
          [st.id, ann.id]
        );

        if (isTargeted) {
          const isOptional = ann.is_mandatory === 0 || (ann.is_mandatory as any) === false;
          const initialStatus = (!isOptional && ann.due_date < today) ? 'TUNGGAKAN' : 'BELUM_BAYAR';

          if (!existingBill) {
            const billId = `bill_ann_${st.id}_${ann.id}`;
            run(`
              INSERT OR REPLACE INTO bills (
                id, student_id, academic_year_id, category, category_id, bill_name,
                period_month, period_year, amount, paid_amount, remaining_amount,
                due_date, status
              ) VALUES (
                ?, ?, ?, 'DAFTAR_ULANG', ?, ?,
                NULL, 2026, ?, 0, ?,
                ?, ?
              )
            `, [
              billId,
              st.id,
              ann.academic_year_id || 'ta_2026_2027',
              ann.id,
              ann.name,
              ann.amount,
              ann.amount,
              ann.due_date,
              initialStatus
            ]);
          } else if (existingBill.paid_amount === 0) {
            run(`
              UPDATE bills
              SET amount = ?, remaining_amount = ?, bill_name = ?, due_date = ?, status = ?
              WHERE id = ? AND paid_amount = 0
            `, [ann.amount, ann.amount, ann.name, ann.due_date, initialStatus, existingBill.id]);
          }
        } else {
          // If student is NOT targeted for this bill, remove unpaid bill
          if (existingBill && existingBill.paid_amount === 0) {
            run('DELETE FROM bills WHERE id = ?', [existingBill.id]);
          }
        }
      }
    }

    // 3. Ensure optional bills (is_mandatory = 0) are never marked as TUNGGAKAN
    run(`
      UPDATE bills 
      SET status = 'BELUM_BAYAR' 
      WHERE (category = "DAFTAR_ULANG" OR category = "TAHUNAN") 
        AND status = 'TUNGGAKAN' 
        AND category_id IN (SELECT id FROM annual_bill_types WHERE is_mandatory = 0)
    `);
  } catch (err) {
    console.error('Error running syncAnnualBills:', err);
  }
}

