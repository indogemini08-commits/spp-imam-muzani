import { Router } from 'express';
import { query, get, run, persistDb } from '../db/database';
import { User } from '../types';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const user = get<User>(
      'SELECT id, name, username, email, role, status, created_at, password_hash FROM users WHERE (username = ? OR email = ?)',
      [username.trim(), username.trim()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Pengguna tidak ditemukan' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Hubungi administrator.' });
    }

    // Direct password match (or hash match)
    if ((user as any).password_hash !== password) {
      return res.status(401).json({ error: 'Kata sandi tidak sesuai' });
    }

    // Audit log
    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, ip_address, timestamp) VALUES (?, ?, ?, "Login", "Pengguna berhasil masuk ke sistem", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, user.id, user.name, req.ip || '127.0.0.1']
    );
    await persistDb();

    const { password_hash, ...safeUser } = user as any;
    return res.json({
      message: 'Login berhasil',
      user: safeUser,
      token: `tok_${user.id}_${Date.now()}`
    });
  } catch (err: any) {
    console.error('Error login:', err);
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server' });
  }
});

// List all users
router.get('/users', (req, res) => {
  try {
    const users = query<User>('SELECT id, name, username, email, role, status, created_at FROM users ORDER BY created_at ASC');
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Create user
router.post('/users', async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;
    if (!name || !username || !email || !password || !role) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    const exists = get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (exists) {
      return res.status(400).json({ error: 'Username atau email sudah digunakan' });
    }

    const userId = `usr_${Date.now()}`;
    run(
      'INSERT INTO users (id, name, username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, "active")',
      [userId, name, username, email, password, role]
    );

    run(
      'INSERT INTO audit_logs (id, user_id, user_name, activity, details, timestamp) VALUES (?, ?, "Admin", "Tambah Pengguna", ?, datetime("now", "localtime"))',
      [`audit_${Date.now()}`, userId, `Menambahkan pengguna baru: ${name} (${role})`]
    );

    await persistDb();
    return res.json({ message: 'Pengguna berhasil ditambahkan', id: userId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Current user profile
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || (req.query.token as string);
    const userId = req.query.userId as string;

    let user: User | null = null;
    if (userId) {
      user = get<User>('SELECT id, name, username, email, role, status, created_at FROM users WHERE id = ?', [userId]);
    } else if (token && token.startsWith('tok_')) {
      const parts = token.split('_');
      // Format: tok_{userId}_{timestamp} -> extract userId
      const uId = parts.slice(1, parts.length - 1).join('_');
      if (uId) {
        user = get<User>('SELECT id, name, username, email, role, status, created_at FROM users WHERE id = ?', [uId]);
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan' });
    }
    return res.json(user);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, password } = req.body;

    const user = get<User>('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    if (password && password.trim().length > 0) {
      run('UPDATE users SET name = ?, email = ?, role = ?, status = ?, password_hash = ? WHERE id = ?', [name, email, role, status, password, id]);
    } else {
      run('UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?', [name, email, role, status, id]);
    }

    await persistDb();

    const updatedUser = get<User>('SELECT id, name, username, email, role, status, created_at FROM users WHERE id = ?', [id]);
    return res.json({ message: 'Pengguna berhasil diperbarui', user: updatedUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'usr_super_admin') {
      return res.status(400).json({ error: 'Super Admin utama tidak dapat dihapus' });
    }
    run('DELETE FROM users WHERE id = ?', [id]);
    await persistDb();
    return res.json({ message: 'Pengguna berhasil dihapus' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
