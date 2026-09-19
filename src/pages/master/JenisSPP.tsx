import React, { useState, useEffect } from 'react';
import { Layers, PlusCircle, Edit2, Copy, Trash2, CheckCircle2, Users, AlertCircle } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { SPPType } from '../../types';
import { formatRupiah } from '../../services/terbilang';
import { useNotification } from '../../context/NotificationContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

export const JenisSPP: React.FC = () => {
  const [types, setTypes] = useState<SPPType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SPPType | null>(null);

  const monthsList = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'];

  const [formData, setFormData] = useState<Partial<SPPType>>({
    name: '',
    description: '',
    monthly_amount: 1500000,
    period_type: 'monthly',
    active_months: monthsList,
    is_mandatory: true,
    is_active: true
  });

  const { success, error } = useNotification();

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.sppTypes.getAll();
      setTypes(data);
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat jenis SPP');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Realtime multi-device sync (silent background update)
  useRealtimeSync(() => loadData(true));

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      description: '',
      monthly_amount: 1500000,
      period_type: 'monthly',
      active_months: monthsList,
      is_mandatory: true,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: SPPType) => {
    setFormData({ ...t });
    setIsModalOpen(true);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.sppTypes.duplicate(id);
      success('Jenis SPP berhasil diduplikasi');
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal menduplikasi');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.monthly_amount === undefined) {
      error('Nama dan nominal SPP wajib diisi');
      return;
    }

    try {
      if (formData.id) {
        await api.sppTypes.update(formData.id, formData);
        success(`Jenis SPP ${formData.name} berhasil diperbarui`);
      } else {
        await api.sppTypes.create(formData);
        success(`Jenis SPP ${formData.name} berhasil dibuat`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal menyimpan jenis SPP');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await api.sppTypes.delete(itemToDelete.id);
      success(`Jenis SPP ${itemToDelete.name} berhasil dihapus`);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal menghapus');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Sistem Multi Jenis SPP
          </h2>
          <p className="text-xs text-slate-500">
            Kelola variasi tarif SPP mandiri untuk santri Boarding, Reguler, Tahfidz, maupun Beasiswa
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Tambah Jenis SPP</span>
        </button>
      </div>

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto overscroll-x-contain -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-[700px] text-xs text-left">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Jenis SPP</th>
                <th className="py-3 px-4">Keterangan / Fasilitas</th>
                <th className="py-3 px-4 text-right">Tarif / Bulan</th>
                <th className="py-3 px-4 text-center">Bulan Aktif</th>
                <th className="py-3 px-4 text-center">Santri Terdaftar</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat jenis SPP...
                  </td>
                </tr>
              ) : types.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada jenis SPP. Klik tombol tambah di atas.
                  </td>
                </tr>
              ) : (
                types.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {t.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs">
                      {t.description || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-brand-600 dark:text-brand-400 text-sm">
                      {formatRupiah(t.monthly_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                        {t.active_months?.length || 12} Bulan (Juli–Juni)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span>{t.student_count || 0} Santri</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={t.is_active ? 'Aktif' : 'Nonaktif'} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(t.id)}
                          className="p-1.5 text-slate-600 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Duplikasi Jenis SPP"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Jenis SPP"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setItemToDelete(t);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Hapus"
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

      {/* MODAL FORM ADD / EDIT */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={formData.id ? 'Edit Jenis SPP' : 'Tambah Jenis SPP Baru'}
        subtitle="Atur nama, tarif nominal, dan bulan aktif tagihan"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nama Jenis SPP *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: SPP Boarding, SPP Reguler, SPP Tahfidz"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Nominal per Bulan (Rp) *</label>
            <input
              type="number"
              required
              min={0}
              step={10000}
              value={formData.monthly_amount || 0}
              onChange={e => setFormData({ ...formData, monthly_amount: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-bold text-sm text-brand-600 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Keterangan / Fasilitas</label>
            <textarea
              rows={2}
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contoh: Termasuk konsumsi, asrama, laundry & pembinaan 24 jam"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1.5">Bulan Aktif Tagihan</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {monthsList.map(m => {
                const checked = (formData.active_months || []).includes(m);
                return (
                  <label
                    key={m}
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? 'bg-brand-500/15 border-brand-500/40 text-brand-700 dark:text-brand-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const cur = formData.active_months || [];
                        const next = checked ? cur.filter(x => x !== m) : [...cur, m];
                        setFormData({ ...formData, active_months: next });
                      }}
                      className="w-3.5 h-3.5 text-brand-600 rounded"
                    />
                    <span>{m}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={formData.is_mandatory !== false}
                onChange={e => setFormData({ ...formData, is_mandatory: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span>Wajib Dibayar Setiap Bulan</span>
            </label>

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
              Simpan Jenis SPP
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Jenis SPP?"
        message={`Apakah Anda yakin ingin menghapus jenis SPP ${itemToDelete?.name}? Jika masih ada santri yang menggunakan jenis SPP ini, sistem akan menolak penghapusan untuk menjaga integritas data.`}
        confirmText="Hapus"
        danger
      />
    </div>
  );
};
