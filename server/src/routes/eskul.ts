import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { EskulType, Student } from '../../src/types';
import { synchronizeMasterData } from '../services/billingEngine';

const router = Router();

// List Eskul with student counts
router.get('/', (req, res) => {
  try {
    const eskuls = query<EskulType>('SELECT * FROM eskul_types ORDER BY name ASC');
    const students = query<Student>('SELECT id, eskul_ids FROM students WHERE status = "Aktif"');

    const formatted = eskuls.map(e => {
      let count = 0;
      for (const st of students) {
        try {
          const list = JSON.parse(st.eskul_ids as any || '[]');
          if (Array.isArray(list) && list.includes(e.id)) {
            count++;
          }
        } catch {}
      }
      return {
        ...e,
        is_active: Boolean(e.is_active),
        student_count: count
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Add Eskul
router.post('/', async (req, res) => {
  try {
    const { name, description, amount, billing_period } = req.body;
    if (!name || amount === undefined) {
      return res.status(400).json({ error: 'Nama dan nominal eskul wajib diisi' });
    }

    const id = `eskul_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    run(`
      INSERT INTO eskul_types (id, name, description, amount, billing_period, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [id, name, description || '', parseFloat(amount), billing_period || 'monthly']);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Tambah Jenis Eskul", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Menambahkan jenis eskul: ${name} (Rp ${parseFloat(amount).toLocaleString('id-ID')})`]
    );

    await persistDb();
    return res.json({ message: 'Jenis eskul berhasil ditambahkan', id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update Eskul (Synchronizes unpaid bills in real-time)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, amount, billing_period, is_active } = req.body;

    run(`
      UPDATE eskul_types
      SET name = ?, description = ?, amount = ?, billing_period = ?, is_active = ?
      WHERE id = ?
    `, [name, description || '', parseFloat(amount), billing_period || 'monthly', is_active !== false ? 1 : 0, id]);

    // Synchronize all unpaid bills for this eskul
    run(`
      UPDATE bills
      SET amount = ?, remaining_amount = ?, bill_name = 'Eskul ' || ? || ' - ' || period_month || ' ' || period_year
      WHERE category = "ESKUL" AND category_id = ? AND paid_amount = 0
    `, [parseFloat(amount), parseFloat(amount), name, id]);

    synchronizeMasterData();
    await persistDb();
    return res.json({ message: 'Jenis eskul berhasil diperbarui dan tagihan disinkronkan' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete Eskul (Cleans up student eskul_ids and removes unpaid bills immediately)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Delete from eskul_types
    run('DELETE FROM eskul_types WHERE id = ?', [id]);

    // 2. Remove this eskul from all students' eskul_ids
    const students = query<Student>('SELECT id, eskul_ids FROM students');
    for (const st of students) {
      try {
        const list = JSON.parse(st.eskul_ids as any || '[]');
        if (Array.isArray(list) && list.includes(id)) {
          const updated = list.filter(eId => eId !== id);
          run('UPDATE students SET eskul_ids = ? WHERE id = ?', [JSON.stringify(updated), st.id]);
        }
      } catch {}
    }

    // 3. Delete all unpaid bills for this eskul
    run('DELETE FROM bills WHERE category = "ESKUL" AND category_id = ? AND paid_amount = 0', [id]);

    // 4. Run master synchronization
    synchronizeMasterData();

    // 5. Audit log
    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Hapus Jenis Eskul", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Menghapus jenis eskul ID ${id} dan menyinkronkan seluruh data santri serta tagihan`]
    );

    await persistDb();
    return res.json({ message: 'Jenis eskul berhasil dihapus dan seluruh data santri/tagihan disinkronkan secara langsung' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
