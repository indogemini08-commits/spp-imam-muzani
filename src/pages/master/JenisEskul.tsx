import React, { useState, useEffect } from 'react';
import { Activity, PlusCircle, Edit2, Trash2, Users, Dumbbell } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { EskulType } from '../../types';
import { formatRupiah } from '../../services/terbilang';
import { useNotification } from '../../context/NotificationContext';

export const JenisEskul: React.FC = () => {
  const [eskuls, setEskuls] = useState<EskulType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<EskulType | null>(null);

  const [formData, setFormData] = useState<Partial<EskulType>>({
    name: '',
    description: '',
    amount: 150000,
    billing_period: 'monthly',
    is_active: true
  });

  const { success, error } = useNotification();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.eskul.getAll();
      setEskuls(data);
    } catch (err: any) {
      error(err.message || 'Gagal memuat jenis eskul');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('supabase-data-changed', handleSync);
    return () => window.removeEventListener('supabase-data-changed', handleSync);
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      description: '',
      amount: 150000,
      billing_period: 'monthly',
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (eItem: EskulType) => {
    setFormData({ ...eItem });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.amount === undefined) {
      error('Nama dan tarif eskul wajib diisi');
      return;
    }

    try {
      if (formData.id) {
        await api.eskul.update(formData.id, formData);
        success(`Eskul ${formData.name} berhasil diperbarui`);
      } else {
        await api.eskul.create(formData);
        success(`Eskul baru ${formData.name} berhasil ditambahkan`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal menyimpan data eskul');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await api.eskul.delete(itemToDelete.id);
      success(`Eskul ${itemToDelete.name} berhasil dihapus`);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal menghapus eskul');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Sistem Kegiatan Ekstrakurikuler
          </h2>
          <p className="text-xs text-slate-500">
            Kelola kegiatan minat bakat santri dengan mekanisme penagihan dinamis (bulanan / semester)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Tambah Jenis Eskul</span>
        </button>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Eskul</th>
                <th className="py-3 px-4 hidden md:table-cell">Keterangan</th>
                <th className="py-3 px-4 text-right">Tarif Iuran</th>
                <th className="py-3 px-4 text-center hidden sm:table-cell">Periode</th>
                <th className="py-3 px-4 text-center">Santri</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat data eskul...
                  </td>
                </tr>
              ) : eskuls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada data eskul terdaftar.
                  </td>
                </tr>
              ) : (
                eskuls.map((e, idx) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Dumbbell className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div>{e.name}</div>
                          <div className="text-[11px] text-slate-500 font-normal md:hidden line-clamp-1">{e.description || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs hidden md:table-cell">
                      {e.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-brand-600 dark:text-brand-400 text-sm whitespace-nowrap">
                      {formatRupiah(e.amount)}
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        {e.billing_period === 'monthly' ? 'Bulanan' : e.billing_period === 'semester' ? 'Per Semester' : 'Tahunan'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>{e.student_count || 0}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={e.is_active ? 'Aktif' : 'Nonaktif'} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(e)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Eskul"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setItemToDelete(e);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Hapus Eskul"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* FORM MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.id ? 'Edit Jenis Eskul' : 'Tambah Jenis Eskul Baru'}
        subtitle="Konfigurasi nama, iuran, dan periode penagihan eskul"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nama Kegiatan Eskul *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Futsal, Karate, Coding, Panahan"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Nominal Iuran (Rp) *</label>
            <input
              type="number"
              required
              min={0}
              step={10000}
              value={formData.amount || 0}
              onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-bold text-sm text-brand-600 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Periode Tagihan</label>
            <select
              value={formData.billing_period || 'monthly'}
              onChange={e => setFormData({ ...formData, billing_period: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="monthly">Bulanan (Juli s.d. Juni)</option>
              <option value="semester">Per Semester (2x per tahun)</option>
              <option value="annual">Tahunan (1x per tahun)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Keterangan / Deskripsi</label>
            <textarea
              rows={2}
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi kegiatan dan pelatih..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={formData.is_active !== false}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span>Status Aktif</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/30"
            >
              Simpan Eskul
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Kegiatan Eskul?"
        message={`Apakah Anda yakin ingin menghapus kegiatan eskul ${itemToDelete?.name}?`}
        confirmText="Hapus"
        danger
      />
    </div>
  );
};
