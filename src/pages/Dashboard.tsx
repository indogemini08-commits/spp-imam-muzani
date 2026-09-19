import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Filter,
  RefreshCw,
  PlusCircle,
  Send,
  Receipt,
  Printer,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';
import { Badge } from '../components/common/Badge';
import { api } from '../services/api';
import { formatRupiah, formatDateIndo } from '../services/terbilang';
import { KwitansiModal } from '../components/kwitansi/KwitansiModal';
import { KwitansiData } from '../services/pdfGenerator';
import { PageView } from '../components/layout/Sidebar';
import { useAvailableClasses } from '../context/SchoolContext';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

interface DashboardProps {
  onNavigate: (page: PageView) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const availableClasses = useAvailableClasses();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<KwitansiData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const fetchStats = async (cls = selectedClass, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const stats = await api.system.getDashboardStats(cls ? { class_name: cls } : {});
      setData(stats);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedClass);
  }, [selectedClass]);

  // Realtime multi-device sync (silent background update)
  useRealtimeSync(() => fetchStats(selectedClass, true));

  const handleOpenReceipt = async (receiptNo: string) => {
    try {
      const receiptData = await api.payments.getReceiptData(receiptNo);
      setSelectedReceipt(receiptData);
      setIsReceiptModalOpen(true);
    } catch (err) {
      console.error('Error opening receipt:', err);
    }
  };

  const metrics = data?.metrics || {
    income_today: 0,
    income_this_month: 0,
    income_this_year: 0,
    total_arrears: 0,
    total_students: 0,
    paid_students_count: 0,
    unpaid_students_count: 0,
    due_bills_count: 0,
    due_bills_amount: 0
  };

  const charts = data?.charts || {
    monthly_trends: [],
    category_breakdown: [],
    income_per_class: [],
    arrears_per_class: [],
    settlement_ratio: []
  };

  const recentTransactions = data?.recent_transactions || [];

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border border-blue-900/60 dark:border-blue-800/80 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Pusat Kendali Keuangan Sekolah Terpadu</span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight mb-2">
            Dashboard Monitoring Pembayaran & Tagihan
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-6">
            Monitoring penerimaan kas harian, bulanan, tagihan jatuh tempo, tunggakan santri, dan rekonsiliasi SPP Imam Muzani Boarding School.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('transaksi_input')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-950/40 transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Input Pembayaran</span>
            </button>

            <button
              onClick={() => onNavigate('fitur_wa_reminder')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 border border-white/20 backdrop-blur-md transition-all"
            >
              <Send className="w-3.5 h-3.5 text-blue-300" />
              <span>Pengingat WhatsApp</span>
            </button>

            <button
              onClick={() => onNavigate('transaksi_tagihan')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-2 border border-white/20 backdrop-blur-md transition-all"
            >
              <Receipt className="w-3.5 h-3.5 text-sky-300" />
              <span>Buku Besar Tagihan</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Filter & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <Filter className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>Filter Tampilan:</span>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Semua Kelas ({availableClasses.join(', ') || 'Semua'})</option>
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>Kelas {cls}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            Terakhir dimuat: {new Date().toLocaleTimeString('id-ID')}
          </span>
          <button
            onClick={() => fetchStats()}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. 8 Card Utama (Grid 4x2 on Desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Penerimaan Hari Ini */}
        <GlassCard hoverEffect className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Hari Ini
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Penerimaan Hari Ini
          </p>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {formatRupiah(metrics.income_today)}
          </h3>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Kas masuk terverifikasi</span>
          </p>
        </GlassCard>

        {/* Card 2: Penerimaan Bulan Ini */}
        <GlassCard hoverEffect className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
              Bulan Berjalan
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Penerimaan Bulan Ini
          </p>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {formatRupiah(metrics.income_this_month)}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Periode {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date())}
          </p>
        </GlassCard>

        {/* Card 3: Total Penerimaan Tahun Berjalan */}
        <GlassCard hoverEffect className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
              T.A. 2026/2027
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total Penerimaan T.A.
          </p>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {formatRupiah(metrics.income_this_year)}
          </h3>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-2 font-medium">
            Akumulasi SPP, Eskul & Daftar Ulang
          </p>
        </GlassCard>

        {/* Card 4: Total Tunggakan */}
        <GlassCard hoverEffect className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
              Perlu Ditagih
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total Nominal Tunggakan
          </p>
          <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {formatRupiah(metrics.total_arrears)}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Melewati tanggal jatuh tempo
          </p>
        </GlassCard>

        {/* Card 5: Jumlah Santri Aktif */}
        <GlassCard hoverEffect className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
              Santri Aktif
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Total Santri Terdaftar
          </p>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {metrics.total_students} Santri
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            {selectedClass ? `Kelas ${selectedClass}` : (availableClasses.length > 0 ? `Kelas ${availableClasses[0]} s.d. ${availableClasses[availableClasses.length - 1]}` : 'Seluruh Tingkat')}
          </p>
        </GlassCard>

        {/* Card 6: Santri Lunas */}
        <GlassCard hoverEffect className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Lunas Sempurna
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Santri Lunas
          </p>
          <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {metrics.paid_students_count} Santri
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Tidak memiliki saldo tunggakan
          </p>
        </GlassCard>

        {/* Card 7: Santri Belum Lunas / Sebagian */}
        <GlassCard hoverEffect className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Ada Sisa Tagihan
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Santri Belum Lunas
          </p>
          <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {metrics.unpaid_students_count} Santri
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Tercatat sisa tagihan di sistem
          </p>
        </GlassCard>

        {/* Card 8: Tagihan Jatuh Tempo */}
        <GlassCard hoverEffect className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
              Jatuh Tempo
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Tagihan Jatuh Tempo
          </p>
          <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {metrics.due_bills_count} Pos ({formatRupiah(metrics.due_bills_amount)})
          </h3>
          <p className="text-[11px] text-rose-500 mt-2 font-medium">
            Kirim pengingat WhatsApp
          </p>
        </GlassCard>
      </div>

      {/* 4. Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Tren Penerimaan 12 Bulan (8 Cols) */}
        <GlassCard className="lg:col-span-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tren Penerimaan Kas 12 Bulan (Juli 2026 - Juni 2027)
              </h3>
              <p className="text-xs text-slate-500">
                Pola realisasi penerimaan pembayaran sekolah tahun ajaran berjalan
              </p>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-64 flex items-end gap-2 pt-6 pb-2 px-2">
            {charts.monthly_trends.map((m: any, idx: number) => {
              const maxVal = Math.max(...charts.monthly_trends.map((t: any) => t.amount), 50000000);
              const heightPercent = Math.max(8, Math.round((m.amount / maxVal) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold">
                    {formatRupiah(m.amount)}
                  </div>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-blue-900 to-indigo-600 group-hover:from-blue-800 group-hover:to-indigo-500 transition-all shadow-md shadow-blue-900/30"
                  />
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mt-2 truncate max-w-[36px]">
                    {m.month.substring(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Chart 2: Penerimaan berdasarkan Kategori Tagihan (4 Cols) */}
        <GlassCard className="lg:col-span-4 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Distribusi Kategori Pembayaran
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Proporsi kas masuk per kategori tagihan
            </p>

            <div className="space-y-3">
              {charts.category_breakdown.map((cat: any, idx: number) => {
                const totalIncome = charts.category_breakdown.reduce((sum: number, c: any) => sum + c.total, 0) || 1;
                const percent = Math.round((cat.total / totalIncome) * 100);

                const colors = [
                  'bg-brand-500 text-brand-500',
                  'bg-blue-500 text-blue-500',
                  'bg-indigo-500 text-indigo-500',
                  'bg-amber-500 text-amber-500'
                ];
                const colorClass = colors[idx % colors.length];

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {cat.category === 'SPP' ? 'SPP Bulanan' : cat.category === 'ESKUL' ? 'Kegiatan Eskul' : cat.category === 'DAFTAR_ULANG' ? 'Daftar Ulang' : cat.category}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(cat.total)} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`h-full rounded-full ${colorClass.split(' ')[0]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs">
            <span className="text-slate-500">Rasio Santri Lunas:</span>
            <div className="flex items-center justify-between font-bold text-brand-600 dark:text-brand-400 mt-0.5">
              <span>{metrics.paid_students_count} dari {metrics.total_students} Santri Lunas</span>
              <span>{Math.round((metrics.paid_students_count / (metrics.total_students || 1)) * 100)}%</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 5. Kelas Comparison Charts (Penerimaan vs Tunggakan) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Penerimaan per Kelas */}
        <GlassCard className="p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Penerimaan Kas per Kelas
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Realisasi pembayaran santri per tingkatan kelas
          </p>

          <div className="space-y-2.5">
            {charts.income_per_class.map((c: any, idx: number) => {
              const maxIncome = Math.max(...charts.income_per_class.map((item: any) => item.total), 1);
              const percent = Math.round((c.total / maxIncome) * 100);

              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="w-16 font-bold text-slate-700 dark:text-slate-300 shrink-0">
                    Kelas {c.class_name}
                  </span>
                  <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className="h-full bg-gradient-to-r from-blue-900 to-indigo-600 rounded-full"
                    />
                  </div>
                  <span className="w-24 text-right font-bold text-slate-900 dark:text-white shrink-0">
                    {formatRupiah(c.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Tunggakan per Kelas */}
        <GlassCard className="p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Tunggakan Belum Terbayar per Kelas
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Beban tunggakan yang perlu ditindaklanjuti bendahara
          </p>

          <div className="space-y-2.5">
            {charts.arrears_per_class.map((c: any, idx: number) => {
              const maxArrears = Math.max(...charts.arrears_per_class.map((item: any) => item.total), 1);
              const percent = Math.round((c.total / maxArrears) * 100);

              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="w-16 font-bold text-slate-700 dark:text-slate-300 shrink-0">
                    Kelas {c.class_name}
                  </span>
                  <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                    />
                  </div>
                  <span className="w-24 text-right font-bold text-rose-600 dark:text-rose-400 shrink-0">
                    {formatRupiah(c.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* 6. Transaksi Terbaru Table */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Transaksi Pembayaran Terbaru
            </h3>
            <p className="text-xs text-slate-500">
              Pencatatan real-time kas masuk dari santri dan orang tua
            </p>
          </div>

          <button
            onClick={() => onNavigate('transaksi_database')}
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            <span>Lihat Seluruh Transaksi</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">No Transaksi</th>
                <th className="py-3 px-4">Tanggal & Jam</th>
                <th className="py-3 px-4">Santri</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Rincian Pembayaran</th>
                <th className="py-3 px-4 text-right">Total Bayar</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Belum ada transaksi pembayaran yang tercatat
                  </td>
                </tr>
              ) : (
                recentTransactions.map((trx: any) => (
                  <tr key={trx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-brand-600 dark:text-brand-400">
                        {trx.receipt_no}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {trx.transaction_no}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div>{formatDateIndo(trx.date)}</div>
                      <div className="text-[10px] text-slate-400">{trx.time} WIB</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {trx.student_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        NIS: {trx.student_nis}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      Kelas {trx.student_class}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {trx.item_summary || 'SPP & Tagihan'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatRupiah(trx.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge status="LUNAS" size="sm" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenReceipt(trx.receipt_no)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all shadow-sm"
                        title="Lihat & Cetak Kwitansi"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Kwitansi</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Kwitansi Modal Popup */}
      <KwitansiModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        data={selectedReceipt}
      />
    </div>
  );
};
