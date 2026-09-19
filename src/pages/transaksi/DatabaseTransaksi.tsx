import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  Filter,
  Download,
  Printer,
  Eye,
  Trash2,
  Share2,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { Transaction } from '../../types';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { KwitansiModal } from '../../components/kwitansi/KwitansiModal';
import { useAvailableClasses } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

export const DatabaseTransaksi: React.FC = () => {
  const { user } = useAuth();
  const availableClasses = useAvailableClasses();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Modals
  const [selectedTrxDetail, setSelectedTrxDetail] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Cancel Transaction Dialog
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [trxToCancel, setTrxToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const { success, error, warning } = useNotification();

  const loadTransactions = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.payments.getTransactions({
        search,
        date_from: dateFrom,
        date_to: dateTo,
        payment_method: selectedMethod,
        class_name: selectedClass
      });
      setTransactions(data);
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat transaksi');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [dateFrom, dateTo, selectedMethod, selectedClass]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Realtime multi-device sync (silent background update)
  useRealtimeSync(() => loadTransactions(true));

  // Open Receipt Modal
  const handleOpenReceipt = async (receiptNo: string) => {
    try {
      const data = await api.payments.getReceiptData(receiptNo);
      setSelectedReceipt(data);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      error(err.message || 'Gagal memuat data kwitansi');
    }
  };

  // Open Detail Modal
  const handleOpenDetail = async (id: string) => {
    try {
      const data = await api.payments.getTransactionDetail(id);
      setSelectedTrxDetail(data);
      setIsDetailModalOpen(true);
    } catch (err: any) {
      error(err.message || 'Gagal memuat rincian transaksi');
    }
  };

  // Cancel Transaction
  const handleCancelSubmit = async () => {
    if (!trxToCancel || !cancelReason) {
      warning('Alasan pembatalan transaksi wajib disertakan');
      return;
    }

    setIsCancelling(true);
    try {
      await api.payments.cancelTransaction(trxToCancel.id, {
        reason: cancelReason,
        user_name: user?.name || 'Fakhrur Rodhi (Super Admin)'
      });
      success(`Transaksi ${trxToCancel.transaction_no} berhasil dibatalkan dan saldo tagihan dikembalikan`);
      setIsCancelModalOpen(false);
      setTrxToCancel(null);
      setCancelReason('');
      loadTransactions();
    } catch (err: any) {
      error(err.message || 'Gagal membatalkan transaksi');
    } finally {
      setIsCancelling(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const headers = ['No Transaksi', 'No Kwitansi', 'Tanggal', 'Jam', 'Santri', 'NIS', 'Kelas', 'Metode Pembayaran', 'Subtotal', 'Diskon', 'Total Bayar', 'Petugas', 'Status', 'Rincian'];
    const rows = transactions.map(t => [
      t.transaction_no,
      t.receipt_no,
      t.date,
      t.time,
      t.student_name,
      t.student_nis,
      t.student_class,
      t.payment_method,
      t.subtotal,
      t.discount,
      t.total_amount,
      t.cashier_name,
      t.status,
      t.item_summary || '-'
    ]);
    exportTableToExcel('DATABASE_TRANSAKSI_IMBS', 'Transaksi Keuangan', headers, rows);
    success('Database transaksi berhasil diekspor ke file Excel');
  };

  const totalRevenue = transactions.filter(t => t.status === 'SUCCESS').reduce((sum, t) => sum + t.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Database Transaksi & Pembukuan Kas
          </h2>
          <p className="text-xs text-slate-500">
            Riwayat seluruh mutasi kas masuk, cetak ulang kwitansi dan audit trail keuangan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari no kwitansi, nama..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Date From */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 shrink-0">Dari:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 shrink-0">Sampai:</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
            />
          </div>

          {/* Method Filter */}
          <select
            value={selectedMethod}
            onChange={e => setSelectedMethod(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
          >
            <option value="">Semua Metode Bayar</option>
            <option value="Tunai">Tunai</option>
            <option value="Transfer BSI">Transfer BSI</option>
            <option value="Transfer BCA">Transfer BCA</option>
            <option value="Transfer Mandiri">Transfer Mandiri</option>
            <option value="QRIS">QRIS</option>
          </select>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
          >
            <option value="">Semua Kelas</option>
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>Kelas {cls}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Summary stats */}
      <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-500">
        <span>Menampilkan {transactions.length} transaksi</span>
        <span className="font-bold text-slate-800 dark:text-slate-200">
          Total Akumulasi Transaksi: <span className="text-brand-600 dark:text-brand-400 font-extrabold">{formatRupiah(totalRevenue)}</span>
        </span>
      </div>

      {/* Transactions Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto overscroll-x-contain -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-[850px] text-xs text-left">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">No Kwitansi & Trx</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tanggal & Jam</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Santri</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Kelas</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Metode</th>
                <th className="py-2.5 px-3">Rincian Pos</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Total Bayar</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Petugas</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Memuat data transaksi...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Belum ada riwayat transaksi yang cocok dengan filter
                  </td>
                </tr>
              ) : (
                transactions.map(trx => (
                  <tr key={trx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-brand-600 dark:text-brand-400 block text-xs">
                        {trx.receipt_no}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {trx.transaction_no}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{formatDateIndo(trx.date)}</div>
                      <div className="text-[10px] text-slate-400">{trx.time} WIB</div>
                    </td>
                    <td className="py-2.5 px-3 max-w-[170px]">
                      <span className="font-bold text-slate-900 dark:text-white block truncate" title={trx.student_name}>
                        {trx.student_name}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        NIS: {trx.student_nis}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                      {trx.student_class}
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {trx.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-[170px] truncate" title={trx.item_summary || 'SPP'}>
                      {trx.item_summary || 'SPP'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                      {formatRupiah(trx.total_amount)}
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-400 text-[11px] max-w-[130px] truncate" title={trx.cashier_name}>
                      {trx.cashier_name}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <Badge status={trx.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(trx.receipt_no)}
                          className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Cetak Kwitansi"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(trx.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Lihat Rincian Item Alokasi"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {trx.status === 'SUCCESS' && (
                          <button
                            type="button"
                            onClick={() => {
                              setTrxToCancel(trx);
                              setCancelReason('');
                              setIsCancelModalOpen(true);
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Batalkan Transaksi (Audit Rollback)"
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

      {/* DETAIL MODAL */}
      {selectedTrxDetail && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Detail Transaksi: ${selectedTrxDetail.transaction_no}`}
          subtitle={`No Kwitansi: ${selectedTrxDetail.receipt_no}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div><span className="text-slate-500">Santri:</span> <span className="font-bold">{selectedTrxDetail.student_name}</span></div>
              <div><span className="text-slate-500">NIS / Kelas:</span> <span>{selectedTrxDetail.student_nis} ({selectedTrxDetail.student_class})</span></div>
              <div><span className="text-slate-500">Tanggal:</span> <span>{formatDateIndo(selectedTrxDetail.date)} {selectedTrxDetail.time} WIB</span></div>
              <div><span className="text-slate-500">Metode Bayar:</span> <span className="font-bold">{selectedTrxDetail.payment_method}</span></div>
              <div><span className="text-slate-500">Petugas:</span> <span>{selectedTrxDetail.cashier_name}</span></div>
              <div><span className="text-slate-500">Catatan:</span> <span>{selectedTrxDetail.notes || '-'}</span></div>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 font-bold">
                Item Tagihan yang Dibayarkan
              </div>
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <tr>
                    <th className="p-2.5">Rincian Pos</th>
                    <th className="p-2.5">Kategori</th>
                    <th className="p-2.5 text-right">Nominal Alokasi</th>
                    <th className="p-2.5 text-right">Sisa Tagihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedTrxDetail.items?.map((it: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold">{it.bill_name}</td>
                      <td className="p-2.5 text-slate-500">{it.category}</td>
                      <td className="p-2.5 text-right font-bold text-brand-600">{formatRupiah(it.amount_allocated)}</td>
                      <td className="p-2.5 text-right">{it.remaining_after === 0 ? <span className="text-emerald-600 font-bold">Lunas</span> : formatRupiah(it.remaining_after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 font-bold text-sm">
              <span>Total Pembayaran:</span>
              <span className="text-brand-600 text-base">{formatRupiah(selectedTrxDetail.total_amount)}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* CANCEL TRANSACTION MODAL (Protected with Reason) */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Konfirmasi Pembatalan Transaksi"
        subtitle="Aksi ini akan mengembalikan saldo tagihan dan tercatat di audit log"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300">
            <p className="font-bold mb-1">Perhatian Penting:</p>
            <p>
              Membatalkan transaksi <strong>{trxToCancel?.receipt_no}</strong> senilai <strong>{formatRupiah(trxToCancel?.total_amount)}</strong> akan mengembalikan saldo tagihan santri menjadi belum lunas kembali.
            </p>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              Alasan Pembatalan Transaksi (Wajib diisi untuk audit) *
            </label>
            <textarea
              rows={3}
              required
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Contoh: Kesalahan input nominal, orang tua membatalkan transfer, dll."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={isCancelling || !cancelReason.trim()}
              onClick={handleCancelSubmit}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50"
            >
              {isCancelling ? 'Membatalkan...' : 'Batalkan Transaksi'}
            </button>
          </div>
        </div>
      </Modal>

      {/* KWITANSI MODAL POPUP */}
      <KwitansiModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        data={selectedReceipt}
      />
    </div>
  );
};
