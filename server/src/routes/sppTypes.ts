import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { SPPType } from '../types';

const router = Router();

// List SPP Types with student counts
router.get('/', (req, res) => {
  try {
    const types = query<any>(`
      SELECT 
        s.*,
        (SELECT COUNT(*) FROM students st WHERE st.spp_type_id = s.id AND st.status = 'Aktif') as student_count
      FROM spp_types s
      ORDER BY s.monthly_amount DESC
    `);

    const formatted = types.map(t => ({
      ...t,
      is_mandatory: Boolean(t.is_mandatory),
      is_active: Boolean(t.is_active),
      active_months: typeof t.active_months === 'string' ? JSON.parse(t.active_months || '[]') : t.active_months
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Add SPP Type
router.post('/', async (req, res) => {
  try {
    const { name, description, monthly_amount, period_type, active_months, is_mandatory } = req.body;
    if (!name || monthly_amount === undefined) {
      return res.status(400).json({ error: 'Nama dan nominal bulanan wajib diisi' });
    }

    const id = `spp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const monthsStr = JSON.stringify(active_months || ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);

    run(`
      INSERT INTO spp_types (id, name, description, monthly_amount, period_type, active_months, is_mandatory, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      id,
      name,
      description || '',
      parseFloat(monthly_amount),
      period_type || 'monthly',
      monthsStr,
      is_mandatory !== false ? 1 : 0
    ]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Tambah Jenis SPP", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Menambahkan jenis SPP: ${name} (Rp ${parseFloat(monthly_amount).toLocaleString('id-ID')})`]
    );

    await persistDb();
    return res.json({ message: 'Jenis SPP berhasil dibuat', id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update SPP Type
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, monthly_amount, period_type, active_months, is_mandatory, is_active } = req.body;

    const existing = get('SELECT * FROM spp_types WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Jenis SPP tidak ditemukan' });

    const monthsStr = JSON.stringify(active_months || ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']);

    run(`
      UPDATE spp_types
      SET name = ?, description = ?, monthly_amount = ?, period_type = ?, active_months = ?, is_mandatory = ?, is_active = ?
      WHERE id = ?
    `, [
      name,
      description || '',
      parseFloat(monthly_amount),
      period_type || 'monthly',
      monthsStr,
      is_mandatory !== false ? 1 : 0,
      is_active !== false ? 1 : 0,
      id
    ]);

    // Synchronize all unpaid SPP bills for this type
    run(`
      UPDATE bills
      SET amount = ?, remaining_amount = ?
      WHERE category = 'SPP' AND category_id = ? AND paid_amount = 0
    `, [parseFloat(monthly_amount), parseFloat(monthly_amount), id]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Update Jenis SPP", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Memperbarui tarif jenis SPP ${name}: Rp ${parseFloat(monthly_amount).toLocaleString('id-ID')} dan menyinkronkan tagihan santri`]
    );

    await persistDb();
    return res.json({ message: 'Jenis SPP berhasil diperbarui dan tagihan belum dibayar disinkronkan' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Duplicate SPP Type
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const item = get<SPPType>('SELECT * FROM spp_types WHERE id = ?', [id]);
    if (!item) return res.status(404).json({ error: 'Jenis SPP tidak ditemukan' });

    const newId = `spp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newName = `${item.name} (Salinan)`;

    run(`
      INSERT INTO spp_types (id, name, description, monthly_amount, period_type, active_months, is_mandatory, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      newId,
      newName,
      item.description,
      item.monthly_amount,
      item.period_type,
      typeof item.active_months === 'string' ? item.active_months : JSON.stringify(item.active_months),
      item.is_mandatory ? 1 : 0
    ]);

    await persistDb();
    return res.json({ message: 'Jenis SPP berhasil diduplikasi', id: newId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete SPP Type
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const studentCount = get<{ count: number }>('SELECT COUNT(*) as count FROM students WHERE spp_type_id = ?', [id]);
    if (studentCount && studentCount.count > 0) {
      return res.status(400).json({
        error: `Jenis SPP ini tidak dapat dihapus karena masih digunakan oleh ${studentCount.count} santri. Anda dapat menonaktifkannya.`
      });
    }

    run('DELETE FROM spp_types WHERE id = ?', [id]);
    await persistDb();
    return res.json({ message: 'Jenis SPP berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
