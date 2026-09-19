# BLUEPRINT ARSITEKTUR SUPABASE DATABASE & STORAGE
## APLIKASI KEUANGAN & SPP IMAM MUZANI BOARDING SCHOOL

Dokumen ini memuat blueprint arsitektur lengkap, skema relasional tabel, struktur kolom SQL, sistem reservasi pembayaran, serta konfigurasi bucket Storage Supabase yang telah terintegrasi ke dalam aplikasi.

---

## 1. INFORMASI BUCKET STORAGE SUPABASE

| Properti | Nilai Konfigurasi | Keterangan |
| :--- | :--- | :--- |
| **Nama Bucket** | `ImamMuzaniPay` | Sesuai nama bucket yang telah dibuat pengguna |
| **Visibilitas** | `Public` | File gambar (bukti bayar, logo, tanda tangan, stempel) dapat diakses secara publik via URL |
| **Maksimal Ukuran** | `10 MB` per file | Proteksi ukuran file upload |
| **Tipe File Diizinkan** | `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `application/pdf` | Format bukti bayar & dokumen administrasi |

### Struktur Folder di Dalam Bucket `ImamMuzaniPay`
- `proofs/` : Bukti transfer pembayaran dari wali santri (pada sistem reservasi / konfirmasi bayar)
- `logos/` : Logo sekolah & logo aplikasi
- `stamps/` : Stempel basah digital sekolah
- `signatures/` : Tanda tangan digital bendahara / kepala sekolah
- `students/` : Foto identitas santri (avatar)

---

## 2. DAFTAR TABEL YANG DIBUAT (15 TABEL)

1. `users` : Manajemen akun admin, bendahara, staff, dan viewer
2. `school_settings` : Profil madrasah, kepala sekolah, stempel, logo, dan nomor rekening
3. `academic_years` : Master tahun ajaran / tahun pelajaran
4. `spp_types` : Tarif kategori SPP bulanan
5. `eskul_types` : Jenis dan biaya ekstrakurikuler
6. `annual_bill_types` : Komponen tagihan tahunan / daftar ulang santri
7. `annual_bill_packages` : Paket bundel tagihan tahunan
8. `students` : Biodata master santri, kelas, status, wali, dan saldo tunggakan
9. `bills` : Master tagihan terpusat (SPP, Eskul, Tahunan, Daftar Ulang, Lainnya)
10. `transactions` : Catatan transaksi penerimaan kas dan pembayaran SPP
11. `transaction_items` : Detail pos tagihan yang dialokasikan dalam transaksi
12. `payment_confirmations` : **Sistem Reservasi & Konfirmasi Transfer Pembayaran Santri**
13. `whatsapp_templates` : Template pesan notifikasi WhatsApp
14. `whatsapp_logs` : Rekam jejak pengiriman pesan WhatsApp
15. `audit_logs` : Rekam jejak aktivitas penting & audit keamanan petugas

---

## 3. STRUKTUR KOLOM LENGKAP TIAP TABEL (POSTGRESQL SPECIFICATION)

### A. Tabel `users`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY, Default ID acak bertingkat |
| `name` | `TEXT` | NOT NULL (Nama lengkap petugas/admin) |
| `username` | `TEXT` | UNIQUE, NOT NULL |
| `email` | `TEXT` | UNIQUE, NOT NULL |
| `password_hash` | `TEXT` | NOT NULL |
| `role` | `TEXT` | NOT NULL, CHECK in ('super_admin', 'admin', 'bendahara', 'staff', 'viewer') |
| `status` | `TEXT` | NOT NULL DEFAULT 'active' CHECK in ('active', 'inactive') |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### B. Tabel `school_settings`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY DEFAULT 'school_main' |
| `name` | `TEXT` | NOT NULL (Nama resmi sekolah) |
| `address` | `TEXT` | NOT NULL (Alamat lengkap madrasah) |
| `city` | `TEXT` | NOT NULL (Kota / Kabupaten) |
| `email` | `TEXT` | NOT NULL (Email resmi) |
| `phone` | `TEXT` | NOT NULL (Telepon kantor) |
| `whatsapp` | `TEXT` | NOT NULL (Nomor WA resmi) |
| `active_academic_year_id` | `TEXT` | ID tahun ajaran aktif |
| `treasurer_name` | `TEXT` | NOT NULL (Nama bendahara di kwitansi) |
| `treasurer_nip` | `TEXT` | NOT NULL (NIP/NIY bendahara) |
| `logo_url` | `TEXT` | URL Logo Sekolah di bucket `ImamMuzaniPay` |
| `app_logo_url` | `TEXT` | URL Logo Aplikasi di bucket `ImamMuzaniPay` |
| `stamp_url` | `TEXT` | URL Stempel di bucket `ImamMuzaniPay` |
| `signature_url` | `TEXT` | URL Tanda Tangan di bucket `ImamMuzaniPay` |
| `trx_prefix` | `TEXT` | NOT NULL DEFAULT 'TRX' |
| `receipt_prefix` | `TEXT` | NOT NULL DEFAULT 'KWT' |
| `next_trx_seq` | `INTEGER` | NOT NULL DEFAULT 1 |
| `next_receipt_seq` | `INTEGER` | NOT NULL DEFAULT 1 |
| `wa_provider` | `TEXT` | NOT NULL DEFAULT 'direct_link' |
| `wa_sender_number` | `TEXT` | Nomor pengirim WA |
| `wa_sender_name` | `TEXT` | Nama pengirim WA |
| `wa_footer` | `TEXT` | Catatan kaki pesan WA |
| `yayasan_name` | `TEXT` | Nama yayasan penyelenggara |
| `headmaster_title` | `TEXT` | Jabatan pimpinan ('Kepala Sekolah / Mudir Pesantren') |
| `headmaster_name` | `TEXT` | Nama pimpinan pesantren |
| `headmaster_nip` | `TEXT` | NIY/NIP pimpinan |
| `bank_accounts` | `JSONB` | Array daftar rekening bank tujuan transfer santri |
| `available_classes` | `JSONB` | Array daftar kelas yang tersedia |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### C. Tabel `academic_years`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `name` | `TEXT` | UNIQUE NOT NULL (Contoh: '2026/2027') |
| `semester` | `TEXT` | NOT NULL DEFAULT 'Ganjil' |
| `start_date` | `DATE` | NOT NULL (Tanggal mulai) |
| `end_date` | `DATE` | NOT NULL (Tanggal selesai) |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### D. Tabel `spp_types`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `name` | `TEXT` | UNIQUE NOT NULL (Nama kategori SPP) |
| `description` | `TEXT` | Keterangan rincian fasilitas |
| `monthly_amount` | `NUMERIC(12, 2)` | NOT NULL (Nominal tagihan bulanan) |
| `period_type` | `TEXT` | NOT NULL DEFAULT 'monthly' |
| `active_months` | `JSONB` | NOT NULL DEFAULT array 12 bulan |
| `is_mandatory` | `BOOLEAN` | NOT NULL DEFAULT TRUE |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### E. Tabel `eskul_types`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `name` | `TEXT` | UNIQUE NOT NULL (Nama ekstrakurikuler) |
| `description` | `TEXT` | Keterangan kegiatan |
| `amount` | `NUMERIC(12, 2)` | NOT NULL (Biaya kegiatan) |
| `billing_period` | `TEXT` | NOT NULL DEFAULT 'monthly' |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### F. Tabel `annual_bill_types`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `name` | `TEXT` | NOT NULL (Nama pos daftar ulang / tahunan) |
| `description` | `TEXT` | Rincian peruntukan biaya |
| `amount` | `NUMERIC(12, 2)` | NOT NULL (Total nominal) |
| `academic_year_id` | `TEXT` | NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE |
| `due_date` | `DATE` | NOT NULL (Jatuh tempo) |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE |
| `allow_installment` | `BOOLEAN` | NOT NULL DEFAULT TRUE (Boleh cicil) |
| `is_mandatory` | `BOOLEAN` | NOT NULL DEFAULT TRUE |
| `target_classes` | `TEXT` | NOT NULL DEFAULT 'ALL' (Sasaran kelas) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### G. Tabel `annual_bill_packages`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `name` | `TEXT` | NOT NULL (Nama paket) |
| `academic_year_id` | `TEXT` | NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE |
| `total_amount` | `NUMERIC(12, 2)` | NOT NULL |
| `items` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### H. Tabel `students`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `nis` | `TEXT` | UNIQUE NOT NULL (Nomor Induk Santri) |
| `nisn` | `TEXT` | Nomor Induk Siswa Nasional |
| `name` | `TEXT` | NOT NULL (Nama santri) |
| `gender` | `TEXT` | NOT NULL DEFAULT 'L' CHECK (gender IN ('L', 'P')) |
| `birth_place` | `TEXT` | Tempat lahir |
| `birth_date` | `DATE` | Tanggal lahir |
| `level` | `TEXT` | NOT NULL DEFAULT 'SMP' |
| `class_name` | `TEXT` | NOT NULL (Kelas aktif, misal 'VII', 'VIII') |
| `academic_year_id` | `TEXT` | REFERENCES academic_years(id) |
| `status` | `TEXT` | NOT NULL DEFAULT 'Aktif' CHECK in ('Aktif', 'Nonaktif', 'Mutasi', 'Lulus') |
| `spp_type_id` | `TEXT` | REFERENCES spp_types(id) |
| `parent_phone` | `TEXT` | NOT NULL (No WhatsApp wali santri) |
| `father_name` | `TEXT` | Nama ayah kandung |
| `father_phone` | `TEXT` | No HP/WA ayah |
| `mother_name` | `TEXT` | Nama ibu kandung |
| `mother_phone` | `TEXT` | No HP/WA ibu |
| `address` | `TEXT` | Alamat domisili |
| `join_date` | `DATE` | NOT NULL DEFAULT CURRENT_DATE |
| `eskul_ids` | `JSONB` | Array ID eskul yang diikuti |
| `access_pin` | `TEXT` | DEFAULT '1234' (PIN login portal santri) |
| `previous_arrears` | `NUMERIC(12, 2)` | DEFAULT 0 (Tunggakan tahun lalu) |
| `previous_arrears_note` | `TEXT` | Catatan tunggakan tahun lalu |
| `additional_arrears` | `JSONB` | Array rincian tunggakan tambahan |
| `avatar_url` | `TEXT` | URL Foto Santri di bucket `ImamMuzaniPay` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### I. Tabel `bills` (Core Unified Billing Engine)
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `student_id` | `TEXT` | NOT NULL REFERENCES students(id) ON DELETE CASCADE |
| `academic_year_id` | `TEXT` | NOT NULL REFERENCES academic_years(id) |
| `category` | `TEXT` | NOT NULL CHECK in ('SPP', 'ESKUL', 'DAFTAR_ULANG', 'TAHUNAN', 'LAINNYA') |
| `category_id` | `TEXT` | Relasi ke tipe biaya terkait |
| `bill_name` | `TEXT` | NOT NULL (Contoh: 'SPP Bulan Agustus 2026') |
| `period_month` | `TEXT` | Bulan tagihan (misal 'Agustus') |
| `period_year` | `INTEGER` | Tahun periode |
| `amount` | `NUMERIC(12, 2)` | NOT NULL (Nominal kewajiban) |
| `paid_amount` | `NUMERIC(12, 2)` | NOT NULL DEFAULT 0 (Jumlah sudah dibayar) |
| `remaining_amount` | `NUMERIC(12, 2)` | NOT NULL (Sisa tagihan yang harus dilunasi) |
| `due_date` | `DATE` | NOT NULL (Batas waktu bayar) |
| `status` | `TEXT` | NOT NULL DEFAULT 'BELUM_BAYAR' CHECK in ('BELUM_BAYAR', 'SEBAGIAN', 'LUNAS', 'TUNGGAKAN') |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### J. Tabel `transactions`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `transaction_no` | `TEXT` | UNIQUE NOT NULL (No unik transaksi, misal 'TRX-2026-0001') |
| `receipt_no` | `TEXT` | UNIQUE NOT NULL (No kwitansi cetak, misal 'KWT-2026-0001') |
| `date` | `DATE` | NOT NULL DEFAULT CURRENT_DATE |
| `time` | `TIME` | NOT NULL DEFAULT CURRENT_TIME |
| `student_id` | `TEXT` | NOT NULL REFERENCES students(id) |
| `payment_method` | `TEXT` | NOT NULL ('Tunai', 'Transfer Bank', 'Qris', dll) |
| `subtotal` | `NUMERIC(12, 2)` | NOT NULL |
| `discount` | `NUMERIC(12, 2)` | NOT NULL DEFAULT 0 |
| `total_amount` | `NUMERIC(12, 2)` | NOT NULL |
| `cash_received` | `NUMERIC(12, 2)` | Uang tunai diterima |
| `change_returned` | `NUMERIC(12, 2)` | Uang kembalian |
| `cashier_id` | `TEXT` | NOT NULL |
| `cashier_name` | `TEXT` | NOT NULL (Nama kasir pencatat) |
| `notes` | `TEXT` | Catatan pembayaran |
| `status` | `TEXT` | NOT NULL DEFAULT 'SUCCESS' CHECK in ('SUCCESS', 'CANCELLED') |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### K. Tabel `transaction_items`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `transaction_id` | `TEXT` | NOT NULL REFERENCES transactions(id) ON DELETE CASCADE |
| `bill_id` | `TEXT` | NOT NULL REFERENCES bills(id) |
| `bill_name` | `TEXT` | NOT NULL (Nama item tagihan yang dilunasi) |
| `category` | `TEXT` | NOT NULL |
| `period_month` | `TEXT` | Bulan periode terkait |
| `amount_allocated` | `NUMERIC(12, 2)` | NOT NULL (Jumlah dana dialokasikan) |
| `remaining_after` | `NUMERIC(12, 2)` | NOT NULL (Sisa tagihan setelah pembayaran ini) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### L. Tabel `payment_confirmations` (Sistem Reservasi & Konfirmasi Transfer Online)
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `reservation_code` | `TEXT` | UNIQUE NOT NULL (Kode Booking/Reservasi, misal 'RSV-202609-AB12') |
| `student_id` | `TEXT` | NOT NULL REFERENCES students(id) ON DELETE CASCADE |
| `date` | `DATE` | NOT NULL DEFAULT CURRENT_DATE |
| `sender_name` | `TEXT` | NOT NULL (Nama pengirim transfer) |
| `bank_name` | `TEXT` | NOT NULL (Bank tujuan, misal 'BSI', 'BCA', 'Muamalat') |
| `amount` | `NUMERIC(12, 2)` | NOT NULL (Nominal transfer yang diajukan) |
| `payment_method` | `TEXT` | NOT NULL DEFAULT 'Transfer Bank' |
| `proof_url` | `TEXT` | NOT NULL (**URL Gambar Bukti Transfer di Bucket `ImamMuzaniPay`**) |
| `notes` | `TEXT` | Berita / catatan transfer dari orang tua |
| `target_bill_ids` | `JSONB` | NOT NULL DEFAULT '[]'::jsonb (Daftar ID tagihan yang dipesan/dibayarkan) |
| `status` | `TEXT` | NOT NULL DEFAULT 'Menunggu' CHECK in ('Menunggu', 'Disetujui', 'Ditolak') |
| `reviewed_by` | `TEXT` | Nama bendahara/petugas pemeriksa |
| `reviewed_at` | `TIMESTAMPTZ` | Waktu verifikasi |
| `rejection_reason` | `TEXT` | Alasan jika bukti ditolak |
| `transaction_id` | `TEXT` | REFERENCES transactions(id) jika disetujui & dicetak kas |
| `created_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### M. Tabel `whatsapp_templates`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `name` | `TEXT` | NOT NULL |
| `trigger_type` | `TEXT` | NOT NULL ('payment_receipt', 'arrears_reminder', dll) |
| `content` | `TEXT` | NOT NULL (Teks template dengan placeholder {{nama}}, {{nominal}}, dll) |
| `is_active` | `BOOLEAN` | NOT NULL DEFAULT TRUE |

