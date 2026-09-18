import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { AnnualBillType, AnnualBillPackage } from '../types';
import { syncAnnualBills } from '../services/billingEngine';

const router = Router();

// Get all annual bill types and packages
router.get('/', (req, res) => {
  try {
    const types = query<AnnualBillType>('SELECT * FROM annual_bill_types ORDER BY amount DESC');
    const packages = query<any>('SELECT * FROM annual_bill_packages ORDER BY created_at DESC');

    const formattedPackages = packages.map(p => ({
      ...p,
      is_active: Boolean(p.is_active),
      items: typeof p.items === 'string' ? JSON.parse(p.items || '[]') : p.items
    }));

    const formattedTypes = types.map(t => ({
      ...t,
      target_classes: t.target_classes || 'ALL',
      is_active: Boolean(t.is_active),
      allow_installment: Boolean(t.allow_installment),
      is_mandatory: Boolean(t.is_mandatory)
    }));

    return res.json({
      types: formattedTypes,
      packages: formattedPackages
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Add Annual Bill Type
router.post('/type', async (req, res) => {
  try {
    const { name, description, amount, academic_year_id, due_date, allow_installment, is_mandatory, target_classes } = req.body;
    const safeAmount = parseFloat(amount);
    if (!name || isNaN(safeAmount) || safeAmount <= 0) {
      return res.status(400).json({ error: 'Nama dan nominal tagihan tahunan (lebih dari 0) wajib diisi' });
    }

    const targetClassesVal = Array.isArray(target_classes) ? JSON.stringify(target_classes) : (target_classes || 'ALL');
    const id = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    run(`
      INSERT INTO annual_bill_types (
        id, name, description, amount, academic_year_id, due_date, is_active, allow_installment, is_mandatory, target_classes
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `, [
      id,
      name,
      description || '',
      safeAmount,
      academic_year_id || 'ta_2026_2027',
      due_date || '2026-08-31',
      allow_installment !== false ? 1 : 0,
      is_mandatory !== false ? 1 : 0,
      targetClassesVal
    ]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Tambah Tagihan Tahunan", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Menambahkan item tagihan tahunan: ${name} (Rp ${parseFloat(amount).toLocaleString('id-ID')})`]
    );

    // Immediately synchronize bills for all targeted students
    syncAnnualBills();

    await persistDb();
    return res.json({ message: 'Tagihan tahunan berhasil dibuat dan disinkronkan ke santri', id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update Annual Bill Type
router.put('/type/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, amount, due_date, allow_installment, is_mandatory, is_active, target_classes } = req.body;
    const safeAmount = parseFloat(amount);
    if (!name || isNaN(safeAmount) || safeAmount <= 0) {
      return res.status(400).json({ error: 'Nama dan nominal tagihan tahunan (lebih dari 0) wajib diisi' });
    }

    const targetClassesVal = target_classes !== undefined
      ? (Array.isArray(target_classes) ? JSON.stringify(target_classes) : target_classes)
      : undefined;

    if (targetClassesVal !== undefined) {
      run(`
        UPDATE annual_bill_types
        SET name = ?, description = ?, amount = ?, due_date = ?, allow_installment = ?, is_mandatory = ?, is_active = ?, target_classes = ?
        WHERE id = ?
      `, [
        name,
        description || '',
        safeAmount,
        due_date,
        allow_installment !== false ? 1 : 0,
        is_mandatory !== false ? 1 : 0,
        is_active !== false ? 1 : 0,
        targetClassesVal,
        id
      ]);
    } else {
      run(`
        UPDATE annual_bill_types
        SET name = ?, description = ?, amount = ?, due_date = ?, allow_installment = ?, is_mandatory = ?, is_active = ?
        WHERE id = ?
      `, [
        name,
        description || '',
        safeAmount,
        due_date,
        allow_installment !== false ? 1 : 0,
        is_mandatory !== false ? 1 : 0,
        is_active !== false ? 1 : 0,
        id
      ]);
    }

    // Immediately synchronize bills for all targeted students
    syncAnnualBills();

    await persistDb();
    return res.json({ message: 'Tagihan tahunan berhasil diperbarui dan tagihan disinkronkan' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Annual Bill Type
router.delete('/type/:id', async (req, res) => {
  try {
    const { id } = req.params;
    run('DELETE FROM annual_bill_types WHERE id = ?', [id]);
    run('DELETE FROM bills WHERE (category = "DAFTAR_ULANG" OR category = "TAHUNAN") AND category_id = ? AND paid_amount = 0', [id]);

    // Immediately synchronize bills for all targeted students
    syncAnnualBills();

    await persistDb();
    return res.json({ message: 'Tagihan tahunan berhasil dihapus dan tagihan terkait disinkronkan' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create/Update Annual Package (Paket Daftar Ulang)
router.post('/package', async (req, res) => {
  try {
    const { id, name, academic_year_id, items } = req.body;
    if (!name || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Nama paket dan rincian item wajib diisi' });
    }

    let total = 0;
    for (const it of items) {
      total += Number(it.amount || 0);
    }

    const pkgId = id || `pkg_${Date.now()}`;
    const itemsStr = JSON.stringify(items);

    run(`
      INSERT OR REPLACE INTO annual_bill_packages (id, name, academic_year_id, total_amount, items, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [pkgId, name, academic_year_id || 'ta_2026_2027', total, itemsStr]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Konfigurasi Paket Daftar Ulang", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Menyimpan paket daftar ulang: ${name} dengan ${items.length} item total Rp ${total.toLocaleString('id-ID')}`]
    );

    await persistDb();
    return res.json({ message: 'Paket daftar ulang berhasil disimpan', id: pkgId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
