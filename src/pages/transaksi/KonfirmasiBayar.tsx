import React, { useState, useEffect } from 'react';
import { FileCheck2, CheckCircle2, XCircle, Eye, Clock, Image, ArrowUpRight } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { KwitansiModal } from '../../components/kwitansi/KwitansiModal';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

export const KonfirmasiBayar: React.FC = () => {
  const { user } = useAuth();
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Menunggu');

  // Preview Proof Modal
  const [previewProof, setPreviewProof] = useState<string | null>(null);

  // Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedConfToReject, setSelectedConfToReject] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Auto Kwitansi on Approval
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const { success, error, warning } = useNotification();

  const loadConfirmations = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.confirmations.getAll({ status: statusFilter });
      setConfirmations(data);
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat konfirmasi pembayaran');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfirmations();
  }, [statusFilter]);

  // Realtime multi-device sync (silent background update)
  useRealtimeSync(() => loadConfirmations(true));

  // Handle Approve
  const handleApprove = async (conf: any) => {
    try {
      const reviewerName = user?.name || 'Fakhrur Rodhi (Super Admin)';
      const reviewerId = user?.id || 'usr_super_admin';
      const res = await api.confirmations.approve(conf.id, {
        reviewer_name: reviewerName,
        reviewer_id: reviewerId
      });

      success(`Pembayaran ${conf.student_name} senilai ${formatRupiah(conf.amount)} telah disetujui & dicatat di pembukuan`);

      if (res.receiptNo) {
        const rData = await api.payments.getReceiptData(res.receiptNo);
        setReceiptData(rData);
        setIsReceiptModalOpen(true);
      }

      loadConfirmations();
    } catch (err: any) {
      error(err.message || 'Gagal menyetujui konfirmasi');
    }
  };

  // Handle Reject Submit
  const handleRejectSubmit = async () => {
    if (!selectedConfToReject || !rejectReason) {
      warning('Alasan penolakan wajib diisi');
      return;
    }

    try {
      const reviewerName = user?.name || 'Fakhrur Rodhi (Super Admin)';
      await api.confirmations.reject(selectedConfToReject.id, {
        reason: rejectReason,
        reviewer_name: reviewerName
      });
      success('Konfirmasi pembayaran ditolak');
      setIsRejectModalOpen(false);
      setSelectedConfToReject(null);
      setRejectReason('');
      loadConfirmations();
    } catch (err: any) {
      error(err.message || 'Gagal menolak konfirmasi');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Konfirmasi Pembayaran Transfer Orang Tua
          </h2>
          <p className="text-xs text-slate-500">
            Verifikasi bukti setoran / transfer yang diunggah wali santri melalui Portal Mandiri
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
          {['Menunggu', 'Disetujui', 'Ditolak', ''].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === st
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {st === '' ? 'Semua' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="w-full overflow-x-auto overscroll-x-contain -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-[850px] table-auto text-xs text-left border-collapse">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-2.5 whitespace-nowrap text-left">Tanggal Upload</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap text-left">Santri</th>
                <th className="py-2.5 px-2 whitespace-nowrap text-left">Pengirim Rekening</th>
                <th className="py-2.5 px-2 whitespace-nowrap text-left">Bank / Saluran</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap text-right">Jumlah Transfer</th>
                <th className="py-2.5 px-2 whitespace-nowrap text-center">Bukti Transfer</th>
                <th className="py-2.5 px-2 whitespace-nowrap text-left">Catatan Wali</th>
                <th className="py-2.5 px-2 whitespace-nowrap text-center">Status</th>
                <th className="py-2.5 px-2 whitespace-nowrap text-center">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Memuat data konfirmasi...
                  </td>
                </tr>
              ) : confirmations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada konfirmasi pembayaran berstatus {statusFilter || 'Semua'}
                  </td>
                </tr>
              ) : (
                confirmations.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                      {formatDateIndo(c.date)}
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <span className="font-bold text-slate-900 dark:text-white block whitespace-nowrap">
                        {c.student_name}
                      </span>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">
                        NIS: {c.student_nis} • Kelas {c.student_class}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {c.sender_name}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {c.bank_name || c.payment_method}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
                      {formatRupiah(c.amount)}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      {c.proof_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewProof(c.proof_url)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors"
                        >
                          <Image className="w-3.5 h-3.5 text-blue-500" />
                          <span>Lihat Foto</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px] whitespace-nowrap">Tanpa Foto</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300 max-w-[120px] lg:max-w-[150px] xl:max-w-[190px] truncate whitespace-nowrap" title={c.notes || '-'}>
                      {c.notes || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <Badge status={c.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      {c.status === 'Menunggu' ? (
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleApprove(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all whitespace-nowrap active:scale-95"
                            title="Setujui dan masukkan ke kas"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Setujui</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedConfToReject(c);
                              setRejectReason('');
                              setIsRejectModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 rounded-lg text-xs font-semibold transition-all whitespace-nowrap active:scale-95"
                            title="Tolak transfer"
                          >
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {c.reviewed_by ? `Oleh: ${c.reviewed_by}` : 'Selesai'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* PROOF IMAGE MODAL */}
      <Modal
        isOpen={Boolean(previewProof)}
        onClose={() => setPreviewProof(null)}
        title="Pratinjau Bukti Transfer Pembayaran"
        maxWidth="lg"
      >
        <div className="p-2 flex flex-col items-center">
          {previewProof && (
            <img
              src={previewProof}
              alt="Bukti Transfer"
              className="max-h-[65vh] w-auto rounded-xl object-contain border border-slate-200 dark:border-slate-700 shadow-md"
            />
          )}
          <div className="mt-4 flex justify-end w-full">
            <button
              onClick={() => setPreviewProof(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Tolak Konfirmasi Pembayaran"
        subtitle="Sertakan alasan mengapa transfer ini ditolak"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              Alasan Penolakan (Akan terlihat oleh wali santri) *
            </label>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Contoh: Dana belum masuk rekening, mutasi tidak cocok, atau bukti buram..."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleRejectSubmit}
              disabled={!rejectReason.trim()}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50"
            >
              Tolak Pembayaran
            </button>
          </div>
        </div>
      </Modal>

      {/* KWITANSI MODAL POPUP */}
      <KwitansiModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        data={receiptData}
      />
    </div>
  );
};
