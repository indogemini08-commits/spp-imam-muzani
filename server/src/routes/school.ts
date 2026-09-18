import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { SchoolSettings } from '../../src/types';

const router = Router();

// Get settings
router.get('/', (req, res) => {
  try {
    let settings = get<any>('SELECT * FROM school_settings WHERE id = "school_main"');
    if (!settings) {
      settings = {
        id: 'school_main',
        name: 'IMAM MUZANI BOARDING SCHOOL',
        address: 'Jl. Pendidikan Islam No. 45, Kompleks Islamic Center',
        city: 'Bogor, Jawa Barat',
        email: 'keuangan@imbs.sch.id',
        phone: '(0251) 8345678',
        whatsapp: '081298765432',
        active_academic_year_id: 'ta_2026_2027',
        treasurer_name: 'Ustadz Fakhrur Rodhi Al-Hanafi, S.E.',
        treasurer_nip: '198805122014021003',
        logo_url: '',
        app_logo_url: '',
        stamp_url: '',
        signature_url: '',
        trx_prefix: 'TRX',
        receipt_prefix: 'KWT',
        next_trx_seq: 1,
        next_receipt_seq: 1,
        wa_provider: 'direct_link',
        wa_sender_number: '081298765432',
        wa_sender_name: 'Bendahara IMBS',
        wa_footer: 'Pesan otomatis sistem administrasi keuangan Imam Muzani Boarding School',
        yayasan_name: 'YAYASAN PENDIDIKAN ISLAM IMAM MUZANI',
        headmaster_title: 'Kepala Sekolah / Mudir Pesantren',
        headmaster_name: "KH. Abdullah Syafi'i, Lc., M.Pd.I.",
        headmaster_nip: 'NIY: 197804152005011002',
        bank_accounts: [
          { id: 'bank_1', bank_name: 'Bank Syariah Indonesia (BSI)', bank_code: '451', account_number: '7123-456-789', account_name: 'IMBS Keuangan SPP', is_active: true },
          { id: 'bank_2', bank_name: 'Bank Central Asia (BCA)', bank_code: '014', account_number: '800-123-4567', account_name: 'Yayasan Imam Muzani Boarding School', is_active: true },
          { id: 'bank_3', bank_name: 'Bank Muamalat', bank_code: '147', account_number: '102-000-8899', account_name: 'SPP Imam Muzani', is_active: true }
        ],
        available_classes: ['7A', '7B', '8A', '8B', '9A', '10 IPA']
      };
    } else {
      let accounts = null;
      if (settings.bank_accounts !== undefined && settings.bank_accounts !== null && settings.bank_accounts !== '') {
        try {
          accounts = typeof settings.bank_accounts === 'string' ? JSON.parse(settings.bank_accounts) : settings.bank_accounts;
        } catch {
          accounts = null;
        }
      }
      if (!Array.isArray(accounts)) {
        accounts = [
          { id: 'bank_1', bank_name: 'Bank Syariah Indonesia (BSI)', bank_code: '451', account_number: '7123-456-789', account_name: 'IMBS Keuangan SPP', is_active: true },
          { id: 'bank_2', bank_name: 'Bank Central Asia (BCA)', bank_code: '014', account_number: '800-123-4567', account_name: 'Yayasan Imam Muzani Boarding School', is_active: true },
          { id: 'bank_3', bank_name: 'Bank Muamalat', bank_code: '147', account_number: '102-000-8899', account_name: 'SPP Imam Muzani', is_active: true }
        ];
      }

      let classes = null;
      if (settings.available_classes !== undefined && settings.available_classes !== null && settings.available_classes !== '') {
        try {
          classes = typeof settings.available_classes === 'string' ? JSON.parse(settings.available_classes) : settings.available_classes;
        } catch {
          classes = null;
        }
      }
      if (!Array.isArray(classes) || classes.length === 0) {
        classes = ['7A', '7B', '8A', '8B', '9A', '10 IPA'];
      }

      settings = {
        ...settings,
        yayasan_name: settings.yayasan_name || 'YAYASAN PENDIDIKAN ISLAM IMAM MUZANI',
        headmaster_title: settings.headmaster_title || 'Kepala Sekolah / Mudir Pesantren',
        headmaster_name: settings.headmaster_name || "KH. Abdullah Syafi'i, Lc., M.Pd.I.",
        headmaster_nip: settings.headmaster_nip || 'NIY: 197804152005011002',
        bank_accounts: accounts,
        available_classes: classes
      };
    }

    // Always ensure next sequence numbers are in sync with existing transactions
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
    const safeNextTrx = Math.max(Number(settings.next_trx_seq) || 1, maxTrx + 1);
    const safeNextReceipt = Math.max(Number(settings.next_receipt_seq) || 1, maxReceipt + 1);
    if (safeNextTrx !== settings.next_trx_seq || safeNextReceipt !== settings.next_receipt_seq) {
      settings.next_trx_seq = safeNextTrx;
      settings.next_receipt_seq = safeNextReceipt;
      run('UPDATE school_settings SET next_trx_seq = ?, next_receipt_seq = ? WHERE id = "school_main"', [safeNextTrx, safeNextReceipt]);
    }

    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    const s = req.body;
    const current = get<any>('SELECT * FROM school_settings WHERE id = "school_main"');
    
    // Ensure bank_accounts is not accidentally overwritten with empty if omitted
    let bankAccountsJson = current?.bank_accounts || '[]';
    if (s.bank_accounts !== undefined) {
      bankAccountsJson = JSON.stringify(Array.isArray(s.bank_accounts) ? s.bank_accounts : []);
    }

    // Ensure available_classes is preserved
    let availableClassesJson = current?.available_classes || JSON.stringify(['VII', 'VIII', 'IX', 'X', 'XI', 'XII']);
    if (s.available_classes !== undefined) {
      availableClassesJson = JSON.stringify(Array.isArray(s.available_classes) && s.available_classes.length > 0 ? s.available_classes : ['VII', 'VIII', 'IX', 'X', 'XI', 'XII']);
    }

    // Calculate safe next sequence numbers that never regress below existing transactions or current settings
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

    const safeNextTrx = Math.max(Number(current?.next_trx_seq) || 1, Number(s.next_trx_seq) || 1, maxTrx + 1);
    const safeNextReceipt = Math.max(Number(current?.next_receipt_seq) || 1, Number(s.next_receipt_seq) || 1, maxReceipt + 1);

    run(`
      INSERT OR REPLACE INTO school_settings (
        id, name, address, city, email, phone, whatsapp,
        active_academic_year_id, treasurer_name, treasurer_nip,
        logo_url, app_logo_url, stamp_url, signature_url,
        trx_prefix, receipt_prefix, next_trx_seq, next_receipt_seq,
        wa_provider, wa_sender_number, wa_sender_name, wa_footer,
        yayasan_name, headmaster_title, headmaster_name, headmaster_nip, bank_accounts, available_classes
      ) VALUES (
        'school_main', ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `, [
      s.name || 'IMAM MUZANI BOARDING SCHOOL',
      s.address || '',
      s.city || '',
      s.email || '',
      s.phone || '',
      s.whatsapp || '',
      s.active_academic_year_id || 'ta_2026_2027',
      s.treasurer_name || '',
      s.treasurer_nip || '',
      s.logo_url || '',
      s.app_logo_url || '',
      s.stamp_url || '',
      s.signature_url || '',
      s.trx_prefix || 'TRX',
      s.receipt_prefix || 'KWT',
      safeNextTrx,
      safeNextReceipt,
      s.wa_provider || 'direct_link',
      s.wa_sender_number || '',
      s.wa_sender_name || '',
      s.wa_footer || '',
      s.yayasan_name || 'YAYASAN PENDIDIKAN ISLAM IMAM MUZANI',
      s.headmaster_title || 'Kepala Sekolah / Mudir Pesantren',
      s.headmaster_name || "KH. Abdullah Syafi'i, Lc., M.Pd.I.",
      s.headmaster_nip || 'NIY: 197804152005011002',
      bankAccountsJson,
      availableClassesJson
    ]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Update Data Sekolah", "Memperbarui identitas dan pengaturan sekolah", datetime("now", "localtime"))',
      [`audit_${Date.now()}`]
    );

    await persistDb();
    return res.json({ message: 'Pengaturan sekolah berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Rename class and sync all affected students and packages
router.post('/rename-class', async (req, res) => {
  try {
    const { oldClassName, newClassName } = req.body;
    if (!oldClassName || !newClassName) {
      return res.status(400).json({ error: 'oldClassName dan newClassName wajib diisi' });
    }

    const trimmedOld = String(oldClassName).trim();
    const trimmedNew = String(newClassName).trim();

    // 1. Update students table
    run('UPDATE students SET class_name = ? WHERE class_name = ?', [trimmedNew, trimmedOld]);

    // 2. Adjust student level if class indicates SMA vs SMP
    if (['X', 'XI', 'XII', '10', '11', '12'].some(p => trimmedNew.toUpperCase().startsWith(p))) {
      run("UPDATE students SET level = 'SMA' WHERE class_name = ?", [trimmedNew]);
    } else if (['VII', 'VIII', 'IX', '7', '8', '9'].some(p => trimmedNew.toUpperCase().startsWith(p))) {
      run("UPDATE students SET level = 'SMP' WHERE class_name = ?", [trimmedNew]);
    }

    // 3. Update annual_bill_types target_classes
    try {
      const annualBills = (await import('../db/database')).query<any>('SELECT id, target_classes FROM annual_bill_types');
      for (const b of annualBills) {
        if (!b.target_classes || b.target_classes === 'ALL') continue;
        try {
          const targets = JSON.parse(b.target_classes);
          if (Array.isArray(targets) && targets.includes(trimmedOld)) {
            const updatedTargets = targets.map((t: string) => t === trimmedOld ? trimmedNew : t);
            run('UPDATE annual_bill_types SET target_classes = ? WHERE id = ?', [JSON.stringify(updatedTargets), b.id]);
          }
        } catch (_) {}
      }
    } catch (_) {}

    await persistDb();
    return res.json({
      message: `Kelas ${trimmedOld} berhasil diubah menjadi ${trimmedNew} dan seluruh data santri terkait telah disinkronkan.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Sync legacy student classes to active school classes
router.post('/sync-student-classes', async (req, res) => {
  try {
    // Standard mapping from old format to Roman numeral format
    run("UPDATE students SET class_name = 'VII', level = 'SMP' WHERE class_name IN ('7A', '7B', '7', 'Kelas 7', 'Kelas 7A', 'Kelas 7B', 'Kelas VII');");
    run("UPDATE students SET class_name = 'VIII', level = 'SMP' WHERE class_name IN ('8A', '8B', '8', 'Kelas 8', 'Kelas 8A', 'Kelas 8B', 'Kelas VIII');");
    run("UPDATE students SET class_name = 'IX', level = 'SMP' WHERE class_name IN ('9A', '9B', '9', 'Kelas 9', 'Kelas 9A', 'Kelas 9B', 'Kelas IX');");
    run("UPDATE students SET class_name = 'X', level = 'SMA' WHERE class_name IN ('10 IPA', '10 IPS', '10', 'Kelas 10', 'Kelas 10 IPA', 'Kelas X');");
    run("UPDATE students SET class_name = 'XI', level = 'SMA' WHERE class_name IN ('11 IPA', '11 IPS', '11', 'Kelas 11', 'Kelas XI');");
    run("UPDATE students SET class_name = 'XII', level = 'SMA' WHERE class_name IN ('12 IPA', '12 IPS', '12', 'Kelas 12', 'Kelas XII');");

    await persistDb();
    return res.json({ message: 'Seluruh kelas santri berhasil disinkronkan ke format daftar kelas aktif sekolah.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
