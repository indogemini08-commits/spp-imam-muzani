import { query, run, persistDb } from './database';

export async function seedDatabase(): Promise<void> {
  const existingSettings = query("SELECT id FROM school_settings WHERE id = 'school_main'");
  if (existingSettings && existingSettings.length > 0) {
    return; // Database sudah diinisialisasi sebelumnya. Jangan pernah me-reseed data yang telah dihapus pengguna!
  }

  console.log('Menjalankan Seeding Data Awal Aplikasi SPP Sekolah...');

  // 1. School Settings
  run(`
    INSERT OR IGNORE INTO school_settings (
      id, name, address, city, email, phone, whatsapp,
      active_academic_year_id, treasurer_name, treasurer_nip,
      trx_prefix, receipt_prefix, next_trx_seq, next_receipt_seq,
      wa_provider, wa_sender_number, wa_sender_name, wa_footer
    ) VALUES (
      'school_main',
      'IMAM MUZANI BOARDING SCHOOL',
      'Jl. Pendidikan Islam No. 45, Kompleks Islamic Center',
      'Bogor, Jawa Barat',
      'keuangan@imbs.sch.id',
      '(0251) 8345678',
      '081298765432',
      'ta_2026_2027',
      'Ustadz Fakhrur Rodhi Al-Hanafi, S.E.',
      '198805122014021003',
      'TRX',
      'KWT',
      120,
      120,
      'direct_link',
      '081298765432',
      'Bendahara IMBS',
      'Pesan otomatis sistem administrasi keuangan Imam Muzani Boarding School'
    );
  `);

  // 2. Academic Years
  run(`
    INSERT OR IGNORE INTO academic_years (id, name, semester, start_date, end_date, is_active)
    VALUES 
      ('ta_2026_2027', '2026/2027', 'Ganjil', '2026-07-01', '2027-06-30', 1),
      ('ta_2025_2026', '2025/2026', 'Genap', '2025-07-01', '2026-06-30', 0);
  `);

  // 3. Users
  run(`
    INSERT OR IGNORE INTO users (id, name, username, email, password_hash, role, status)
    VALUES
      ('usr_super_admin', 'Fakhrur Rodhi (Super Admin)', 'admin', 'admin@imbs.sch.id', 'admin123', 'super_admin', 'active'),
      ('usr_bendahara', 'Ustadzah Siti Aminah, S.Ak', 'bendahara', 'bendahara@imbs.sch.id', 'bendahara123', 'bendahara', 'active'),
      ('usr_tu', 'Ustadz Ridwan Pratama', 'tu', 'tu@imbs.sch.id', 'tu123', 'admin', 'active'),
      ('usr_viewer', 'Pengawas Yayasan Imam Muzani', 'viewer', 'viewer@imbs.sch.id', 'viewer123', 'viewer', 'active');
  `);

  // 4. SPP Types
  const months = JSON.stringify(['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);
  run(`
    INSERT OR IGNORE INTO spp_types (id, name, description, monthly_amount, period_type, active_months, is_mandatory, is_active)
    VALUES
      ('spp_boarding', 'SPP Boarding / Asrama', 'Termasuk asrama, konsumsi 3x sehari, laundry, & pembinaan 24 jam', 2000000, 'monthly', ?, 1, 1),
      ('spp_reguler', 'SPP Reguler / Non-Asrama', 'Program sekolah reguler kurikulum nasional & kepesantrenan', 1300000, 'monthly', ?, 1, 1),
      ('spp_tahfidz', 'SPP Tahfidz Intensif', 'Program fokus hafalan 30 juz berijazah sanad', 1800000, 'monthly', ?, 1, 1),
      ('spp_fullday', 'SPP Full Day School', 'Program sampai ashar dengan bimbingan tahsin sore', 1500000, 'monthly', ?, 1, 1),
      ('spp_khusus', 'SPP Beasiswa Khusus', 'Subsidi keringanan biaya pendidikan prestasi/yatim', 750000, 'monthly', ?, 1, 1);
  `, [months, months, months, months, months]);

  // 5. Dynamic Eskul Types
  run(`
    INSERT OR IGNORE INTO eskul_types (id, name, description, amount, billing_period, is_active)
    VALUES
      ('eskul_futsal', 'Futsal Club', 'Pelatihan teknik futsal bersama pelatih lisensi nasional', 150000, 'monthly', 1),
      ('eskul_karate', 'Karate & Beladiri', 'Latihan beladiri disiplin karate sabuk & kejuaraan', 200000, 'monthly', 1),
      ('eskul_renang', 'Klub Renang', 'Latihan renang rutin di kolam renang olympic', 300000, 'monthly', 1),
      ('eskul_panahan', 'Panahan Sunnah', 'Latihan memanah olahraga sunnah perlengkapan standar', 250000, 'monthly', 1),
      ('eskul_coding', 'Coding & Robotika', 'Belajar pemrograman web, logika algoritma, dan mikrokontroler', 250000, 'monthly', 1),
      ('eskul_arab', 'Bahasa Arab Praktis', 'Muhadatsah & kajian literatur Arab gundul', 150000, 'monthly', 1),
      ('eskul_tahfidz_plus', 'Tahfidz Intensif Eskul', 'Setoran tambahan ba''da maghrib bagi santri reguler', 100000, 'monthly', 1);
  `);

  // 6. Annual Bill Types & Paket Daftar Ulang
  run(`
    INSERT OR IGNORE INTO annual_bill_types (id, name, description, amount, academic_year_id, due_date, is_active, allow_installment, is_mandatory)
    VALUES
      ('ann_daftar_ulang', 'Daftar Ulang', 'Biaya registrasi ulang semester/tahun ajaran baru', 2600000, 'ta_2026_2027', '2026-08-31', 1, 1, 1),
      ('ann_cicilan_daftar_ulang', 'Cicilan Daftar Ulang', 'Cicilan kedua daftar ulang tahun pelajaran', 2000000, 'ta_2026_2027', '2026-10-31', 1, 1, 1),
      ('ann_uang_pangkal', 'Uang Pangkal / Gedung', 'Pengembangan sarana prasarana sekolah & asrama', 2750000, 'ta_2026_2027', '2026-09-30', 1, 1, 1),
      ('ann_kebutuhan_pribadi', 'Kebutuhan Pribadi Santri', 'Perlengkapan sanitasi dan lemari kamar santri', 100000, 'ta_2026_2027', '2026-07-20', 1, 0, 1),
      ('ann_seragam', 'Seragam Lengkap', 'Seragam putih-biru, batik, gamis resmi pondok, & olahraga', 500000, 'ta_2026_2027', '2026-07-25', 1, 0, 1),
      ('ann_buku', 'Buku Paket & Modul', 'Buku dinas dan diktat muqorror syar''i', 750000, 'ta_2026_2027', '2026-08-15', 1, 0, 1),
      ('ann_infaq', 'Infaq Masjid & Wakaf', 'Infaq perluasan masjid dan pemeliharaan Quran', 100000, 'ta_2026_2027', '2026-08-31', 1, 0, 0);
  `);

  const packageItems = JSON.stringify([
    { type_id: 'ann_daftar_ulang', name: 'Daftar Ulang', amount: 2600000, is_mandatory: true },
    { type_id: 'ann_cicilan_daftar_ulang', name: 'Cicilan Daftar Ulang', amount: 2000000, is_mandatory: false },
    { type_id: 'ann_uang_pangkal', name: 'Uang Pangkal', amount: 2750000, is_mandatory: true },
    { type_id: 'ann_kebutuhan_pribadi', name: 'Kebutuhan Pribadi Santri', amount: 100000, is_mandatory: true },
    { type_id: 'ann_seragam', name: 'Seragam Lengkap', amount: 500000, is_mandatory: true },
    { type_id: 'ann_buku', name: 'Buku Paket & Modul', amount: 750000, is_mandatory: true },
    { type_id: 'ann_infaq', name: 'Infaq Masjid & Wakaf', amount: 100000, is_mandatory: false }
  ]);

  run(`
    INSERT OR IGNORE INTO annual_bill_packages (id, name, academic_year_id, total_amount, items, is_active)
    VALUES (
      'pkg_daftar_ulang_2026',
      'Paket Daftar Ulang Lengkap T.A. 2026/2027',
      'ta_2026_2027',
      8800000,
      ?,
      1
    );
  `, [packageItems]);

  // 7. Students (20 students across classes VII, VIII, IX, X)
  const studentsList = [
    { id: 'std_01', nis: '202607001', nisn: '0081234501', name: 'Muhammad Al-Fatih Pratama', gender: 'L', class_name: 'VII', level: 'SMP', spp: 'spp_boarding', eskul: ['eskul_futsal', 'eskul_panahan'], phone: '081211112201', father: 'Bambang Pratama', mother: 'Nur Azizah' },
    { id: 'std_02', nis: '202607002', nisn: '0081234502', name: 'Ahmad Raihan Syafiq', gender: 'L', class_name: 'VII', level: 'SMP', spp: 'spp_boarding', eskul: ['eskul_karate'], phone: '081211112202', father: 'Syafiq Munawar', mother: 'Fatimah' },
    { id: 'std_03', nis: '202607003', nisn: '0081234503', name: 'Zaid bin Tsabit Hidayat', gender: 'L', class_name: 'VII', level: 'SMP', spp: 'spp_tahfidz', eskul: ['eskul_arab'], phone: '081211112203', father: 'Rahmat Hidayat', mother: 'Aisyah' },
    { id: 'std_04', nis: '202607004', nisn: '0081234504', name: 'Abdullah Azzam Ramadhan', gender: 'L', class_name: 'VII', level: 'SMP', spp: 'spp_reguler', eskul: ['eskul_coding', 'eskul_renang'], phone: '081211112204', father: 'Ramadhan Yusuf', mother: 'Dewi Sartika' },
    { id: 'std_05', nis: '202607005', nisn: '0081234505', name: 'Hasan Al-Basri Kurniawan', gender: 'L', class_name: 'VII', level: 'SMP', spp: 'spp_boarding', eskul: ['eskul_futsal'], phone: '081211112205', father: 'Kurniawan Santoso', mother: 'Laila Zahra' },
    { id: 'std_06', nis: '202607006', nisn: '0081234506', name: 'Bilal Habasyi Maulana', gender: 'L', class_name: 'VII', level: 'SMP', spp: 'spp_fullday', eskul: ['eskul_panahan'], phone: '081211112206', father: 'Maulana Malik', mother: 'Khadijah' },
    { id: 'std_07', nis: '202607007', nisn: '0081234507', name: 'Umar bin Khattab Siregar', gender: 'L', class_name: 'VII', level: 'SMP', spp: 'spp_khusus', eskul: ['eskul_karate'], phone: '081211112207', father: 'Zulfikar Siregar', mother: 'Mariam' },
    { id: 'std_08', nis: '202607008', nisn: '0081234508', name: 'Thariq bin Ziyad Santoso', gender: 'L', class_name: 'VII', level: 'SMP', spp: 'spp_boarding', eskul: ['eskul_renang'], phone: '081211112208', father: 'Agus Santoso', mother: 'Sri Wahyuni' },
    { id: 'std_09', nis: '202607009', nisn: '0081234509', name: 'Ali bin Abi Thalib Nugroho', gender: 'L', class_name: 'VIII', level: 'SMP', spp: 'spp_boarding', eskul: ['eskul_coding'], phone: '081211112209', father: 'Joko Nugroho', mother: 'Endang Lestari' },
    { id: 'std_10', nis: '202607010', nisn: '0081234510', name: 'Khalid bin Walid Al-Ghifari', gender: 'L', class_name: 'VIII', level: 'SMP', spp: 'spp_tahfidz', eskul: ['eskul_panahan', 'eskul_futsal'], phone: '081211112210', father: 'Ghifari Akbar', mother: 'Salma Hanifa' },
    { id: 'std_11', nis: '202607011', nisn: '0081234511', name: 'Usamah bin Zaid Wibowo', gender: 'L', class_name: 'VIII', level: 'SMP', spp: 'spp_reguler', eskul: ['eskul_futsal'], phone: '081211112211', father: 'Tri Wibowo', mother: 'Anisa Rahma' },
    { id: 'std_12', nis: '202607012', nisn: '0081234512', name: 'Hamzah bin Abdul Muthalib', gender: 'L', class_name: 'VIII', level: 'SMP', spp: 'spp_boarding', eskul: ['eskul_karate'], phone: '081211112212', father: 'Abdul Muthalib', mother: 'Halimah' },
    { id: 'std_13', nis: '202607013', nisn: '0081234513', name: 'Saad bin Abi Waqqas Saputra', gender: 'L', class_name: 'VIII', level: 'SMP', spp: 'spp_fullday', eskul: ['eskul_panahan'], phone: '081211112213', father: 'Hendra Saputra', mother: 'Ratna Sari' },
    { id: 'std_14', nis: '202607014', nisn: '0081234514', name: 'Salman Al-Farisi Kusuma', gender: 'L', class_name: 'VIII', level: 'SMP', spp: 'spp_boarding', eskul: ['eskul_arab'], phone: '081211112214', father: 'Kusuma Wardana', mother: 'Hasanah' },
    { id: 'std_15', nis: '202607015', nisn: '0081234515', name: 'Abu Ubaidah bin Jarrah', gender: 'L', class_name: 'IX', level: 'SMP', spp: 'spp_tahfidz', eskul: ['eskul_renang'], phone: '081211112215', father: 'Jarrah Iskandar', mother: 'Amina' },
    { id: 'std_16', nis: '202607016', nisn: '0081234516', name: 'Muadz bin Jabal Fachri', gender: 'L', class_name: 'IX', level: 'SMP', spp: 'spp_boarding', eskul: ['eskul_coding'], phone: '081211112216', father: 'Fachri Ahmad', mother: 'Zulfa' },
    { id: 'std_17', nis: '202607017', nisn: '0081234517', name: 'Zubair bin Awwam Lubis', gender: 'L', class_name: 'IX', level: 'SMP', spp: 'spp_reguler', eskul: ['eskul_futsal'], phone: '081211112217', father: 'Farhan Lubis', mother: 'Nurul Huda' },
    { id: 'std_18', nis: '202607018', nisn: '0081234518', name: 'Talhah bin Ubaidillah', gender: 'L', class_name: 'X', level: 'SMA', spp: 'spp_boarding', eskul: ['eskul_panahan', 'eskul_coding'], phone: '081211112218', father: 'Ubaidillah Hasan', mother: 'Ruqayyah' },
    { id: 'std_19', nis: '202607019', nisn: '0081234519', name: 'Abdurrahman bin Auf Al-Banjari', gender: 'L', class_name: 'X', level: 'SMA', spp: 'spp_tahfidz', eskul: ['eskul_karate'], phone: '081211112219', father: 'Muhammad Arsyad', mother: 'Safiyyah' },
    { id: 'std_20', nis: '202607020', nisn: '0081234520', name: "Ja'far bin Abi Thalib", gender: 'L', class_name: 'X', level: 'SMA', spp: 'spp_boarding', eskul: ['eskul_renang'], phone: '081211112220', father: 'Thalib Mansur', mother: 'Asma' }
  ];

  for (const s of studentsList) {
    run(`
      INSERT OR IGNORE INTO students (
        id, nis, nisn, name, gender, birth_place, birth_date, level,
        class_name, academic_year_id, status, spp_type_id, parent_phone,
        father_name, father_phone, mother_name, mother_phone, address,
        join_date, eskul_ids, access_pin
      ) VALUES (
        ?, ?, ?, ?, ?, 'Bogor', '2012-05-14', ?,
        ?, 'ta_2026_2027', 'Aktif', ?, ?,
        ?, ?, ?, ?, 'Jl. Raya Pajajaran No. 12, Bogor',
        '2026-07-01', ?, '1234'
      );
    `, [
      s.id, s.nis, s.nisn, s.name, s.gender, s.level,
      s.class_name, s.spp, s.phone,
      s.father, s.phone, s.mother, s.phone,
      JSON.stringify(s.eskul)
    ]);
  }

  // 8. Generate Bills & Transactions for Demo
  // We will generate SPP for July, August, September 2026 and Annual bills for all students
  const sppTypesMap: Record<string, number> = {
    spp_boarding: 2000000,
    spp_reguler: 1300000,
    spp_tahfidz: 1800000,
    spp_fullday: 1500000,
    spp_khusus: 750000
  };

  const eskulAmountMap: Record<string, number> = {
    eskul_futsal: 150000,
    eskul_karate: 200000,
    eskul_renang: 300000,
    eskul_panahan: 250000,
    eskul_coding: 250000,
    eskul_arab: 150000,
    eskul_tahfidz_plus: 100000
  };

  const eskulNameMap: Record<string, string> = {
    eskul_futsal: 'Futsal Club',
    eskul_karate: 'Karate',
    eskul_renang: 'Renang',
    eskul_panahan: 'Panahan Sunnah',
    eskul_coding: 'Coding & Robotika',
    eskul_arab: 'Bahasa Arab',
    eskul_tahfidz_plus: 'Tahfidz Intensif'
  };

  const existingBills = query('SELECT COUNT(*) as count FROM bills');
  if (existingBills[0]?.count === 0) {
    let billCounter = 1;
    let trxCounter = 1;

    for (const s of studentsList) {
      const monthlySpp = sppTypesMap[s.spp] || 1300000;

      // A. SPP Juli 2026 (Due 2026-07-10)
      const billJuliId = `bill_${billCounter++}`;
      run(`
        INSERT OR IGNORE INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, 'ta_2026_2027', 'SPP', ?, 'SPP Juli 2026', 'Juli', 2026, ?, ?, ?, '2026-07-10', ?)
      `, [billJuliId, s.id, s.spp, monthlySpp, monthlySpp, 0, 'LUNAS']);

    // Record Transaction for SPP Juli for all students (Paid in July)
    const trxIdJuli = `trx_${trxCounter++}`;
    const trxNoJuli = `TRX/2026/07/${String(trxCounter).padStart(4, '0')}`;
    const receiptNoJuli = `KWT/2026/07/${String(trxCounter).padStart(4, '0')}`;
    run(`
      INSERT INTO transactions (id, transaction_no, receipt_no, date, time, student_id, payment_method, subtotal, discount, total_amount, cashier_id, cashier_name, notes, status)
      VALUES (?, ?, ?, '2026-07-08', '09:30', ?, 'Transfer BSI', ?, 0, ?, 'usr_bendahara', 'Ustadzah Siti Aminah, S.Ak', 'Pembayaran SPP Bulan Juli 2026', 'SUCCESS')
    `, [trxIdJuli, trxNoJuli, receiptNoJuli, s.id, monthlySpp, monthlySpp]);

    run(`
      INSERT INTO transaction_items (id, transaction_id, bill_id, bill_name, category, period_month, amount_allocated, remaining_after)
      VALUES (?, ?, ?, 'SPP Juli 2026', 'SPP', 'Juli', ?, 0)
    `, [`item_${trxCounter}`, trxIdJuli, billJuliId, monthlySpp]);

    // B. SPP Agustus 2026 (Due 2026-08-10)
    // First 12 students have paid full, next 4 paid partial, remaining 4 unpaid (Tunggakan)
    const billAguId = `bill_${billCounter++}`;
    const sIndex = parseInt(s.id.replace('std_', ''));
    if (sIndex <= 12) {
      run(`
        INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, 'ta_2026_2027', 'SPP', ?, 'SPP Agustus 2026', 'Agustus', 2026, ?, ?, 0, '2026-08-10', 'LUNAS')
      `, [billAguId, s.id, s.spp, monthlySpp, monthlySpp]);

      const trxIdAgu = `trx_${trxCounter++}`;
      const trxNoAgu = `TRX/2026/08/${String(trxCounter).padStart(4, '0')}`;
      const receiptNoAgu = `KWT/2026/08/${String(trxCounter).padStart(4, '0')}`;
      run(`
        INSERT INTO transactions (id, transaction_no, receipt_no, date, time, student_id, payment_method, subtotal, discount, total_amount, cashier_id, cashier_name, notes, status)
        VALUES (?, ?, ?, '2026-08-09', '10:15', ?, 'Transfer BCA', ?, 0, ?, 'usr_bendahara', 'Ustadzah Siti Aminah, S.Ak', 'Pembayaran SPP Bulan Agustus 2026', 'SUCCESS')
      `, [trxIdAgu, trxNoAgu, receiptNoAgu, s.id, monthlySpp, monthlySpp]);

      run(`
        INSERT INTO transaction_items (id, transaction_id, bill_id, bill_name, category, period_month, amount_allocated, remaining_after)
        VALUES (?, ?, ?, 'SPP Agustus 2026', 'SPP', 'Agustus', ?, 0)
      `, [`item_${trxCounter}`, trxIdAgu, billAguId, monthlySpp]);
    } else if (sIndex <= 16) {
      // Partial payment
      const paidHalf = Math.floor(monthlySpp / 2);
      const remainHalf = monthlySpp - paidHalf;
      run(`
        INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, 'ta_2026_2027', 'SPP', ?, 'SPP Agustus 2026', 'Agustus', 2026, ?, ?, ?, '2026-08-10', 'SEBAGIAN')
      `, [billAguId, s.id, s.spp, monthlySpp, paidHalf, remainHalf]);

      const trxIdHalf = `trx_${trxCounter++}`;
      const trxNoHalf = `TRX/2026/08/${String(trxCounter).padStart(4, '0')}`;
      const receiptNoHalf = `KWT/2026/08/${String(trxCounter).padStart(4, '0')}`;
      run(`
        INSERT INTO transactions (id, transaction_no, receipt_no, date, time, student_id, payment_method, subtotal, discount, total_amount, cashier_id, cashier_name, notes, status)
        VALUES (?, ?, ?, '2026-08-12', '14:20', ?, 'Tunai', ?, 0, ?, 'usr_tu', 'Ustadz Ridwan Pratama', 'Cicilan SPP Agustus 50%', 'SUCCESS')
      `, [trxIdHalf, trxNoHalf, receiptNoHalf, s.id, paidHalf, paidHalf]);

      run(`
        INSERT INTO transaction_items (id, transaction_id, bill_id, bill_name, category, period_month, amount_allocated, remaining_after)
        VALUES (?, ?, ?, 'SPP Agustus 2026', 'SPP', 'Agustus', ?, ?)
      `, [`item_${trxCounter}`, trxIdHalf, billAguId, paidHalf, remainHalf]);
    } else {
      // Unpaid (Tunggakan because past 2026-08-10)
      run(`
        INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, 'ta_2026_2027', 'SPP', ?, 'SPP Agustus 2026', 'Agustus', 2026, ?, 0, ?, '2026-08-10', 'TUNGGAKAN')
      `, [billAguId, s.id, s.spp, monthlySpp, monthlySpp]);
    }

    // C. SPP September 2026 (Due 2026-09-10)
    // First 6 paid, rest unpaid
    const billSepId = `bill_${billCounter++}`;
    if (sIndex <= 6) {
      run(`
        INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, 'ta_2026_2027', 'SPP', ?, 'SPP September 2026', 'September', 2026, ?, ?, 0, '2026-09-10', 'LUNAS')
      `, [billSepId, s.id, s.spp, monthlySpp, monthlySpp]);

      const trxIdSep = `trx_${trxCounter++}`;
      const trxNoSep = `TRX/2026/09/${String(trxCounter).padStart(4, '0')}`;
      const receiptNoSep = `KWT/2026/09/${String(trxCounter).padStart(4, '0')}`;
      run(`
        INSERT INTO transactions (id, transaction_no, receipt_no, date, time, student_id, payment_method, subtotal, discount, total_amount, cashier_id, cashier_name, notes, status)
        VALUES (?, ?, ?, '2026-09-05', '11:00', ?, 'QRIS', ?, 0, ?, 'usr_bendahara', 'Ustadzah Siti Aminah, S.Ak', 'Pembayaran SPP September 2026', 'SUCCESS')
      `, [trxIdSep, trxNoSep, receiptNoSep, s.id, monthlySpp, monthlySpp]);

      run(`
        INSERT INTO transaction_items (id, transaction_id, bill_id, bill_name, category, period_month, amount_allocated, remaining_after)
        VALUES (?, ?, ?, 'SPP September 2026', 'SPP', 'September', ?, 0)
      `, [`item_${trxCounter}`, trxIdSep, billSepId, monthlySpp]);
    } else {
      run(`
        INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, 'ta_2026_2027', 'SPP', ?, 'SPP September 2026', 'September', 2026, ?, 0, ?, '2026-09-10', 'TUNGGAKAN')
      `, [billSepId, s.id, s.spp, monthlySpp, monthlySpp]);
    }

    // Remaining 9 months of the academic year: Oktober 2026 s.d. Juni 2027
    const remainingAcademicMonths = [
      { name: 'Oktober', year: 2026, monthIdx: '10' },
      { name: 'November', year: 2026, monthIdx: '11' },
      { name: 'Desember', year: 2026, monthIdx: '12' },
      { name: 'Januari', year: 2027, monthIdx: '01' },
      { name: 'Februari', year: 2027, monthIdx: '02' },
      { name: 'Maret', year: 2027, monthIdx: '03' },
      { name: 'April', year: 2027, monthIdx: '04' },
      { name: 'Mei', year: 2027, monthIdx: '05' },
      { name: 'Juni', year: 2027, monthIdx: '06' }
    ];

    for (const rem of remainingAcademicMonths) {
      const remBillId = `bill_${billCounter++}`;
      const dueDate = `${rem.year}-${rem.monthIdx}-10`;
      run(`
        INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, 'ta_2026_2027', 'SPP', ?, ?, ?, ?, ?, 0, ?, ?, 'BELUM_BAYAR')
      `, [remBillId, s.id, s.spp, `SPP ${rem.name} ${rem.year}`, rem.name, rem.year, monthlySpp, monthlySpp, dueDate]);
    }

    // D. Eskul Bills for enrolled eskul
    for (const eskulId of s.eskul) {
      const eCost = eskulAmountMap[eskulId] || 150000;
      const eName = eskulNameMap[eskulId] || 'Eskul';

      // Eskul Juli (Paid)
      const eBillJuli = `bill_${billCounter++}`;
      run(`
        INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, 'ta_2026_2027', 'ESKUL', ?, ?, 'Juli', 2026, ?, ?, 0, '2026-07-10', 'LUNAS')
      `, [eBillJuli, s.id, eskulId, `Eskul ${eName} (Juli 2026)`, eCost, eCost]);

      // Eskul Agustus
      const eBillAgu = `bill_${billCounter++}`;
      const isEskulPaid = sIndex <= 10;
      run(`
        INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, 'ta_2026_2027', 'ESKUL', ?, ?, 'Agustus', 2026, ?, ?, ?, '2026-08-10', ?)
      `, [eBillAgu, s.id, eskulId, `Eskul ${eName} (Agustus 2026)`, eCost, isEskulPaid ? eCost : 0, isEskulPaid ? 0 : eCost, isEskulPaid ? 'LUNAS' : 'TUNGGAKAN']);
    }

    // E. Annual Bill: Daftar Ulang (Rp 2.600.000) & Uang Pangkal (Rp 2.750.000)
    const billDuId = `bill_${billCounter++}`;
    const isDuPaid = sIndex <= 14;
    run(`
      INSERT INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
      VALUES (?, ?, 'ta_2026_2027', 'DAFTAR_ULANG', 'ann_daftar_ulang', 'Daftar Ulang T.A. 2026/2027', NULL, 2026, 2600000, ?, ?, '2026-08-31', ?)
    `, [billDuId, s.id, isDuPaid ? 2600000 : (sIndex <= 17 ? 1300000 : 0), isDuPaid ? 0 : (sIndex <= 17 ? 1300000 : 2600000), isDuPaid ? 'LUNAS' : (sIndex <= 17 ? 'SEBAGIAN' : 'TUNGGAKAN')]);

    const billUpId = `bill_${billCounter++}`;
    const isUpPaid = sIndex <= 11;
    run(`
        INSERT OR IGNORE INTO bills (id, student_id, academic_year_id, category, category_id, bill_name, period_month, period_year, amount, paid_amount, remaining_amount, due_date, status)
        VALUES (?, ?, 'ta_2026_2027', 'TAHUNAN', 'ann_uang_pangkal', 'Uang Pangkal / Sarpras 2026/2027', NULL, 2026, 2750000, ?, ?, '2026-09-30', ?)
      `, [billUpId, s.id, isUpPaid ? 2750000 : 0, isUpPaid ? 0 : 2750000, isUpPaid ? 'LUNAS' : 'BELUM_BAYAR']);
    }
  }

  // 9. Payment Confirmations (Parent submissions)
  run(`
    INSERT OR IGNORE INTO payment_confirmations (
      id, student_id, date, sender_name, bank_name, amount, payment_method,
      proof_url, notes, target_bill_ids, status, reviewed_by, reviewed_at
    ) VALUES 
      (
        'conf_01', 'std_17', '2026-09-12', 'Farhan Lubis', 'Bank Syariah Indonesia (BSI)',
        1300000, 'Transfer Bank',
        'data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"200\" viewBox=\"0 0 400 200\"><rect width=\"100%\" height=\"100%\" fill=\"%23047857\"/><text x=\"50%\" y=\"50%\" fill=\"white\" font-size=\"18\" text-anchor=\"middle\" dominant-baseline=\"middle\">BUKTI TRANSFER BSI - RP 1.300.000</text></svg>',
        'Mohon diverifikasi pembayaran SPP September 2026 Zubair bin Awwam',
        '[\"bill_sep_std_17\"]',
        'Menunggu', NULL, NULL
      ),
      (
        'conf_02', 'std_19', '2026-09-11', 'Muhammad Arsyad', 'BCA',
        1800000, 'Transfer Bank',
        'data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"200\" viewBox=\"0 0 400 200\"><rect width=\"100%\" height=\"100%\" fill=\"%231e40af\"/><text x=\"50%\" y=\"50%\" fill=\"white\" font-size=\"18\" text-anchor=\"middle\" dominant-baseline=\"middle\">BUKTI TRANSFER BCA - RP 1.800.000</text></svg>',
        'Pelunasan SPP September Abdurrahman bin Auf',
        '[\"bill_sep_std_19\"]',
        'Menunggu', NULL, NULL
      ),
      (
        'conf_03', 'std_01', '2026-09-08', 'Bambang Pratama', 'BCA',
        2000000, 'Transfer Bank',
        'data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"200\" viewBox=\"0 0 400 200\"><rect width=\"100%\" height=\"100%\" fill=\"%230284c7\"/><text x=\"50%\" y=\"50%\" fill=\"white\" font-size=\"18\" text-anchor=\"middle\" dominant-baseline=\"middle\">BUKTI TRANSFER BCA - RP 2.000.000</text></svg>',
        'Pembayaran SPP September Al-Fatih',
        '[\"bill_sep_std_01\"]',
        'Disetujui', 'usr_bendahara', '2026-09-08 14:00'
      );
  `);

  // 10. WhatsApp Templates
  run(`
    INSERT OR IGNORE INTO whatsapp_templates (id, name, trigger_type, content, is_active)
    VALUES
      (
        'tpl_reminder_default',
        'Pengingat Tagihan SPP & Tunggakan Resmi',
        'reminder_overdue',
        'Assalamu''alaikum warahmatullahi wabarakatuh.

Yth. Orang Tua / Wali dari ananda *{nama}* (Kelas {kelas})
di Tempat.

Kami dari Bagian Administrasi Keuangan *{sekolah}* menyampaikan informasi kewajiban pembayaran yang saat ini tercatat di sistem:

{rincian}

*Total Tagihan / Tunggakan: {total}*

Pembayaran dapat dilakukan melalui transfer ke rekening resmi:
- BSI: *7123-456-789* a.n. IMBS Keuangan
- BCA: *800-123-4567* a.n. Yayasan Imam Muzani

Konfirmasi pembayaran atau cek tagihan mandiri dapat diakses di:
{link_tagihan}

Jazakumullahu khairan katsiran atas perhatian dan kerja sama Bapak/Ibu.

Wassalamu''alaikum warahmatullahi wabarakatuh.
*{sekolah}*',
        1
      ),
      (
        'tpl_receipt_notification',
        'Notifikasi Pembayaran Berhasil & Kwitansi',
        'receipt_notification',
        'Assalamu''alaikum warahmatullahi wabarakatuh.

Alhamdulillah, pembayaran untuk santri *{nama}* ({kelas}) telah berhasil diterima dan dicatat di sistem:

No. Transaksi: *{nomor_transaksi}*
Tanggal: {tanggal}
{rincian}
*Total Diterima: {total}*

Terima kasih atas pembayaran tepat waktu. Kwitansi digital resmi dapat diunduh di:
{link_tagihan}

Wassalamu''alaikum warahmatullahi wabarakatuh.',
        1
      );
  `);

  // 11. Sample WhatsApp Logs
  run(`
    INSERT OR IGNORE INTO whatsapp_logs (id, student_id, recipient_phone, recipient_name, message, status, channel, sent_at)
    VALUES
      (
        'walog_01', 'std_17', '081211112217', 'Farhan Lubis',
        'Pengingat tagihan SPP Agustus & September 2026 ananda Zubair bin Awwam sebesar Rp 2.600.000',
        'Terkirim', 'Direct wa.me', '2026-09-10 09:15'
      ),
      (
        'walog_02', 'std_18', '081211112218', 'Ubaidillah Hasan',
        'Pengingat tagihan SPP September ananda Talhah bin Ubaidillah sebesar Rp 2.000.000',
        'Terkirim', 'Direct wa.me', '2026-09-10 09:16'
      );
  `);

  // 12. Sample Audit Logs
  run(`
    INSERT OR IGNORE INTO audit_logs (id, user_id, user_name, activity, details, ip_address, timestamp)
    VALUES
      ('audit_01', 'usr_super_admin', 'Fakhrur Rodhi (Super Admin)', 'Inisialisasi Sistem', 'Sistem SPP Imam Muzani Boarding School diinisialisasi untuk T.A. 2026/2027', '127.0.0.1', '2026-07-01 08:00:00'),
      ('audit_02', 'usr_bendahara', 'Ustadzah Siti Aminah, S.Ak', 'Generate Tagihan Otomatis', 'Menjalankan auto bill generator SPP, Eskul & Daftar Ulang', '192.168.1.15', '2026-07-01 08:30:00'),
      ('audit_03', 'usr_bendahara', 'Ustadzah Siti Aminah, S.Ak', 'Input Pembayaran', 'Penerimaan pembayaran SPP Juli santri kelas 7 & 8', '192.168.1.15', '2026-07-08 09:30:00');
  `);

  await persistDb();
  console.log('Seeding Data Berhasil Selesai!');
}
