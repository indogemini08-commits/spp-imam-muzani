import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { WhatsAppTemplate, WhatsAppLog } from '../../src/types';
import { getArrearsRecipients, logWhatsAppDispatch } from '../services/whatsappService';

const router = Router();

// Get list of students with arrears for WhatsApp reminders
router.get('/reminders', (req, res) => {
  try {
    const list = getArrearsRecipients();
    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Send single WhatsApp notification (records log)
router.post('/send-single', async (req, res) => {
  try {
    const { student_id, recipient_phone, recipient_name, message, channel } = req.body;
    if (!student_id || !recipient_phone || !message) {
      return res.status(400).json({ error: 'Data santri, no HP tujuan, dan pesan wajib diisi' });
    }

    await logWhatsAppDispatch({
      studentId: student_id,
      recipientPhone: recipient_phone,
      recipientName: recipient_name || 'Orang Tua / Wali',
      message,
      status: 'Terkirim',
      channel: channel || 'Direct wa.me'
    });

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_bendahara", "Bendahara", "Kirim Pengingat WhatsApp", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Mengirim pesan WhatsApp pengingat tagihan ke ${recipient_name} (${recipient_phone})`]
    );

    await persistDb();
    return res.json({ message: 'Pengingat WhatsApp berhasil dicatat dan diproses' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Bulk WhatsApp send simulation
router.post('/send-bulk', async (req, res) => {
  try {
    const { items } = req.body; // Array of { student_id, recipient_phone, recipient_name, message }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Daftar pengiriman kosong' });
    }

    let sentCount = 0;
    for (const item of items) {
      await logWhatsAppDispatch({
        studentId: item.student_id,
        recipientPhone: item.recipient_phone,
        recipientName: item.recipient_name || 'Orang Tua / Wali',
        message: item.message,
        status: 'Terkirim',
        channel: 'Bulk Reminder'
      });
      sentCount++;
    }

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_bendahara", "Bendahara", "Kirim WhatsApp Massal", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Mengirim pengingat WhatsApp massal ke ${sentCount} wali santri`]
    );

    await persistDb();
    return res.json({ message: `Berhasil mengirim ${sentCount} pesan WhatsApp pengingat tagihan`, sentCount });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get Templates
router.get('/templates', (req, res) => {
  try {
    const templates = query<WhatsAppTemplate>('SELECT * FROM whatsapp_templates ORDER BY name ASC');
    return res.json(templates);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update Template
router.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, is_active } = req.body;

    run(`
      UPDATE whatsapp_templates
      SET name = ?, content = ?, is_active = ?
      WHERE id = ?
    `, [name, content, is_active !== false ? 1 : 0, id]);

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, "usr_admin", "Admin", "Ubah Template WhatsApp", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, `Memperbarui template WhatsApp: ${name}`]
    );

    await persistDb();
    return res.json({ message: 'Template WhatsApp berhasil diperbarui' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get WhatsApp logs
router.get('/logs', (req, res) => {
  try {
    const { search, limit = 100 } = req.query;
    let sqlStr = `
      SELECT 
        w.*,
        s.name as student_name,
        s.class_name as student_class
      FROM whatsapp_logs w
      LEFT JOIN students s ON w.student_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      sqlStr += ' AND (w.recipient_name LIKE ? OR w.recipient_phone LIKE ? OR s.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sqlStr += ' ORDER BY w.sent_at DESC LIMIT ?';
    params.push(Number(limit));

    const rows = query<any>(sqlStr, params);
    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
