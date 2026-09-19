import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Edit, Trash2, Shield, Key, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { User, UserRole } from '../../types';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

export const Pengguna: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user: currentUser, updateUser, refreshUser } = useAuth();
  const { success, error } = useNotification();

  // Modal Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Delete Confirm Dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const loadUsers = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.auth.getUsers();
      setUsers(data || []);
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat data pengguna');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useRealtimeSync(() => {
    loadUsers(true);
  });

  useEffect(() => {
    loadUsers(false);
  }, []);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedUserId(null);
    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('staff');
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: User) => {
    setIsEditing(true);
    setSelectedUserId(u.id);
    setName(u.name);
    setUsername(u.username);
    setEmail(u.email);
    setPassword(''); // leave blank if unchanged
    setRole(u.role);
    setStatus(u.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedUserId) {
        await api.auth.updateUser(selectedUserId, {
          name,
          email,
          role,
          status,
          ...(password ? { password } : {})
        });
        success('Data pengguna berhasil diperbarui');

        // Immediately update current logged-in user profile if this account was edited
        if (currentUser && (currentUser.id === selectedUserId || currentUser.username === username)) {
          updateUser({ name, email, role, status });
        }
        await refreshUser();
      } else {
        if (!password) {
          error('Password wajib diisi untuk pengguna baru');
          return;
        }
        await api.auth.createUser({
          name,
          username,
          email,
          password,
          role,
          status
        });
        success('Pengguna baru berhasil ditambahkan');
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      error(err.message || 'Gagal menyimpan pengguna');
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.auth.deleteUser(userToDelete.id);
      success(`Pengguna ${userToDelete.name} berhasil dihapus`);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      error(err.message || 'Gagal menghapus pengguna');
    }
  };

  const getRoleBadgeVariant = (r: UserRole) => {
    switch (r) {
      case 'super_admin': return 'danger';
      case 'bendahara': return 'primary';
      case 'staff': return 'warning';
      case 'viewer': return 'default';
      default: return 'default';
    }
  };

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'super_admin': return 'Super Admin';
      case 'bendahara': return 'Bendahara Sekolah';
      case 'staff': return 'Staf Tata Usaha';
      case 'viewer': return 'Viewer / Pimpinan';
      default: return r;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <span>Manajemen Pengguna & Hak Akses (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-500">
            Kelola akun administrator, bendahara, staf tata usaha, dan pengawas keuangan
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-3 px-4 font-semibold w-12 text-center">No</th>
                <th className="py-3 px-4 font-semibold">Nama Lengkap & User ID</th>
                <th className="py-3 px-4 font-semibold">Username</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Peran / Hak Akses</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Belum ada pengguna terdaftar.
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-900 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{u.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">{u.username}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getRoleBadgeVariant(u.role)}>
                        {getRoleLabel(u.role)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Aktif</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-500" />
                            <span>Nonaktif</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Pengguna"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {u.username !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              setUserToDelete(u);
                              setDeleteConfirmOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Contoh: Ustadz Abdullah, S.Pd"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isEditing}
                placeholder="contoh: abdullah"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="contoh@imbs.sch.id"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password {isEditing && <span className="font-normal text-slate-400">(Kosongkan bila tidak diubah)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEditing}
              placeholder={isEditing ? '••••••••' : 'Masukkan kata sandi'}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Peran / Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="super_admin">Super Admin</option>
                <option value="bendahara">Bendahara Sekolah</option>
                <option value="staff">Staf Tata Usaha</option>
                <option value="viewer">Viewer (Hanya Lihat)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status Akun
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all"
            >
              {isEditing ? 'Perbarui Pengguna' : 'Simpan Pengguna'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Pengguna"
        message={`Apakah Anda yakin ingin menghapus akun ${userToDelete?.name}? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Pengguna"
        variant="danger"
      />
    </div>
  );
};
