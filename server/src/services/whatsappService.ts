import { query, get, run, persistDb } from '../db/database';
import { Student, SchoolSettings, WhatsAppTemplate, Bill } from '../../src/types';

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function buildWhatsAppMessage(
  templateContent: string,
  variables: Record<string, string>
): string {
  let text = templateContent;

  // Build complete lookup dictionary including common aliases
  const dict: Record<string, string> = { ...variables };
  if (variables.nama) dict.nama_santri = variables.nama;
  if (variables.nama_santri) dict.nama = variables.nama_santri;
  if (variables.wali) dict.nama_wali = variables.wali;
  if (variables.nama_wali) dict.wali = variables.nama_wali;
  if (variables.total) {
    dict.total_tagihan = variables.total;
    dict.sisa_tagihan = variables.total;
    dict.nominal = variables.total;
  }
  if (variables.rincian) dict.rincian_tagihan = variables.rincian;
  if (variables.sekolah) dict.nama_sekolah = variables.sekolah;
  if (variables.tanggal_jatuh_tempo) dict.jatuh_tempo = variables.tanggal_jatuh_tempo;

  for (const [key, val] of Object.entries(dict)) {
    const safeVal = val !== undefined && val !== null ? String(val) : '';
    // Replace double braces {{key}}
    const regexDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    text = text.replace(regexDouble, safeVal);
    // Replace single brace {key}
    const regexSingle = new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi');
    text = text.replace(regexSingle, safeVal);
  }

  // Clean any remaining unfulfilled placeholders to avoid raw brackets in WA message
  text = text.replace(/\{\{?\s*[a-zA-Z0-9_-]+\s*\}?\}/g, '');
  return text;
}

export function generateWaMeLink(phone: string, text: string): string {
  const formattedPhone = formatPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}

export interface ArrearsStudentSummary {
  student: Student;
  bills: Bill[];
  totalArrears: number;
  rincianText: string;
  earliestDueDate: string;
  generatedMessage: string;
  waLink: string;
  lastReminderDate?: string;
}

export function getArrearsRecipients(): ArrearsStudentSummary[] {
  const settings = get<SchoolSettings>('SELECT * FROM school_settings WHERE id = "school_main"') || {
    name: 'IMAM MUZANI BOARDING SCHOOL',
    whatsapp: '081298765432'
  } as any;

  const template = get<WhatsAppTemplate>('SELECT * FROM whatsapp_templates WHERE trigger_type = "reminder_overdue" AND is_active = 1') || {
    content: `Assalamu'alaikum Yth. Orang Tua dari {nama} ({kelas}). Tagihan di {sekolah}: {rincian}. Total: {total}. Mohon segera melunasi.`
  } as any;

  const unpaidBills = query<Bill>(`
    SELECT * FROM bills
    WHERE status IN ('TUNGGAKAN', 'SEBAGIAN') AND remaining_amount > 0
    ORDER BY due_date ASC
  `);

  const studentBillsMap = new Map<string, Bill[]>();
  for (const b of unpaidBills) {
    const arr = studentBillsMap.get(b.student_id) || [];
    arr.push(b);
    studentBillsMap.set(b.student_id, arr);
  }

  const results: ArrearsStudentSummary[] = [];

  for (const [studentId, bills] of studentBillsMap.entries()) {
    const student = get<Student>('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) continue;

    let total = 0;
    const rincianLines: string[] = [];
    let earliestDueDate = bills[0]?.due_date || '';

    for (const b of bills) {
      total += b.remaining_amount;
      rincianLines.push(`• ${b.bill_name}: Rp ${Math.round(b.remaining_amount).toLocaleString('id-ID')}`);
    }

    const lastLog = get<{ sent_at: string }>('SELECT sent_at FROM whatsapp_logs WHERE student_id = ? ORDER BY sent_at DESC LIMIT 1', [student.id]);

    const variables: Record<string, string> = {
      nama: student.name,
      nis: student.nis,
      kelas: student.class_name,
      sekolah: settings.name || 'IMAM MUZANI BOARDING SCHOOL',
      tahun_pelajaran: '2026/2027',
      rincian: rincianLines.join('\n'),
      total: 'Rp ' + total.toLocaleString('id-ID'),
      tanggal_jatuh_tempo: earliestDueDate,
      link_tagihan: `https://imbs.sch.id/portal?nis=${student.nis}`,
      nomor_transaksi: '-'
    };

    const message = buildWhatsAppMessage(template.content, variables);
    const waLink = generateWaMeLink(student.parent_phone, message);

    results.push({
      student,
      bills,
      totalArrears: total,
      rincianText: rincianLines.join(', '),
      earliestDueDate,
      generatedMessage: message,
      waLink,
      lastReminderDate: lastLog ? lastLog.sent_at : undefined
    });
  }

  return results;
}

export async function logWhatsAppDispatch(params: {
  studentId: string;
  recipientPhone: string;
  recipientName: string;
  message: string;
  status: 'Terkirim' | 'Gagal' | 'Pending';
  channel?: string;
  error?: string;
}): Promise<void> {
  const logId = `walog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  run(`
    INSERT INTO whatsapp_logs (id, student_id, recipient_phone, recipient_name, message, status, channel, error_message, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `, [
    logId,
    params.studentId,
    params.recipientPhone,
    params.recipientName,
    params.message,
    params.status,
    params.channel || 'Direct wa.me',
    params.error || null
  ]);

  await persistDb();
}
