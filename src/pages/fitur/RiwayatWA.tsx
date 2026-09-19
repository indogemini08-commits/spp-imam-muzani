import React, { useState, useEffect } from 'react';
import { History, Search, Download, RefreshCw, MessageCircle, Phone, CheckCircle2, Clock } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';
import { api } from '../../services/api';
import { formatDateIndo } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

export const RiwayatWA: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Message details modal
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Resend WhatsApp modal
  const [resendLog, setResendLog] = useState<any>(null);

  const { success, error } = useNotification();

  const loadLogs = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.whatsapp.getLogs({ search, limit: '100' });
      setLogs(data || []);
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat log riwayat WhatsApp');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useRealtimeSync(() => {
    loadLogs(true);
  });

  useEffect(() => {
    loadLogs(false);
  }, [search]);

  const handleExportExcel = () => {
    if (logs.length === 0) return;
    const headers = ['Waktu', 'Nama Santri', 'Kelas', 'Penerima', 'No WhatsApp', 'Kanal', 'Status', 'Isi Pesan'];
    const rows = logs.map(l => [
      formatDateIndo(l.sent_at),
      l.student_name || '-',
      l.student_class || '-',
      l.recipient_name,
      l.recipient_phone,
      l.channel,
      l.status,
      l.message
    ]);

    exportTableToExcel('LOG_RIWAYAT_WHATSAPP_IMBS', 'Riwayat WhatsApp', headers, rows);
    success('Log riwayat WhatsApp berhasil diekspor ke Excel');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>Riwayat Pengiriman Pesan WhatsApp</span>
          </h2>
          <p className="text-xs text-slate-500">
            Log audit seluruh pesan pengingat tagihan dan kwitansi yang telah dikirimkan kepada wali santri
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadLogs()}
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

      {/* Filter Bar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, wali, atau nomor WhatsApp..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            Total Log Tercatat: <strong className="text-slate-900 dark:text-white">{logs.length} pengiriman</strong>
          </div>
        </div>
      </GlassCard>

      {/* Logs Table */}
      <GlassCard className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-3 px-4 font-semibold w-12 text-center">No</th>
                <th className="py-3 px-4 font-semibold">Waktu Kirim</th>
                <th className="py-3 px-4 font-semibold">Santri & Kelas</th>
                <th className="py-3 px-4 font-semibold">Tujuan (Wali & No HP)</th>
                <th className="py-3 px-4 font-semibold">Kanal</th>
                <th className="py-3 px-4 font-semibold">Cuplikan Pesan</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat data riwayat WhatsApp...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada riwayat pengiriman pesan WhatsApp.
                  </td>
                </tr>
              ) : (
                logs.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {formatDateIndo(row.sent_at)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {row.student_name || 'Santri'}
                      </p>
                      {row.student_class && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Kelas {row.student_class}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{row.recipient_name}</p>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                        {row.recipient_phone}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                        {row.channel}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate" title={row.message}>
                        {row.message}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={row.status === 'Terkirim' ? 'success' : 'danger'}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(row)}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-medium transition-all"
                        >
                          Lihat
                        </button>
                        <button
                          type="button"
                          onClick={() => setResendLog(row)}
                          className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded text-[10px] font-semibold transition-all"
                        >
                          Kirim Ulang
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

      {/* View Message Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Detail Pesan - ${selectedLog.recipient_name}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block">Tujuan:</span>
                <strong className="text-slate-900 dark:text-white font-mono">{selectedLog.recipient_phone}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Waktu:</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDateIndo(selectedLog.sent_at)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-sans whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed border border-slate-200 dark:border-slate-700">
              {selectedLog.message}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Resend Modal */}
      {resendLog && (
        <WhatsAppModal
          isOpen={!!resendLog}
          onClose={() => setResendLog(null)}
          studentId={resendLog.student_id}
          studentName={resendLog.student_name || resendLog.recipient_name}
          recipientPhone={resendLog.recipient_phone}
          initialMessage={resendLog.message}
          onSuccess={() => {
            loadLogs();
          }}
        />
      )}
    </div>
  );
};
