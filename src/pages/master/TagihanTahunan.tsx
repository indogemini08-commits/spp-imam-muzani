import React, { useState, useEffect } from 'react';
import { FolderArchive, PlusCircle, Edit2, Trash2, CheckCircle2, Layers, Calendar } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { AnnualBillType, AnnualBillPackage } from '../../types';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { useNotification } from '../../context/NotificationContext';
import { useAvailableClasses } from '../../context/SchoolContext';

export const TagihanTahunan: React.FC = () => {
  const availableClasses = useAvailableClasses();
  const [types, setTypes] = useState<AnnualBillType[]>([]);
  const [packages, setPackages] = useState<AnnualBillPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AnnualBillType | null>(null);

  // Class targeting
  const [targetMode, setTargetMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<AnnualBillType>>({
    name: '',
    description: '',
    amount: 2500000,
    academic_year_id: 'ta_2026_2027',
    due_date: '2026-08-31',
    allow_installment: true,
    is_mandatory: true,
    is_active: true
  });

  const { success, error } = useNotification();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.annualBills.getAll();
      setTypes(res.types || []);
      setPackages(res.packages || []);
    } catch (err: any) {
      error(err.message || 'Gagal memuat data tagihan tahunan');
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
      amount: 1000000,
      academic_year_id: 'ta_2026_2027',
      due_date: '2026-08-31',
      allow_installment: true,
      is_mandatory: true,
      is_active: true
    });
    setTargetMode('ALL');
    setSelectedClasses([]);
    setIsTypeModalOpen(true);
  };

  const normalizeClassName = (name: string) =>
    String(name || '').trim().replace(/^Kelas\s+/i, '').trim();

  const isClassMatching = (a: string, b: string) =>
    normalizeClassName(a).toLowerCase() === normalizeClassName(b).toLowerCase();

  const handleOpenEdit = (t: AnnualBillType) => {
    setFormData({ ...t });
    if (t.target_classes && t.target_classes !== 'ALL') {
      try {
        const parsed: string[] = typeof t.target_classes === 'string' && t.target_classes.startsWith('[')
          ? JSON.parse(t.target_classes)
          : [t.target_classes];
        
        // Filter out any ghost/legacy classes that are not part of availableClasses
        const matched = (Array.isArray(parsed) ? parsed : [])
          .map(p => availableClasses.find(ac => isClassMatching(ac, p)))
          .filter((c): c is string => Boolean(c));

        // Deduplicate
        const cleanClasses: string[] = [];
        for (const c of matched) {
          if (!cleanClasses.some(x => isClassMatching(x, c))) {
            cleanClasses.push(c);
          }
        }

        if (cleanClasses.length > 0) {
          setSelectedClasses(cleanClasses);
          setTargetMode('CUSTOM');
        } else {
          setSelectedClasses(availableClasses.length > 0 ? [availableClasses[0]] : []);
          setTargetMode('CUSTOM');
        }
      } catch (_) {
        setSelectedClasses([]);
        setTargetMode('ALL');
      }
    } else {
      setTargetMode('ALL');
      setSelectedClasses([]);
    }
    setIsTypeModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeAmount = Number(formData.amount);
    if (!formData.name?.trim() || isNaN(safeAmount) || safeAmount <= 0) {
      error('Nama tagihan dan nominal (lebih dari Rp 0) wajib diisi');
      return;
    }

    if (targetMode === 'CUSTOM' && selectedClasses.length === 0) {
      error('Silakan centang minimal 1 kelas target atau pilih opsi "Semua Kelas"');
      return;
    }

    try {
      // Clean and sanitize selectedClasses to strictly match availableClasses
      const validClasses = selectedClasses
        .map(sc => availableClasses.find(ac => isClassMatching(ac, sc)))
        .filter((c): c is string => Boolean(c));

      const targetClassesVal = targetMode === 'ALL' ? 'ALL' : JSON.stringify(validClasses);
      const payload = { ...formData, amount: safeAmount, target_classes: targetClassesVal };
      if (formData.id) {
        await api.annualBills.updateType(formData.id, payload);
        success(`Tagihan ${formData.name} berhasil diperbarui`);
      } else {
        await api.annualBills.createType(payload);
        success(`Item tagihan ${formData.name} berhasil dibuat`);
      }
      setIsTypeModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal menyimpan tagihan tahunan');
    }
  };

  const formatTargetClasses = (target?: string) => {
    if (!target || target === 'ALL') return 'Semua Kelas';
    try {
      const parsed = typeof target === 'string' && target.startsWith('[') ? JSON.parse(target) : [target];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Match against availableClasses and filter out obsolete ghost classes
        const valid = parsed
          .map(p => availableClasses.find(ac => isClassMatching(ac, p)))
          .filter((c): c is string => Boolean(c));

        const displayList = valid.length > 0 ? valid : parsed;
        const labels = displayList.map(c => String(c).startsWith('Kelas') ? String(c) : `Kelas ${c}`);
        return labels.length <= 2 ? labels.join(', ') : `${labels.length} Kelas (${labels.join(', ')})`;
      }
    } catch (_) {}
    return String(target).startsWith('Kelas') ? String(target) : `Kelas ${target}`;
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await api.annualBills.deleteType(itemToDelete.id);
      success(`Tagihan ${itemToDelete.name} berhasil dihapus`);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal menghapus');
    }
  };

  const totalPackage = types.reduce((sum, t) => sum + (t.is_active ? t.amount : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Tagihan Tahunan & Paket Daftar Ulang
          </h2>
          <p className="text-xs text-slate-500">
            Kelola pos biaya pendaftaran, uang pangkal, seragam, modul, dan infaq pembangunan
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Tambah Pos Tagihan</span>
        </button>
      </div>

      {/* Package Summary Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[11px] font-semibold mb-1">
            <Layers className="w-3 h-3 text-brand-400" />
            <span>Paket Daftar Ulang Aktif</span>
          </div>
          <h3 className="text-lg font-extrabold text-white">
            Paket Daftar Ulang T.A. 2026/2027
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Mencakup {types.filter(t => t.is_active).length} pos tagihan wajib & pilihan yang dapat dicicil oleh wali santri
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400">Total Akumulasi Paket:</span>
          <p className="text-2xl font-black text-brand-400 mt-0.5">
            {formatRupiah(totalPackage)}
          </p>
        </div>
      </div>

      {/* Table Item Pos Tagihan Tahunan */}
      <GlassCard className="p-0 overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="w-full overflow-x-auto lg:overflow-x-hidden">
          <table className="w-full table-auto text-xs text-left border-collapse">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-2 w-10 text-center whitespace-nowrap">No</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Nama Pos Tagihan</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Keterangan</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Sasaran Kelas</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Nominal Tagihan</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Jatuh Tempo</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Sifat Tagihan</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Opsi Cicilan</th>
                <th className="py-2.5 px-2 text-center w-16 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Memuat tagihan tahunan...
                  </td>
                </tr>
              ) : types.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Belum ada pos tagihan tahunan. Klik tombol tambah di atas.
                  </td>
                </tr>
              ) : (
                types.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-2 text-center font-medium text-slate-400 whitespace-nowrap">{idx + 1}</td>
                    <td className="py-2.5 px-2.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {t.name}
                    </td>
                    <td 
                      className="py-2.5 px-2 text-slate-600 dark:text-slate-300 whitespace-nowrap truncate max-w-[120px] lg:max-w-[160px] xl:max-w-[220px]"
                      title={t.description || '-'}
                    >
                      {t.description || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      {(!t.target_classes || t.target_classes === 'ALL') ? (
                        <span className="inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          Semua Kelas
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20"
                          title={formatTargetClasses(t.target_classes)}
                        >
                          {formatTargetClasses(t.target_classes)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-brand-600 dark:text-brand-400 text-sm whitespace-nowrap">
                      {formatRupiah(t.amount)}
                    </td>
                    <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDateIndo(t.due_date)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        t.is_mandatory
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}>
                        {t.is_mandatory ? 'Wajib' : 'Opsional / Infaq'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        t.allow_installment
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {t.allow_installment ? 'Bisa Dicicil' : 'Sekali Bayar'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Edit Pos Tagihan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setItemToDelete(t);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        title={formData.id ? 'Edit Pos Tagihan Tahunan' : 'Tambah Pos Tagihan Baru'}
        subtitle="Atur nama pos, nominal, sasaran kelas, tanggal jatuh tempo dan izin pembayaran cicilan"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nama Pos Tagihan *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Daftar Ulang, Uang Pangkal, Seragam, Modul"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Nominal Biaya (Rp) *</label>
              <input
                type="number"
                required
                min={0}
                step={10000}
                value={formData.amount !== undefined && !isNaN(formData.amount) ? formData.amount : ''}
                onChange={e => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setFormData({ ...formData, amount: isNaN(val) ? 0 : val });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-bold text-sm text-brand-600 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Batas Tanggal Jatuh Tempo *</label>
              <input
                type="date"
                required
                value={formData.due_date || '2026-08-31'}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Opsi Sasaran Kelas */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div>
              <label className="block font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                Sasaran Kelas Pembayaran *
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Tentukan apakah pos tagihan ini berlaku untuk seluruh santri atau hanya santri di kelas tertentu
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetMode('ALL')}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer text-center ${
                  targetMode === 'ALL'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                Semua Kelas (Seluruh Santri)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetMode('CUSTOM');
                  if (selectedClasses.length === 0 && availableClasses.length > 0) {
                    setSelectedClasses([availableClasses[0]]);
                  }
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer text-center ${
                  targetMode === 'CUSTOM'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                Pilih Kelas Tertentu
              </button>
            </div>

            {targetMode === 'CUSTOM' && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Pilih satu atau beberapa kelas target:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClasses([...availableClasses])}
                      className="text-brand-600 hover:underline font-semibold cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedClasses([])}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableClasses.map(cls => {
                    const isChecked = selectedClasses.some(sc => isClassMatching(sc, cls));
                    const labelText = cls.startsWith('Kelas') ? cls : `Kelas ${cls}`;
                    return (
                      <label
                        key={cls}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-brand-500/10 border-brand-500 text-brand-700 dark:text-brand-300 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              const existing = selectedClasses.filter(c => !isClassMatching(c, cls) && availableClasses.some(ac => isClassMatching(ac, c)));
                              setSelectedClasses([...existing, cls]);
                            } else {
                              const filtered = selectedClasses.filter(c => !isClassMatching(c, cls) && availableClasses.some(ac => isClassMatching(ac, c)));
                              setSelectedClasses(filtered);
                            }
                          }}
                          className="w-3.5 h-3.5 text-brand-600 rounded"
                        />
                        <span>{labelText}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedClasses.length === 0 && (
                  <p className="text-[11px] text-rose-500 font-medium">
                    * Harap centang minimal 1 kelas target.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold mb-1">Keterangan / Rincian</label>
            <textarea
              rows={2}
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Rincian pos penggunaan..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={formData.allow_installment !== false}
                onChange={e => setFormData({ ...formData, allow_installment: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span>Izinkan Pembayaran Sebagian / Cicilan</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={formData.is_mandatory !== false}
                onChange={e => setFormData({ ...formData, is_mandatory: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <span>Sifat Tagihan Wajib (Bukan infaq/sukarela)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsTypeModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/30 cursor-pointer"
            >
              Simpan Pos Tagihan
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Pos Tagihan?"
        message={`Apakah Anda yakin ingin menghapus pos tagihan ${itemToDelete?.name}?`}
        confirmText="Hapus"
        danger
      />
    </div>
  );
};
