import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Download, RefreshCw, Clock, User, Globe } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { formatDateIndo } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { AuditLog } from '../../types';

export const LogAktivitas: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const { success, error } = useNotification();

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.system.getAuditLogs({ search, limit: '100' });
      setLogs(data || []);
    } catch (err: any) {
      error(err.message || 'Gagal memuat log aktivitas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [search]);

  const handleExportExcel = () => {
    if (logs.length === 0) return;
    const headers = ['Waktu', 'Pengguna', 'Aktivitas', 'Rincian Aktivitas', 'Alamat IP'];
    const rows = logs.map(l => [
      formatDateIndo(l.timestamp),
      l.user_name,
      l.activity,
      l.details,
      l.ip_address || '127.0.0.1'
    ]);

    exportTableToExcel('LOG_AKTIVITAS_SISTEM_IMBS', 'Log Audit', headers, rows);
    success('Log aktivitas berhasil diekspor ke Excel');
  };

  const getActivityBadgeVariant = (act: string) => {
    const lower = act.toLowerCase();
    if (lower.includes('hapus') || lower.includes('batal')) return 'danger';
    if (lower.includes('bayar') || lower.includes('tambah') || lower.includes('setujui')) return 'success';
    if (lower.includes('ubah') || lower.includes('update') || lower.includes('wa')) return 'warning';
    return 'primary';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <span>Log Audit & Aktivitas Sistem</span>
          </h2>
          <p className="text-xs text-slate-500">
            Rekam jejak setiap perubahan data penting, transaksi, login pengguna, dan pengiriman notifikasi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aktivitas, nama pengguna, atau rincian..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            Total Log: <strong className="text-slate-900 dark:text-white">{logs.length} catatan aktivitas</strong>
          </div>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-3 px-4 font-semibold w-12 text-center">No</th>
                <th className="py-3 px-4 font-semibold">Waktu Kejadian</th>
                <th className="py-3 px-4 font-semibold">Pengguna / Petugas</th>
                <th className="py-3 px-4 font-semibold">Aktivitas</th>
                <th className="py-3 px-4 font-semibold">Rincian Perubahan</th>
                <th className="py-3 px-4 font-semibold text-center">Alamat IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Memuat log aktivitas sistem...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada riwayat aktivitas yang tercatat.
                  </td>
                </tr>
              ) : (
                logs.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {formatDateIndo(row.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900 dark:text-white">{row.user_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getActivityBadgeVariant(row.activity)}>
                        {row.activity}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 max-w-md text-slate-600 dark:text-slate-300">
                      {row.details}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-400">
                      {row.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
