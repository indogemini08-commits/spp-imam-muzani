import React, { useState, useEffect } from 'react';
import { Search, User, Receipt, CreditCard, ChevronRight, X } from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { Badge } from './Badge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent?: (studentId: string) => void;
  onSelectTransaction?: (receiptNo: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStudent,
  onSelectTransaction
}) => {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setStudents([]);
      setTransactions([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setStudents([]);
      setTransactions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const [stdRes, trxRes] = await Promise.all([
          api.students.getAll({ search: query }),
          api.payments.getTransactions({ search: query, limit: '5' })
        ]);
        setStudents(stdRes.slice(0, 5));
        setTransactions(trxRes.slice(0, 5));
      } catch (err) {
        console.error('Error in global search:', err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex items-start justify-center pt-20 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" />

      {/* Palette Container */}
      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-brand-600 dark:text-brand-400 mr-3 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ketik nama santri, NIS, no kwitansi, atau no transaksi..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-block ml-3 px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3 divide-y divide-slate-100 dark:divide-slate-800/60">
          {isLoading && (
            <div className="py-8 text-center text-xs text-slate-400">
              Mencari data ke database...
            </div>
          )}

          {!isLoading && query && students.length === 0 && transactions.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Tidak ditemukan data yang cocok dengan "{query}"
            </div>
          )}

          {!query && (
            <div className="py-6 text-center text-xs text-slate-400">
              Cari data apa saja di sistem keuangan Imam Muzani
            </div>
          )}

          {/* Students Category */}
          {students.length > 0 && (
            <div className="py-2">
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-brand-500" />
                <span>Santri / Siswa ({students.length})</span>
              </div>
              <div className="mt-1 space-y-1">
                {students.map(s => (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (onSelectStudent) onSelectStudent(s.id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {s.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        NIS: {s.nis} | Kelas {s.class_name} | {s.spp_type_name || 'SPP'}
                      </p>
                    </div>
                    <Badge status={s.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Category */}
          {transactions.length > 0 && (
            <div className="py-2">
              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <Receipt className="w-3.5 h-3.5 text-blue-500" />
                <span>Transaksi & Kwitansi ({transactions.length})</span>
              </div>
              <div className="mt-1 space-y-1">
                {transactions.map(t => (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (onSelectTransaction) onSelectTransaction(t.receipt_no);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-brand-600 dark:text-brand-400">
                          {t.receipt_no}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {t.transaction_no}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {t.student_name} (Kelas {t.student_class}) • {formatDateIndo(t.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {formatRupiah(t.total_amount)}
                      </p>
                      <span className="text-[10px] text-slate-400">{t.payment_method}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
