import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { Student, Bill, Transaction, WhatsAppLog, SPPType, EskulType } from '../types';
import {
  ensureStudentPreviousArrearsBill,
  ensureStudent12MonthSppBills,
  ensureStudent12MonthEskulBills,
  synchronizeMasterData
} from '../services/billingEngine';

const router = Router();

// List students with filters and searches
router.get('/', (req, res) => {
  try {
    const { class_name, spp_type_id, status, search } = req.query;

    let sqlStr = `
      SELECT 
        s.*,
        sp.name as spp_type_name,
        sp.monthly_amount as spp_amount
      FROM students s
      LEFT JOIN spp_types sp ON s.spp_type_id = sp.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (class_name) {
      sqlStr += ' AND s.class_name = ?';
      params.push(class_name);
    }
    if (spp_type_id) {
      sqlStr += ' AND s.spp_type_id = ?';
      params.push(spp_type_id);
    }
    if (status) {
      sqlStr += ' AND s.status = ?';
      params.push(status);
    }
    if (search) {
      sqlStr += ' AND (s.name LIKE ? OR s.nis LIKE ? OR s.nisn LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sqlStr += ' ORDER BY s.class_name ASC, s.name ASC';

    const rows = query<any>(sqlStr, params);
    const eskulTypes = query<EskulType>('SELECT id, name FROM eskul_types');
    const eskulMap = new Map(eskulTypes.map(e => [e.id, e.name]));

    const formatted = rows.map(r => {
      let eskulIds: string[] = [];
      try {
        eskulIds = JSON.parse(r.eskul_ids || '[]');
      } catch {
        eskulIds = [];
      }

      // Strictly filter out deleted or non-existent eskul IDs
      const validEskulIds = (Array.isArray(eskulIds) ? eskulIds : []).filter(id => eskulMap.has(id));

      // Auto-heal database record if student had deleted eskul IDs
      if (validEskulIds.length !== eskulIds.length) {
        run('UPDATE students SET eskul_ids = ? WHERE id = ?', [JSON.stringify(validEskulIds), r.id]);
      }

      let additionalArrears = [];
      try {
        additionalArrears = JSON.parse(r.additional_arrears || '[]');
      } catch {
        additionalArrears = [];
      }

      return {
        ...r,
        eskul_ids: validEskulIds,
        eskul_names: validEskulIds.map(id => eskulMap.get(id)!),
        additional_arrears: additionalArrears
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get student full detail
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const student = get<any>(`
      SELECT 
        s.*,
        sp.name as spp_type_name,
        sp.monthly_amount as spp_amount
      FROM students s
      LEFT JOIN spp_types sp ON s.spp_type_id = sp.id
      WHERE s.id = ? OR s.nis = ?
    `, [id, id]);

    if (!student) return res.status(404).json({ error: 'Santri tidak ditemukan' });

    let eskulIds: string[] = [];
    try {
      eskulIds = JSON.parse(student.eskul_ids || '[]');
    } catch {}

    const eskulTypes = query<EskulType>('SELECT id, name FROM eskul_types');
    const eskulMap = new Map(eskulTypes.map(e => [e.id, e.name]));

    const validEskulIds = (Array.isArray(eskulIds) ? eskulIds : []).filter(eId => eskulMap.has(eId));
    if (validEskulIds.length !== eskulIds.length) {
      run('UPDATE students SET eskul_ids = ? WHERE id = ?', [JSON.stringify(validEskulIds), student.id]);
    }

    student.eskul_ids = validEskulIds;
    student.eskul_names = validEskulIds.map(eId => eskulMap.get(eId)!);

    let additionalArrears = [];
    try {
      additionalArrears = JSON.parse(student.additional_arrears || '[]');
    } catch {
      additionalArrears = [];
    }
    student.additional_arrears = additionalArrears;

    // Get bills
    const bills = query<Bill>('SELECT * FROM bills WHERE student_id = ? ORDER BY due_date ASC', [student.id]);

    // Get transactions
    const transactions = query<Transaction>(`
      SELECT t.*
      FROM transactions t
      WHERE t.student_id = ?
      ORDER BY t.date DESC, t.time DESC
    `, [student.id]);

    // Get WA logs
    const waLogs = query<WhatsAppLog>('SELECT * FROM whatsapp_logs WHERE student_id = ? ORDER BY sent_at DESC', [student.id]);

    // Financial summary
    let totalBills = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    for (const b of bills) {
      totalBills += b.amount;
      totalPaid += b.paid_amount;
      totalRemaining += b.remaining_amount;
    }

    return res.json({
      student,
      bills,
      transactions,
      waLogs,
      summary: {
        totalBills,
        totalPaid,
        totalRemaining,
        billCount: bills.length,
        unpaidCount: bills.filter(b => b.remaining_amount > 0).length
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create student
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.nis || !data.class_name || !data.spp_type_id) {
      return res.status(400).json({ error: 'Nama, NIS, Kelas, dan Jenis SPP wajib diisi' });
    }

    const exists = get('SELECT id FROM students WHERE nis = ?', [data.nis]);
    if (exists) {
      return res.status(400).json({ error: `Santri dengan NIS ${data.nis} sudah terdaftar` });
    }

    const id = `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const eskulStr = JSON.stringify(data.eskul_ids || []);
    const additionalArrearsStr = typeof data.additional_arrears === 'string'
      ? data.additional_arrears
      : JSON.stringify(data.additional_arrears || []);

    run(`
      INSERT INTO students (
        id, nis, nisn, name, gender, birth_place, birth_date, level,
        class_name, academic_year_id, status, spp_type_id, parent_phone,
        father_name, father_phone, mother_name, mother_phone, address,
        join_date, eskul_ids, access_pin, previous_arrears, previous_arrears_note,
        additional_arrears
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?
      )
    `, [
      id,
      data.nis,
      data.nisn || '',
      data.name,
      data.gender || 'L',
      data.birth_place || '',
      data.birth_date || '',
      data.level || (['10', '11', '12', 'X', 'XI', 'XII'].some(p => data.class_name.toUpperCase().startsWith(p)) ? 'SMA' : 'SMP'),
      data.class_name,
      data.academic_year_id || 'ta_2026_2027',
      data.status || 'Aktif',
      data.spp_type_id,
      data.parent_phone || '',
      data.father_name || '',
      data.father_phone || '',
      data.mother_name || '',
      data.mother_phone || '',
      data.address || '',
      data.join_date || new Date().toISOString().split('T')[0],
      eskulStr,
      data.access_pin || '1234',
      Number(data.previous_arrears || 0),
      data.previous_arrears_note || '',
      additionalArrearsStr
    ]);

    ensureStudentPreviousArrearsBill(id);
    ensureStudent12MonthSppBills(id);
    ensureStudent12MonthEskulBills(id);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Tambah Santri", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Menambahkan santri baru: ${data.name} (${data.nis}) Kelas ${data.class_name}`]
    );

    await persistDb();
    return res.json({ message: 'Data santri berhasil ditambahkan', id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = get('SELECT * FROM students WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Santri tidak ditemukan' });

    // Sanitize eskul_ids against active eskul_types
    const activeEskuls = query<EskulType>('SELECT id FROM eskul_types');
    const activeEskulIds = new Set(activeEskuls.map(e => e.id));
    const inputEskuls: string[] = Array.isArray(data.eskul_ids) ? data.eskul_ids : [];
    const sanitizedEskuls = inputEskuls.filter(eId => activeEskulIds.has(eId));
    const eskulStr = JSON.stringify(sanitizedEskuls);
    const additionalArrearsStr = typeof data.additional_arrears === 'string'
      ? data.additional_arrears
      : JSON.stringify(data.additional_arrears || []);

    run(`
      UPDATE students
      SET nis = ?, nisn = ?, name = ?, gender = ?, birth_place = ?, birth_date = ?, level = ?,
          class_name = ?, status = ?, spp_type_id = ?, parent_phone = ?,
          father_name = ?, father_phone = ?, mother_name = ?, mother_phone = ?, address = ?,
          eskul_ids = ?, access_pin = ?, previous_arrears = ?, previous_arrears_note = ?,
          additional_arrears = ?
      WHERE id = ?
    `, [
      data.nis,
      data.nisn || '',
      data.name,
      data.gender || 'L',
      data.birth_place || '',
      data.birth_date || '',
      data.level || 'SMP',
      data.class_name,
      data.status || 'Aktif',
      data.spp_type_id,
      data.parent_phone || '',
      data.father_name || '',
      data.father_phone || '',
      data.mother_name || '',
      data.mother_phone || '',
      data.address || '',
      eskulStr,
      data.access_pin || '1234',
      Number(data.previous_arrears || 0),
      data.previous_arrears_note || '',
      additionalArrearsStr,
      id
    ]);

    ensureStudentPreviousArrearsBill(id);
    ensureStudent12MonthSppBills(id);
    ensureStudent12MonthEskulBills(id);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Update Santri", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Memperbarui profil santri: ${data.name} (${data.nis})`]
    );

    await persistDb();
    return res.json({ message: 'Data santri berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Bulk delete students
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Daftar ID santri yang akan dihapus tidak boleh kosong' });
    }

    for (const id of ids) {
      run('DELETE FROM bills WHERE student_id = ?', [id]);
      run('DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE student_id = ?)', [id]);
      run('DELETE FROM transactions WHERE student_id = ?', [id]);
      run('DELETE FROM payment_confirmations WHERE student_id = ?', [id]);
      run('DELETE FROM whatsapp_logs WHERE student_id = ?', [id]);
      run('DELETE FROM students WHERE id = ?', [id]);
    }

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Hapus Santri Massal", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Menghapus massal ${ids.length} santri`]
    );

    await persistDb();
    return res.json({ message: `${ids.length} data santri berhasil dihapus secara permanen.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete student
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const student = get<Student>('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) return res.status(404).json({ error: 'Santri tidak ditemukan' });

    run('DELETE FROM bills WHERE student_id = ?', [id]);
    run('DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE student_id = ?)', [id]);
    run('DELETE FROM transactions WHERE student_id = ?', [id]);
    run('DELETE FROM payment_confirmations WHERE student_id = ?', [id]);
    run('DELETE FROM whatsapp_logs WHERE student_id = ?', [id]);
    run('DELETE FROM students WHERE id = ?', [id]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Hapus Santri", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Menghapus santri ${student.name} (${student.nis}) beserta riwayat tagihan`]
    );

    await persistDb();
    return res.json({ message: 'Data santri berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Import bulk students
router.post('/import', async (req, res) => {
  try {
    const { students: importedList } = req.body;
    if (!Array.isArray(importedList) || importedList.length === 0) {
      return res.status(400).json({ error: 'Data impor santri kosong' });
    }

    const sppTypes = query<SPPType>('SELECT id, name FROM spp_types');
    const defaultSppId = sppTypes[0]?.id || 'spp_reguler';

    const eskulTypes = query<EskulType>('SELECT id, name FROM eskul_types');

    let successCount = 0;
    let skippedCount = 0;

    for (const item of importedList) {
      if (!item.name || !item.nis) {
        skippedCount++;
        continue;
      }

      const cleanNis = String(item.nis).trim();
      const exists = get('SELECT id FROM students WHERE nis = ?', [cleanNis]);
      if (exists) {
        skippedCount++;
        continue;
      }

      // Match SPP Type
      let matchedSppId = defaultSppId;
      if (item.spp_type_name) {
        const found = sppTypes.find(s =>
          s.name.toLowerCase().includes(String(item.spp_type_name).toLowerCase().trim()) ||
          String(item.spp_type_name).toLowerCase().trim().includes(s.name.toLowerCase())
        );
        if (found) matchedSppId = found.id;
      } else if (item.spp_type_id) {
        const found = sppTypes.find(s => s.id === item.spp_type_id);
        if (found) matchedSppId = found.id;
      }

      // Match Eskul IDs
      const matchedEskulIds: string[] = [];
      if (Array.isArray(item.eskul_ids)) {
        for (const eId of item.eskul_ids) {
          if (eskulTypes.some(e => e.id === eId)) matchedEskulIds.push(eId);
        }
      } else if (item.eskul_names || item.eskul) {
        const eskulStr = String(item.eskul_names || item.eskul || '');
        const names = eskulStr.split(/[,;\/]+/).map(n => n.trim().toLowerCase()).filter(Boolean);
        for (const n of names) {
          const matched = eskulTypes.find(e => e.name.toLowerCase().includes(n) || n.includes(e.name.toLowerCase()));
          if (matched && !matchedEskulIds.includes(matched.id)) {
            matchedEskulIds.push(matched.id);
          }
        }
      }

      const id = `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const className = String(item.class_name || 'VII').trim();
      const level = item.level || (['10', '11', '12', 'X', 'XI', 'XII'].some(p => className.toUpperCase().startsWith(p)) ? 'SMA' : 'SMP');
      const prevArrears = Number(item.previous_arrears || item.tunggakan || 0);
      const prevNote = String(item.previous_arrears_note || item.catatan_tunggakan || '').trim();

      run(`
        INSERT INTO students (
          id, nis, nisn, name, gender, level, class_name, academic_year_id,
          status, spp_type_id, parent_phone, father_name, mother_name,
          address, join_date, eskul_ids, access_pin, previous_arrears, previous_arrears_note,
          additional_arrears
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, 'ta_2026_2027',
          'Aktif', ?, ?, ?, ?,
          ?, '2026-07-01', ?, ?, ?, ?,
          '[]'
        )
      `, [
        id,
        cleanNis,
        item.nisn ? String(item.nisn).trim() : '',
        String(item.name).trim(),
        String(item.gender).toUpperCase() === 'P' ? 'P' : 'L',
        level,
        className,
        matchedSppId,
        item.parent_phone ? String(item.parent_phone).trim() : (item.wa ? String(item.wa).trim() : ''),
        item.father_name ? String(item.father_name).trim() : (item.ayah ? String(item.ayah).trim() : ''),
        item.mother_name ? String(item.mother_name).trim() : (item.ibu ? String(item.ibu).trim() : ''),
        item.address ? String(item.address).trim() : 'Bogor',
        JSON.stringify(matchedEskulIds),
        item.access_pin ? String(item.access_pin).trim() : '1234',
        prevArrears,
        prevNote
      ]);

      // Automatically generate bills
      ensureStudentPreviousArrearsBill(id);
      ensureStudent12MonthSppBills(id);
      ensureStudent12MonthEskulBills(id);

      successCount++;
    }

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Impor Santri", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Berhasil mengimpor ${successCount} santri (${skippedCount} dilewati)`]
    );

    await persistDb();
    return res.json({
      message: `Berhasil mengimpor ${successCount} santri (${skippedCount} dilewati).`,
      successCount,
      skippedCount
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
