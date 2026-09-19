import React, { useState, useEffect } from 'react';
import { Calendar, PlusCircle, CheckCircle2, Sparkles, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { AcademicYear } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

export const TahunPelajaran: React.FC = () => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedYearForGen, setSelectedYearForGen] = useState<AcademicYear | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState<Partial<AcademicYear>>({
    name: '2027/2028',
    semester: 'Ganjil',
    start_date: '2027-07-01',
    end_date: '2028-06-30'
  });

  const { success, error } = useNotification();

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.academicYears.getAll();
      setYears(data);
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat tahun pelajaran');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Realtime multi-device sync (silent background update)
  useRealtimeSync(() => loadData(true));

  const handleSetActive = async (id: string, name: string) => {
    try {
      await api.academicYears.setActive(id);
      success(`Tahun pelajaran ${name} kini aktif sebagai periode utama`);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal mengubah tahun pelajaran aktif');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      await api.academicYears.create(formData);
      success(`Tahun pelajaran ${formData.name} berhasil ditambahkan`);
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal membuat tahun pelajaran');
    }
  };

  const handleTriggerGenerateBills = async () => {
    if (!selectedYearForGen) return;

    setIsGenerating(true);
    try {
      const res = await api.academicYears.generateBills(selectedYearForGen.id);
      success(res.message || 'Tagihan otomatis berhasil dibangkitkan untuk seluruh santri!');
      setIsGenerateModalOpen(false);
      setSelectedYearForGen(null);
    } catch (err: any) {
      error(err.message || 'Gagal membangkitkan tagihan');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Tahun Pelajaran & Otomatisasi Tagihan
          </h2>
          <p className="text-xs text-slate-500">
            Kelola kalender akademik aktif dan picu generator tagihan otomatis (Billing Engine)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Tambah Tahun Pelajaran</span>
        </button>
      </div>

      {/* Banner Billing Engine */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-800/40 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold mb-2">
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Automatic Bill Generation Engine</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1.5">
            Bangkitkan Seluruh Tagihan Tahun Pelajaran Sekali Klik
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Sistem secara otomatis membaca setiap tarif SPP santri (Boarding, Reguler, Tahfidz), kegiatan eskul yang diikuti, serta paket daftar ulang, lalu membangkitkan 12 bulan tagihan tanpa duplikasi.
          </p>
        </div>
      </div>

      {/* Table Tahun Pelajaran */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto overscroll-x-contain -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-[650px] text-xs text-left">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Tahun Pelajaran</th>
                <th className="py-3 px-4">Periode Tanggal</th>
                <th className="py-3 px-4 text-center">Status Periode</th>
                <th className="py-3 px-4 text-center">Aksi & Generator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Memuat tahun pelajaran...
                  </td>
                </tr>
              ) : years.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Belum ada tahun pelajaran terdaftar.
                  </td>
                </tr>
              ) : (
                years.map((y, idx) => (
                  <tr key={y.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white text-sm">
                      {y.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {y.start_date} s.d. {y.end_date}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status={y.is_active ? 'AKTIF' : 'NONAKTIF'} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2.5">
                        {y.is_active ? (
                          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 w-28 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>T.A. Aktif</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetActive(y.id, y.name)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-emerald-600 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95 w-28 shrink-0 cursor-pointer"
                            title="Aktifkan tahun pelajaran ini"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Set Aktif</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedYearForGen(y);
                            setIsGenerateModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-brand-600/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                          title="Generate seluruh tagihan SPP & Eskul untuk santri aktif"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate Tagihan</span>
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

      {/* ADD YEAR MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Tahun Pelajaran"
        subtitle="Daftarkan periode akademik baru"
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nama Tahun Pelajaran *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: 2027/2028"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={formData.start_date || '2027-07-01'}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Tanggal Selesai</label>
              <input
                type="date"
                value={formData.end_date || '2028-06-30'}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/30"
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM GENERATE BILLS MODAL */}
      <ConfirmDialog
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onConfirm={handleTriggerGenerateBills}
        title={`Generate Tagihan Otomatis (${selectedYearForGen?.name})?`}
        message={`Sistem akan membuat tagihan SPP 12 bulan (Juli s.d. Juni), kegiatan eskul, dan pos daftar ulang untuk seluruh santri aktif pada Tahun Pelajaran ${selectedYearForGen?.name}. Tagihan yang sudah ada akan dilewati secara otomatis untuk mencegah duplikasi.`}
        confirmText={isGenerating ? 'Memproses Tagihan...' : 'Ya, Bangkitkan Tagihan Sekarang'}
        cancelText="Batal"
        danger={false}
        isLoading={isGenerating}
      />
    </div>
  );
};
