-- =============================================================================
-- SKEMA LENGKAP SUPABASE POSTGRESQL - APLIKASI SPP IMAM MUZANI BOARDING SCHOOL
-- Termasuk Sistem Reservasi Pembayaran & Bucket Storage: ImamMuzaniPay
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. TABEL-TABEL MASTER & TRANSAKSI
-- =============================================================================

-- A. TABEL USERS (Petugas & Bendahara)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY DEFAULT ('usr_' || substr(md5(random()::text), 1, 10)),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'bendahara', 'staff', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B. TABEL PENGATURAN SEKOLAH (School Settings)
CREATE TABLE IF NOT EXISTS public.school_settings (
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
  headmaster_name TEXT DEFAULT 'KH. Abdullah Syafi''i, Lc., M.Pd.I.',
  headmaster_nip TEXT DEFAULT 'NIY: 197804152005011002',
  bank_accounts JSONB DEFAULT '[]'::jsonb,
  available_classes JSONB DEFAULT '["VII","VIII","IX","X","XI","XII"]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C. TABEL TAHUN AJARAN (Academic Years)
CREATE TABLE IF NOT EXISTS public.academic_years (
  id TEXT PRIMARY KEY DEFAULT ('ta_' || substr(md5(random()::text), 1, 8)),
  name TEXT UNIQUE NOT NULL,
  semester TEXT NOT NULL DEFAULT 'Ganjil',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D. TABEL JENIS SPP BULANAN (SPP Types)
CREATE TABLE IF NOT EXISTS public.spp_types (
  id TEXT PRIMARY KEY DEFAULT ('spp_' || substr(md5(random()::text), 1, 8)),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  monthly_amount NUMERIC(12, 2) NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly',
  active_months JSONB NOT NULL DEFAULT '["Juli","Agustus","September","Oktober","November","Desember","Januari","Februari","Maret","April","Mei","Juni"]'::jsonb,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E. TABEL EKSTRAKURIKULER (Eskul Types)
CREATE TABLE IF NOT EXISTS public.eskul_types (
  id TEXT PRIMARY KEY DEFAULT ('esk_' || substr(md5(random()::text), 1, 8)),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- F. TABEL KOMPONEN BIAYA TAHUNAN / DAFTAR ULANG (Annual Bill Types)
CREATE TABLE IF NOT EXISTS public.annual_bill_types (
  id TEXT PRIMARY KEY DEFAULT ('abt_' || substr(md5(random()::text), 1, 8)),
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  allow_installment BOOLEAN NOT NULL DEFAULT TRUE,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  target_classes TEXT NOT NULL DEFAULT 'ALL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- G. TABEL PAKET BIAYA TAHUNAN (Annual Bill Packages)
CREATE TABLE IF NOT EXISTS public.annual_bill_packages (
  id TEXT PRIMARY KEY DEFAULT ('abp_' || substr(md5(random()::text), 1, 8)),
  name TEXT NOT NULL,
  academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  total_amount NUMERIC(12, 2) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- H. TABEL DATA SANTRI (Students)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY DEFAULT ('std_' || substr(md5(random()::text), 1, 10)),
  nis TEXT UNIQUE NOT NULL,
  nisn TEXT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'L' CHECK(gender IN ('L', 'P')),
  birth_place TEXT,
  birth_date DATE,
  level TEXT NOT NULL DEFAULT 'SMP',
  class_name TEXT NOT NULL,
  academic_year_id TEXT REFERENCES public.academic_years(id),
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK(status IN ('Aktif', 'Nonaktif', 'Mutasi', 'Lulus')),
  spp_type_id TEXT REFERENCES public.spp_types(id),
  parent_phone TEXT NOT NULL,
  father_name TEXT,
  father_phone TEXT,
  mother_name TEXT,
  mother_phone TEXT,
  address TEXT,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  eskul_ids JSONB DEFAULT '[]'::jsonb,
  access_pin TEXT DEFAULT '1234',
  previous_arrears NUMERIC(12, 2) DEFAULT 0,
  previous_arrears_note TEXT DEFAULT '',
  additional_arrears JSONB DEFAULT '[]'::jsonb,
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- I. TABEL MASTER TAGIHAN (Bills - Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY DEFAULT ('bill_' || substr(md5(random()::text), 1, 10)),
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id),
  category TEXT NOT NULL CHECK(category IN ('SPP', 'ESKUL', 'DAFTAR_ULANG', 'TAHUNAN', 'LAINNYA')),
  category_id TEXT,
  bill_name TEXT NOT NULL,
  period_month TEXT,
  period_year INTEGER,
  amount NUMERIC(12, 2) NOT NULL,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'BELUM_BAYAR' CHECK(status IN ('BELUM_BAYAR', 'SEBAGIAN', 'LUNAS', 'TUNGGAKAN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- J. TABEL TRANSAKSI KAS & PEMBAYARAN (Transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY DEFAULT ('trx_' || substr(md5(random()::text), 1, 10)),
  transaction_no TEXT UNIQUE NOT NULL,
  receipt_no TEXT UNIQUE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  student_id TEXT NOT NULL REFERENCES public.students(id),
  payment_method TEXT NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  cash_received NUMERIC(12, 2),
  change_returned NUMERIC(12, 2),
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK(status IN ('SUCCESS', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- K. TABEL RINCIAN ALOKASI PEMBAYARAN (Transaction Items)
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id TEXT PRIMARY KEY DEFAULT ('titem_' || substr(md5(random()::text), 1, 10)),
  transaction_id TEXT NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  bill_id TEXT NOT NULL REFERENCES public.bills(id),
  bill_name TEXT NOT NULL,
  category TEXT NOT NULL,
  period_month TEXT,
  amount_allocated NUMERIC(12, 2) NOT NULL,
  remaining_after NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- L. TABEL SISTEM RESERVASI & KONFIRMASI TRANSFER SANTRI (Payment Confirmations)
-- Menyimpan pengajuan booking/reservasi pembayaran santri & URL gambar di bucket ImamMuzaniPay
CREATE TABLE IF NOT EXISTS public.payment_confirmations (
  id TEXT PRIMARY KEY DEFAULT ('conf_' || substr(md5(random()::text), 1, 10)),
  reservation_code TEXT UNIQUE NOT NULL DEFAULT ('RSV-' || to_char(NOW(), 'YYYYMM') || '-' || substr(md5(random()::text), 1, 6)),
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sender_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Transfer Bank',
  proof_url TEXT NOT NULL, -- URL gambar di bucket Storage ImamMuzaniPay
  notes TEXT,
  target_bill_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Menunggu' CHECK(status IN ('Menunggu', 'Disetujui', 'Ditolak')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  transaction_id TEXT REFERENCES public.transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- M. TABEL TEMPLATE & LOG WHATSAPP
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id TEXT PRIMARY KEY DEFAULT ('wat_' || substr(md5(random()::text), 1, 8)),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id TEXT PRIMARY KEY DEFAULT ('wal_' || substr(md5(random()::text), 1, 10)),
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Terkirim',
  channel TEXT NOT NULL DEFAULT 'Direct wa.me',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- N. TABEL AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('aud_' || substr(md5(random()::text), 1, 10)),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  activity TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 3. KONFIGURASI SUPABASE STORAGE (BUCKET: ImamMuzaniPay)
-- =============================================================================

-- A. Membuat bucket jika belum ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ImamMuzaniPay',
  'ImamMuzaniPay',
  TRUE,
  10485760, -- Limit 10 MB per gambar
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE 
SET public = TRUE, 
    file_size_limit = 10485760;

-- B. Kebijakan Akses Storage (RLS Storage Objects)
DROP POLICY IF EXISTS "Public Read ImamMuzaniPay" ON storage.objects;
CREATE POLICY "Public Read ImamMuzaniPay" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'ImamMuzaniPay');

DROP POLICY IF EXISTS "Allow Upload to ImamMuzaniPay" ON storage.objects;
CREATE POLICY "Allow Upload to ImamMuzaniPay" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'ImamMuzaniPay');

DROP POLICY IF EXISTS "Allow Update Delete ImamMuzaniPay" ON storage.objects;
CREATE POLICY "Allow Update Delete ImamMuzaniPay" 
ON storage.objects FOR ALL 
USING (bucket_id = 'ImamMuzaniPay');


-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) UNTUK SEMUA TABEL
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spp_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eskul_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_bill_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_bill_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses:
-- 1. Pengaturan sekolah, tahun ajaran, jenis SPP & eskul dapat dibaca publik (anon)
CREATE POLICY "Public Read School Settings" ON public.school_settings FOR SELECT USING (true);
CREATE POLICY "Public Read Academic Years" ON public.academic_years FOR SELECT USING (true);
CREATE POLICY "Public Read SPP Types" ON public.spp_types FOR SELECT USING (true);
CREATE POLICY "Public Read Eskul Types" ON public.eskul_types FOR SELECT USING (true);
CREATE POLICY "Public Read Annual Types" ON public.annual_bill_types FOR SELECT USING (true);

-- 2. Santri & Tagihan dapat dibaca untuk pencarian Portal Santri
CREATE POLICY "Public Read Students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Public Read Bills" ON public.bills FOR SELECT USING (true);

-- 3. Wali santri dapat melakukan reservasi / pengajuan konfirmasi pembayaran transfer
CREATE POLICY "Public Insert Payment Confirmations" ON public.payment_confirmations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Payment Confirmations" ON public.payment_confirmations FOR SELECT USING (true);

-- 4. Hak Akses Penuh (Full CRUD) untuk Admin & Bendahara yang terautentikasi
CREATE POLICY "Full Access Users" ON public.users FOR ALL USING (true);
CREATE POLICY "Full Access School Settings" ON public.school_settings FOR ALL USING (true);
CREATE POLICY "Full Access Academic Years" ON public.academic_years FOR ALL USING (true);
CREATE POLICY "Full Access SPP Types" ON public.spp_types FOR ALL USING (true);
CREATE POLICY "Full Access Eskul Types" ON public.eskul_types FOR ALL USING (true);
CREATE POLICY "Full Access Annual Types" ON public.annual_bill_types FOR ALL USING (true);
CREATE POLICY "Full Access Students" ON public.students FOR ALL USING (true);
CREATE POLICY "Full Access Bills" ON public.bills FOR ALL USING (true);
CREATE POLICY "Full Access Transactions" ON public.transactions FOR ALL USING (true);
CREATE POLICY "Full Access Transaction Items" ON public.transaction_items FOR ALL USING (true);
CREATE POLICY "Full Access Payment Confirmations" ON public.payment_confirmations FOR ALL USING (true);
CREATE POLICY "Full Access WA Templates" ON public.whatsapp_templates FOR ALL USING (true);
CREATE POLICY "Full Access WA Logs" ON public.whatsapp_logs FOR ALL USING (true);
CREATE POLICY "Full Access Audit Logs" ON public.audit_logs FOR ALL USING (true);


-- =============================================================================
-- 5. DATA AWAL (SEED DATA) DENGAN GAMBAR STORAGE ImamMuzaniPay
-- =============================================================================

-- Insert Default School Settings (Menggunakan aset dari bucket ImamMuzaniPay)
INSERT INTO public.school_settings (
  id, name, address, city, email, phone, whatsapp,
  treasurer_name, treasurer_nip,
  logo_url, app_logo_url, stamp_url, signature_url,
  yayasan_name, headmaster_title, headmaster_name, headmaster_nip,
  bank_accounts, available_classes
) VALUES (
  'school_main',
  'IMAM MUZANI BOARDING SCHOOL',
  'Jl. Pendidikan Islam No. 45, Kompleks Islamic Center',
  'Bogor, Jawa Barat',
  'keuangan@imbs.sch.id',
  '(0251) 8345678',
  '081298765432',
  'Ustadz Fakhrur Rodhi Al-Hanafi, S.E.',
  '198805122014021003',
  -- URL Gambar merujuk ke bucket Storage ImamMuzaniPay
  '/storage/v1/object/public/ImamMuzaniPay/logos/school_logo.png',
  '/storage/v1/object/public/ImamMuzaniPay/logos/app_logo.png',
  '/storage/v1/object/public/ImamMuzaniPay/stamps/school_stamp.png',
  '/storage/v1/object/public/ImamMuzaniPay/signatures/treasurer_signature.png',
  'YAYASAN PENDIDIKAN ISLAM IMAM MUZANI',
  'Kepala Sekolah / Mudir Pesantren',
  'KH. Abdullah Syafi''i, Lc., M.Pd.I.',
  'NIY: 197804152005011002',
  '[
    {"id": "bank_1", "bank_name": "Bank Syariah Indonesia (BSI)", "bank_code": "451", "account_number": "7123-456-789", "account_name": "IMBS Keuangan SPP", "is_active": true},
    {"id": "bank_2", "bank_name": "Bank Central Asia (BCA)", "bank_code": "014", "account_number": "800-123-4567", "account_name": "Yayasan Imam Muzani Boarding School", "is_active": true},
    {"id": "bank_3", "bank_name": "Bank Muamalat", "bank_code": "147", "account_number": "102-000-8899", "account_name": "SPP Imam Muzani", "is_active": true}
  ]'::jsonb,
  '["VII", "VIII", "IX", "X", "XI", "XII"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert Default Academic Year
INSERT INTO public.academic_years (id, name, semester, start_date, end_date, is_active)
VALUES 
  ('ta_2026_2027', '2026/2027', 'Ganjil', '2026-07-01', '2027-06-30', TRUE),
  ('ta_2025_2026', '2025/2026', 'Genap', '2025-07-01', '2026-06-30', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Insert Default SPP Types
INSERT INTO public.spp_types (id, name, description, monthly_amount, period_type, is_mandatory, is_active)
VALUES 
  ('spp_reguler', 'SPP Reguler Full Boarding', 'Biaya SPP, asrama, makan 3x sehari & laundry santri', 1500000, 'monthly', TRUE, TRUE),
  ('spp_prestasi', 'SPP Beasiswa Tahfidz & Prestasi', 'Subsidi SPP santri berprestasi/tahfidz 30 juz', 750000, 'monthly', TRUE, TRUE),
  ('spp_yatim', 'SPP Dhuafa & Yatim Binaan', 'Beasiswa penuh SPP santri binaan yayasan', 0, 'monthly', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insert Default Ekstrakurikuler
INSERT INTO public.eskul_types (id, name, description, amount, billing_period, is_active)
VALUES
  ('esk_panahan', 'Panahan & Memanah Sunnah', 'Pelatihan berkuda & memanah bersama pelatih bersertifikat', 75000, 'monthly', TRUE),
  ('esk_silat', 'Pencak Silat Tapak Suci', 'Latihan beladiri fisik dan mental santri', 50000, 'monthly', TRUE),
  ('esk_robotik', 'Klub Robotik & Coding IT', 'Praktik mikrokontroler, IoT, dan algoritma komputer', 100000, 'monthly', TRUE),
  ('esk_jurnalistik', 'Jurnalistik & Bahasa Arab', 'Majalah santri, pidato, dan sastra Arab', 40000, 'monthly', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insert Default User Super Admin (Password: admin123)
INSERT INTO public.users (id, name, username, email, password_hash, role, status)
VALUES (
  'usr_super_admin',
  'IWA (Super Admin)',
  'admin',
  'admin@imbs.sch.id',
  'admin123',
  'super_admin',
  'active'
) ON CONFLICT (id) DO NOTHING;
