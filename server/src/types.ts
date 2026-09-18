// Types for Backend Server SPP Imam Muzani
export type Role = 'super_admin' | 'admin' | 'bendahara' | 'staff' | 'viewer';
export type UserRole = Role;

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  role_display?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface BankAccountSetting {
  id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_code: string;
  is_active: boolean;
}

export interface SchoolSettings {
  id: string;
  name: string;
  yayasan_name?: string;
  headmaster_title?: string;
  headmaster_name?: string;
  headmaster_nip?: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  whatsapp: string;
  active_academic_year_id: string;
  treasurer_name: string;
  treasurer_nip: string;
  logo_url: string;
  app_logo_url?: string;
  stamp_url: string;
  signature_url: string;
  trx_prefix: string;
  receipt_prefix: string;
  next_trx_seq: number;
  next_receipt_seq: number;
  wa_provider: 'direct_link' | 'mock_api' | 'fonnte' | 'wablas';
  wa_sender_number: string;
  wa_sender_name: string;
  wa_footer: string;
  bank_accounts?: BankAccountSetting[];
  available_classes?: string[];
}

export interface AcademicYear {
  id: string;
  name: string;
  semester: 'Ganjil' | 'Genap';
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface SPPType {
  id: string;
  name: string;
  description: string;
  monthly_amount: number;
  period_type: 'monthly' | 'custom';
  active_months: string[];
  is_mandatory: boolean;
  is_active: boolean;
  student_count?: number;
}

export interface EskulType {
  id: string;
  name: string;
  description: string;
  amount: number;
  billing_period: 'monthly' | 'semester' | 'annual';
  is_active: boolean;
  student_count?: number;
}

export interface AnnualBillType {
  id: string;
  name: string;
  description: string;
  amount: number;
  academic_year_id: string;
  due_date: string;
  is_active: boolean;
  allow_installment: boolean;
  is_mandatory: boolean;
  target_classes?: string;
}

export interface AnnualPackageItem {
  type_id: string;
  name: string;
  amount: number;
  is_mandatory: boolean;
}

export interface AnnualBillPackage {
  id: string;
  name: string;
  academic_year_id: string;
  total_amount: number;
  items: AnnualPackageItem[];
  is_active: boolean;
}

export type StudentStatus = 'Aktif' | 'Nonaktif' | 'Mutasi' | 'Lulus';

export interface ArrearItem {
  id: string;
  amount: number;
  note: string;
}

export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  birth_place: string;
  birth_date: string;
  level: 'SMP' | 'SMA' | 'SD';
  class_name: string;
  academic_year_id: string;
  status: StudentStatus;
  spp_type_id: string;
  spp_type_name?: string;
  spp_amount?: number;
  parent_phone: string;
  father_name: string;
  father_phone: string;
  mother_name: string;
  mother_phone: string;
  address: string;
  join_date: string;
  eskul_ids?: string[];
  eskul_names?: string[];
  access_pin?: string;
  previous_arrears?: number;
  previous_arrears_note?: string;
  additional_arrears?: ArrearItem[] | string;
  created_at: string;
}

export type BillCategory = 'SPP' | 'ESKUL' | 'DAFTAR_ULANG' | 'TAHUNAN' | 'LAINNYA';
export type BillStatus = 'BELUM_BAYAR' | 'SEBAGIAN' | 'LUNAS' | 'TUNGGAKAN';

export interface Bill {
  id: string;
  student_id: string;
  student_name?: string;
  student_nis?: string;
  student_class?: string;
  academic_year_id: string;
  academic_year_name?: string;
  category: BillCategory;
  category_id?: string;
  bill_name: string;
  period_month?: string;
  period_year?: number;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: BillStatus;
  created_at: string;
}

export type PaymentMethod =
  | 'Cash/Tunai Langsung'
  | 'Transfer Bank'
  | 'QRIS Statis/Dinamis'
  | 'Tunai'
  | 'Transfer BCA'
  | 'Transfer Mandiri'
  | 'Transfer BRI'
  | 'Transfer BSI'
  | 'QRIS'
  | 'Lainnya';

export interface TransactionItem {
  id: string;
  transaction_id: string;
  bill_id: string;
  bill_name: string;
  category: BillCategory;
  period_month?: string;
  amount_allocated: number;
  remaining_after: number;
}

export interface Transaction {
  id: string;
  transaction_no: string;
  receipt_no: string;
  date: string;
  time: string;
  student_id: string;
  student_name: string;
  student_nis: string;
  student_class: string;
  payment_method: PaymentMethod;
  subtotal: number;
  discount: number;
  total_amount: number;
  cash_received?: number;
  change_returned?: number;
  cashier_id: string;
  cashier_name: string;
  notes?: string;
  status: 'SUCCESS' | 'CANCELLED';
  items?: TransactionItem[];
  created_at: string;
}

export interface PaymentConfirmation {
  id: string;
  student_id: string;
  student_name: string;
  student_nis: string;
  student_class: string;
  date: string;
  sender_name: string;
  bank_name: string;
  amount: number;
  payment_method: string;
  proof_url: string;
  notes?: string;
  target_bill_ids: string[];
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  transaction_id?: string;
  created_at: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  trigger_type: 'reminder_h7' | 'reminder_h3' | 'reminder_h_day' | 'reminder_overdue' | 'receipt_notification' | 'custom';
  content: string;
  is_active: boolean;
}

export interface WhatsAppLog {
  id: string;
  student_id: string;
  student_name: string;
  recipient_phone: string;
  recipient_name: string;
  message: string;
  status: 'Terkirim' | 'Gagal' | 'Pending';
  channel: string;
  error_message?: string;
  sent_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  activity: string;
  details: string;
  ip_address?: string;
  timestamp: string;
}

export interface DashboardMetrics {
  income_today: number;
  income_this_month: number;
  income_this_year: number;
  total_arrears: number;
  total_students: number;
  paid_students_count: number;
  unpaid_students_count: number;
  due_bills_count: number;
  due_bills_amount: number;
}
