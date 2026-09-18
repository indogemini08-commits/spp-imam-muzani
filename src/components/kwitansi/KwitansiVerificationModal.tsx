import React from 'react';
import { ShieldCheck, CheckCircle2, Building2, Calendar, User, CreditCard, X, QrCode } from 'lucide-react';
import { KwitansiData } from '../../services/pdfGenerator';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';

interface KwitansiVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: KwitansiData | null;
}

export const KwitansiVerificationModal: React.FC<KwitansiVerificationModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header Security Badge */}
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-9 h-9 text-blue-300" />
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-extrabold mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>TERVERIFIKASI SAH & RESMI</span>
          </span>

          <h3 className="text-lg font-black tracking-tight">
            BUKTI VERIFIKASI KEASLIAN KWITANSI
          </h3>
          <p className="text-xs text-blue-200 mt-0.5">
            {data.school.name}
          </p>
        </div>

        {/* Verification Details */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-800/60">
            <p className="text-[11px] text-blue-900 dark:text-blue-300 font-bold mb-1 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5" />
              <span>Validasi Database Sistem:</span>
            </p>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              Dokumen ini dinyatakan <strong>ASLI</strong> dan tercatat resmi pada sistem pembukuan keuangan Imam Muzani Boarding School dengan rincian transaksi sebagai berikut:
            </p>
          </div>

          <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 font-medium">Nomor Kwitansi:</span>
              <span className="font-extrabold font-mono text-blue-900 dark:text-blue-300">
                {data.transaction.receipt_no}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 font-medium">Nomor Transaksi:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {data.transaction.transaction_no}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 font-medium">Nama Santri:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {data.transaction.student_name}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 font-medium">NIS / Kelas:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {data.transaction.student_nis} / {data.transaction.student_class}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 font-medium">Tanggal Pembayaran:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatDateIndo(data.transaction.date)} ({data.transaction.time})
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 font-medium">Metode Pembayaran:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {data.transaction.payment_method}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-500 font-medium">Petugas Penerima:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {data.transaction.cashier_name}
              </span>
            </div>

            <div className="flex justify-between py-2 items-center bg-slate-50 dark:bg-slate-800/60 px-3 rounded-xl">
              <span className="text-slate-700 dark:text-slate-300 font-bold">TOTAL DIBAYAR:</span>
              <span className="text-base font-black text-blue-900 dark:text-blue-300">
                {formatRupiah(data.transaction.total_amount)}
              </span>
            </div>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-900/20"
            >
              Tutup Verifikasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