---

### N. Tabel `whatsapp_logs`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `student_id` | `TEXT` | NOT NULL REFERENCES students(id) ON DELETE CASCADE |
| `recipient_phone` | `TEXT` | NOT NULL (Nomor tujuan WhatsApp) |
| `recipient_name` | `TEXT` | NOT NULL |
| `message` | `TEXT` | NOT NULL |
| `status` | `TEXT` | NOT NULL DEFAULT 'Terkirim' |
| `channel` | `TEXT` | NOT NULL DEFAULT 'Direct wa.me' |
| `error_message` | `TEXT` | Catatan kegagalan jika ada |
| `sent_at` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |

---

### O. Tabel `audit_logs`
| Nama Kolom | Tipe SQL | Constraint / Keterangan |
| :--- | :--- | :--- |
| `id` | `TEXT` | PRIMARY KEY |
| `user_id` | `TEXT` | NOT NULL (ID operator) |
| `user_name` | `TEXT` | NOT NULL (Nama operator) |
| `activity` | `TEXT` | NOT NULL (Aktivitas, misal 'UPDATE_SETTING', 'VOID_TRX') |
| `details` | `TEXT` | NOT NULL (Deskripsi detail perubahan) |
| `ip_address` | `TEXT` | Alamat IP client |
| `timestamp` | `TIMESTAMPTZ` | NOT NULL DEFAULT NOW() |
