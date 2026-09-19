// Schema SQL for Aplikasi SPP Sekolah

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'bendahara', 'staff', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS school_settings (
  id TEXT PRIMARY KEY DEFAULT 'school_main',
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  active_academic_year_id TEXT,
  treasurer_name TEXT NOT NULL,
  treasurer_nip TEXT NOT NULL,
  logo_url TEXT,
  app_logo_url TEXT DEFAULT '',
  stamp_url TEXT,
  signature_url TEXT,
  trx_prefix TEXT NOT NULL DEFAULT 'TRX',
  receipt_prefix TEXT NOT NULL DEFAULT 'KWT',
  next_trx_seq INTEGER NOT NULL DEFAULT 1,
  next_receipt_seq INTEGER NOT NULL DEFAULT 1,
  wa_provider TEXT NOT NULL DEFAULT 'direct_link',
  wa_sender_number TEXT NOT NULL DEFAULT '',
  wa_sender_name TEXT NOT NULL DEFAULT '',
  wa_footer TEXT NOT NULL DEFAULT '',
  yayasan_name TEXT DEFAULT 'YAYASAN PENDIDIKAN ISLAM IMAM MUZANI',
  headmaster_title TEXT DEFAULT 'Kepala Sekolah / Mudir Pesantren',
  headmaster_name TEXT DEFAULT "KH. Abdullah Syafi'i, Lc., M.Pd.I.",
  headmaster_nip TEXT DEFAULT 'NIY: 197804152005011002',
  bank_accounts TEXT DEFAULT '[]',
  available_classes TEXT DEFAULT '["7A","7B","8A","8B","9A","10 IPA"]'
);

CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  semester TEXT NOT NULL DEFAULT 'Ganjil',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS spp_types (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  monthly_amount REAL NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  active_months TEXT NOT NULL, -- JSON array string, e.g. ["Juli","Agustus",...]
  is_mandatory INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eskul_types (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly', -- monthly, semester, annual
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS annual_bill_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  academic_year_id TEXT NOT NULL,
  due_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  allow_installment INTEGER NOT NULL DEFAULT 1,
  is_mandatory INTEGER NOT NULL DEFAULT 1,
  target_classes TEXT NOT NULL DEFAULT 'ALL',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS annual_bill_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  total_amount REAL NOT NULL,
  items TEXT NOT NULL, -- JSON string of items array
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  nis TEXT UNIQUE NOT NULL,
  nisn TEXT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'L',
  birth_place TEXT,
  birth_date TEXT,
  level TEXT NOT NULL DEFAULT 'SMP',
  class_name TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Nonaktif', 'Mutasi', 'Lulus')),
  spp_type_id TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  father_name TEXT,
  father_phone TEXT,
  mother_name TEXT,
  mother_phone TEXT,
  address TEXT,
  join_date TEXT NOT NULL,
  eskul_ids TEXT DEFAULT '[]', -- JSON string of enrolled eskul IDs
  access_pin TEXT DEFAULT '1234',
  previous_arrears REAL DEFAULT 0,
  previous_arrears_note TEXT DEFAULT '',
  additional_arrears TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id),
  FOREIGN KEY (spp_type_id) REFERENCES spp_types(id)
);

-- Core Unified Billing Table (Single Source of Truth)
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('SPP', 'ESKUL', 'DAFTAR_ULANG', 'TAHUNAN', 'LAINNYA')),
  category_id TEXT, -- ID from spp_types, eskul_types, or annual_bill_types
  bill_name TEXT NOT NULL,
  period_month TEXT, -- e.g. "Juli", "Agustus" for monthly bills
  period_year INTEGER,
  amount REAL NOT NULL,
  paid_amount REAL NOT NULL DEFAULT 0,
  remaining_amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'BELUM_BAYAR' CHECK(status IN ('BELUM_BAYAR', 'SEBAGIAN', 'LUNAS', 'TUNGGAKAN')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  transaction_no TEXT UNIQUE NOT NULL,
  receipt_no TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  student_id TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  cash_received REAL,
  change_returned REAL,
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK(status IN ('SUCCESS', 'CANCELLED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  bill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  period_month TEXT,
  amount_allocated REAL NOT NULL,
  remaining_after REAL NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES bills(id)
);

CREATE TABLE IF NOT EXISTS payment_confirmations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  proof_url TEXT NOT NULL,
  notes TEXT,
  target_bill_ids TEXT NOT NULL, -- JSON array string
  status TEXT NOT NULL DEFAULT 'Menunggu' CHECK(status IN ('Menunggu', 'Disetujui', 'Ditolak')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  rejection_reason TEXT,
  transaction_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Terkirim',
  channel TEXT NOT NULL DEFAULT 'Direct wa.me',
  error_message TEXT,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  activity TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;
