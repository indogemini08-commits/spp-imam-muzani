import React, { useState } from 'react';
import { Database, Download, Upload, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export const BackupRestore: React.FC = () => {
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const { success, error, info } = useNotification();

  const handleDownloadBackup = () => {
    api.system.backupDatabase();
    success('Unduhan file cadangan database JSON sedang diproses...');
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        setIsRestoring(true);
        await api.system.restoreDatabase(jsonContent);
        success('Database berhasil dipulihkan secara menyeluruh!');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        error(err.message || 'File cadangan tidak valid atau rusak');
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await api.system.resetDemo();
      success('Database berhasil di-reset ke data demo awal!');
      setResetDialogOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      error(err.message || 'Gagal mereset data demo');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-600" />
          <span>Cadangkan & Pulihkan Database (Backup & Restore)</span>
        </h2>
        <p className="text-xs text-slate-500">
          Amankan seluruh data sekolah, santri, tagihan, transaksi pembayaran, dan log audit secara berkala
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup Card */}
        <GlassCard className="p-6 flex flex-col justify-between border-t-4 border-t-brand-600">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Cadangkan Data (Export JSON)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Unduh snapshot lengkap database (14 tabel relasional: Pengguna, Santri, Tagihan, Transaksi, Kwitansi, Konfirmasi, & Template WA) dalam format JSON terenkripsi/terstruktur.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Cadangan Database Sekarang</span>
            </button>
          </div>
        </GlassCard>

        {/* Restore Card */}
        <GlassCard className="p-6 flex flex-col justify-between border-t-4 border-t-blue-600">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Pulihkan Data (Import JSON)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Unggah file cadangan JSON yang telah diunduh sebelumnya untuk mengembalikan seluruh keadaan database ke kondisi saat cadangan dibuat.
            </p>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
            <label className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? 'Memulihkan Data...' : 'Pilih File Cadangan (.json)'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileRestore}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>
        </GlassCard>
      </div>

      {/* Danger Zone: Reset Demo Data */}
      <GlassCard className="p-6 border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">
                Zona Berbahaya: Reset ke Data Demo
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl">
                Tindakan ini akan mengosongkan seluruh tabel database dan mengisinya kembali dengan 20 data santri demo awal, tagihan, serta transaksi bawaan sistem.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setResetDialogOpen(true)}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition-all active:scale-95"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Mereset Database...' : 'Reset Data Demo Bawaan'}</span>
          </button>
        </div>
      </GlassCard>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onConfirm={handleResetDemo}
        title="Konfirmasi Reset Database"
        message="Apakah Anda yakin ingin mereset database ke data demo awal? Semua perubahan data yang Anda masukkan sebelumnya akan digantikan oleh dataset demo bawaan."
        confirmText="Ya, Reset Database"
        variant="danger"
      />
    </div>
  );
};
