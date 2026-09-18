import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { AcademicYear } from '../types';
import { generateAcademicYearBills } from '../services/billingEngine';

const router = Router();

// List all academic years
router.get('/', (req, res) => {
  try {
    const years = query<AcademicYear>('SELECT * FROM academic_years ORDER BY name DESC');
    return res.json(years);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Add academic year
router.post('/', async (req, res) => {
  try {
    const { name, semester, start_date, end_date } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama tahun pelajaran wajib diisi' });

    const id = `ta_${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    run(
      'INSERT INTO academic_years (id, name, semester, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, 0)',
      [id, name, semester || 'Ganjil', start_date || '2026-07-01', end_date || '2027-06-30']
    );

    await persistDb();
    return res.json({ message: 'Tahun pelajaran berhasil ditambahkan', id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Set active academic year
router.put('/:id/set-active', async (req, res) => {
  try {
    const { id } = req.params;
    run('UPDATE academic_years SET is_active = 0');
    run('UPDATE academic_years SET is_active = 1 WHERE id = ?', [id]);
    run('UPDATE school_settings SET active_academic_year_id = ? WHERE id = "school_main"', [id]);

    await persistDb();
    return res.json({ message: 'Tahun pelajaran aktif berhasil diubah' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Generate all bills for academic year
router.post('/:id/generate-bills', async (req, res) => {
  try {
    const { id } = req.params;
    const year = get<AcademicYear>('SELECT * FROM academic_years WHERE id = ?', [id]);
    if (!year) return res.status(404).json({ error: 'Tahun pelajaran tidak ditemukan' });

    const result = await generateAcademicYearBills(id);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Generate Tagihan", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Generate tagihan tahun pelajaran ${year.name}: ${result.generatedCount} tagihan dibuat, ${result.skippedCount} tagihan sudah ada.`]
    );

    return res.json({
      message: `Berhasil membangkitkan ${result.generatedCount} tagihan otomatis (${result.skippedCount} dilewati karena sudah ada).`,
      result
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
