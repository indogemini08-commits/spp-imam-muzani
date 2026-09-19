import React, { useState, useEffect } from 'react';
import { Sparkles, Download, Printer, Filter, Search, CheckCircle2, AlertCircle, ShoppingBag, Users, Eye, CreditCard, FileText } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { ReportPrintHeader } from '../../components/laporan/ReportPrintHeader';
import { ReportPrintFooter } from '../../components/laporan/ReportPrintFooter';
import { ReportPdfModal } from '../../components/laporan/ReportPdfModal';
import { PageView } from '../../components/layout/Sidebar';
import { useAvailableClasses } from '../../context/SchoolContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

interface TagihanKhususRow {
  id: string;
  student_id: string;
  bill_name: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: string;
  created_at: string;
  student_name: string;
  student_nis: string;
  class_name: string;
  parent_phone?: string;
  father_name?: string;
  item_title: string;
  item_category: string;
  status_label: string;
}

const KHUSUS_CATEGORIES = [
  'Semua Kategori',
  'Kebutuhan Asrama',
  'Seragam & Busana',
  'Kitab & Buku',
  'Perlengkapan Kamar',
  'Laundry & Sanitasi',
  'Lainnya'
];

interface LaporanTagihanKhususProps {
  onNavigate?: (page: PageView) => void;
}

export const LaporanTagihanKhusus: React.FC<LaporanTagihanKhususProps> = ({ onNavigate }) => {
  const [rows, setRows] = useState<TagihanKhususRow[]>([]);
  const [summary, setSummary] = useState({
    total_nominal: 0,
    total_terbayar: 0,
    total_kurang: 0,
    count_items: 0,
    count_santri: 0,
    count_lunas: 0,
    count_belum_lunas: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [search, setSearch] = useState('');
  const [selectedDetailRow, setSelectedDetailRow] = useState<any>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const availableClasses = useAvailableClasses();
  const { success, error } = useNotification();

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedClass) params.class_name = selectedClass;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedCategory && selectedCategory !== 'Semua Kategori') params.category = selectedCategory;
      if (search.trim()) params.search = search.trim();

      const res = await api.reports.getTagihanKhusus(params);
      setRows(res.grouped_rows || res.rows || []);
      setSummary(res.summary || {
        total_nominal: 0,
        total_terbayar: 0,
        total_kurang: 0,
        count_items: 0,
        count_santri: 0,
        count_lunas: 0,
        count_belum_lunas: 0
      });
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat laporan tagihan khusus');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useRealtimeSync(() => {
    loadData(true);
  });

  useEffect(() => {
    loadData(false);
  }, [selectedClass, selectedStatus, selectedCategory, search]);

  const handleExportExcel = () => {
    if (rows.length === 0) return;
    const headers = [
      'No',
      'NIS',
      'Nama Santri',
      'Kelas',
      'Rincian Tagihan & Kebutuhan',
      'Kategori',
      'Jatuh Tempo',
      'Total Biaya (Rp)',
      'Terbayar (Rp)',
      'Sisa Tagihan (Rp)',
      'Status'
    ];

    const exportRows = rows.map((r: any, i) => [
      i + 1,
      r.student_nis,
      r.student_name,
      r.class_name,
      r.items && r.items.length > 0
        ? r.items.map((it: any) => `${it.item_title} (${formatRupiah(it.amount)})`).join('; ')
        : r.item_title,
      r.item_category,
      r.due_date ? formatDateIndo(r.due_date) : '-',
      r.amount || 0,
      r.paid_amount || 0,
      r.remaining_amount || 0,
      r.status_label
    ]);

    exportTableToExcel('LAPORAN_TAGIHAN_KHUSUS_IMBS', 'Tagihan Khusus', headers, exportRows);
    success('Laporan tagihan khusus berhasil diekspor ke Excel (.xlsx)');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Official Letterhead Header (Only in Print) */}
      <ReportPrintHeader
        title="LAPORAN RINCIAN TAGIHAN KHUSUS SANTRI"
        subtitle="Rekapitulasi Kebutuhan Personal Santri: Seragam, Kitab, Kasur, Peci, Asrama, & Perlengkapan"
        filterInfo={`${selectedClass ? 'Kelas: ' + selectedClass : 'Semua Kelas'}${selectedCategory !== 'Semua Kategori' ? ' • Kategori: ' + selectedCategory : ''}${selectedStatus ? ' • Status: ' + selectedStatus : ''}`}
        summaryMetrics={[
          { label: 'Total Santri Pemesan', value: `${summary.count_santri} Santri` },
          { label: 'Total Tagihan Khusus', value: formatRupiah(summary.total_nominal) },
          { label: 'Realisasi Diterima', value: formatRupiah(summary.total_terbayar) },
          { label: 'Sisa Piutang Khusus', value: formatRupiah(summary.total_kurang), highlight: true }
        ]}
      />

      {/* Screen Header & Action Bar (Hidden in Print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>Laporan Tagihan Khusus Santri</span>
            </h2>
            <p className="text-xs text-slate-500">
              Rekapitulasi tagihan kebutuhan personal santri (seragam, perlengkapan asrama, kitab, sanitasi) beserta status pembayarannya
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Simpan PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-4 border-purple-500/30 bg-purple-500/5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">Total Tagihan Khusus</span>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                  {formatRupiah(summary.total_nominal)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-700 dark:text-purple-300">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Akumulasi dari <strong className="text-slate-700 dark:text-slate-300">{summary.count_items}</strong> item kebutuhan santri
            </p>
          </GlassCard>

          <GlassCard className="p-4 border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Realisasi Penerimaan</span>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatRupiah(summary.total_terbayar)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              <strong className="text-emerald-600 dark:text-emerald-400">{summary.count_lunas}</strong> item telah lunas terbayar
            </p>
          </GlassCard>

          <GlassCard className="p-4 border-rose-500/30 bg-rose-500/5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">Sisa Piutang Khusus</span>
                <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                  {formatRupiah(summary.total_kurang)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              <strong className="text-rose-600 dark:text-rose-400">{summary.count_belum_lunas}</strong> item belum terselesaikan
            </p>
          </GlassCard>

          <GlassCard className="p-4 border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">Total Santri Terdata</span>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                  {summary.count_santri} <span className="text-xs font-semibold text-slate-400">Santri</span>
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-700 dark:text-blue-300">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Santri yang memiliki catatan tagihan khusus
            </p>
          </GlassCard>
        </div>

        {/* Filter Controls Bar */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Filter Kelas */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter Kelas:
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
              >
                <option value="">Semua Kelas</option>
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Status Pelunasan:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
              >
                <option value="">Semua Status</option>
                <option value="BELUM_LUNAS">Belum Lunas / Sebagian</option>
                <option value="TUNGGAKAN">Lewat Jatuh Tempo (Tunggakan)</option>
                <option value="LUNAS">Sudah Lunas</option>
              </select>
            </div>

            {/* Filter Kategori */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Kategori Kebutuhan:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
              >
                {KHUSUS_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Pencarian Cepat:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari santri, NIS, atau item..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Main Report Table - Fullframe No Horizontal Scroll */}
      <GlassCard className="overflow-hidden border border-slate-200/80 dark:border-slate-800 print:border-none print:shadow-none">
        <div className="w-full overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[850px] table-auto text-left text-xs border-collapse print:text-[10px]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 print:bg-[#0f2744] print:text-white">
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">No</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap print:bg-[#0f2744]">NIS</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap print:bg-[#0f2744]">Nama Santri</th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">Kelas</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap print:bg-[#0f2744]">Rincian Kebutuhan & Pos Tagihan</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">Total Biaya</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap text-emerald-600 dark:text-emerald-400 print:bg-[#0f2744] print:text-white">Terbayar</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap bg-slate-100/50 dark:bg-slate-800/50 print:bg-[#0f2744] print:text-white">Sisa Tagihan</th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">Status</th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap no-print print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Memuat data tagihan khusus...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ada data tagihan khusus santri ditemukan.
                  </td>
                </tr>
              ) : (
                rows.map((row: any, idx) => (
                  <tr key={row.student_id || row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-2 text-center font-medium text-slate-400 align-middle text-xs whitespace-nowrap">{idx + 1}</td>
                    <td className="py-2 px-2.5 font-semibold text-slate-700 dark:text-slate-200 align-middle text-xs whitespace-nowrap">{row.student_nis}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white align-middle whitespace-nowrap">
                      <div className="font-semibold text-xs whitespace-nowrap" title={row.student_name}>
                        {row.student_name}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] print:bg-transparent print:p-0 font-medium whitespace-nowrap">
                        {row.class_name}
                      </span>
                    </td>
                    <td className="py-2 px-3 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80 font-bold text-[10px] whitespace-nowrap">
                          {row.items?.length || 1} Item
                        </span>
                        <div className="whitespace-nowrap">
                          <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold block whitespace-nowrap" title={row.items && row.items.length > 0 ? row.items.map((it: any) => it.item_title).join(', ') : row.item_title}>
                            {row.items && row.items.length > 0
                              ? `${row.items[0]?.item_title}${row.items.length > 1 ? ` (+${row.items.length - 1} lainnya)` : ''}`
                              : row.item_title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal block whitespace-nowrap">
                            {row.item_category} {row.due_date ? `• Tempo: ${formatDateIndo(row.due_date)}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white align-middle text-xs whitespace-nowrap">
                      {formatRupiah(row.amount)}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 align-middle text-xs whitespace-nowrap">
                      {formatRupiah(row.paid_amount)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white align-middle text-xs bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                      {row.remaining_amount > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">{formatRupiah(row.remaining_amount)}</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Rp 0</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                      <span
                        className={`print-status-tag text-[10px] whitespace-nowrap ${
                          row.status_label === 'Lunas'
                            ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                            : row.status_label === 'Sebagian'
                            ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                            : 'border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950/40'
                        }`}
                      >
                        {row.status_label}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center align-middle no-print print:hidden whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailRow(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-lg text-[11px] font-semibold transition-all border border-purple-200 dark:border-purple-800 cursor-pointer shadow-sm"
                        title="Lihat Detail Rincian Tagihan Khusus"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="hidden print:table-footer-group">
                <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-100/70 dark:bg-slate-800/70 text-slate-900 dark:text-white">
                  <td colSpan={5} className="py-3 px-3 text-center uppercase tracking-wider font-extrabold text-[10px] whitespace-nowrap">
                    Total Keseluruhan ({rows.length} Santri Terdata)
                  </td>
                  <td className="py-3 px-3 text-right text-slate-900 dark:text-white font-extrabold text-xs whitespace-nowrap">
                    {formatRupiah(summary.total_nominal)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 font-extrabold text-xs whitespace-nowrap">
                    {formatRupiah(summary.total_terbayar)}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400 bg-slate-200/50 dark:bg-slate-800 font-extrabold text-xs whitespace-nowrap">
                    {formatRupiah(summary.total_kurang)}
                  </td>
                  <td className="py-3 px-3 text-center text-xs whitespace-nowrap">
                    {summary.total_kurang === 0 ? 'Lunas' : 'Belum Lunas'}
                  </td>
                  <td className="no-print print:hidden"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </GlassCard>

      {/* PDF PREVIEW MODAL */}
      <ReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="LAPORAN RINCIAN TAGIHAN KHUSUS SANTRI"
        subtitle="Rekapitulasi Kebutuhan Personal Santri: Seragam, Kitab, Kasur, Peci, Asrama, & Perlengkapan"
        filterInfo={`${selectedClass ? 'Kelas: ' + selectedClass : 'Semua Kelas'}${selectedCategory !== 'Semua Kategori' ? ' • Kategori: ' + selectedCategory : ''}${selectedStatus ? ' • Status: ' + selectedStatus : ''}`}
        summaryMetrics={[
          { label: 'Total Santri Pemesan', value: `${summary.count_santri} Santri` },
          { label: 'Total Tagihan Khusus', value: formatRupiah(summary.total_nominal) },
          { label: 'Realisasi Diterima', value: formatRupiah(summary.total_terbayar) },
          { label: 'Sisa Piutang Khusus', value: formatRupiah(summary.total_kurang), highlight: true }
        ]}
        fileName={`LAPORAN_TAGIHAN_KHUSUS_${selectedClass || 'SEMUA'}`}
      >
        <div className="w-full">
          <table className="w-full table-fixed text-left text-[8pt] border-collapse border border-slate-300">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '25%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <thead className="bg-[#0f2744] text-white font-bold">
              <tr>
                <th className="py-2 px-1 text-center border border-slate-400">No</th>
                <th className="py-2 px-2 text-center border border-slate-400">NIS</th>
                <th className="py-2 px-2.5 text-left border border-slate-400">Nama Santri</th>
                <th className="py-2 px-1 text-center border border-slate-400">Kelas</th>
                <th className="py-2 px-2 text-left border border-slate-400">Rincian Kebutuhan</th>
                <th className="py-2 px-2 text-right border border-slate-400">Total Biaya</th>
                <th className="py-2 px-2 text-right border border-slate-400">Terbayar</th>
                <th className="py-2 px-2 text-right border border-slate-400">Sisa Tagihan</th>
                <th className="py-2 px-1 text-center border border-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row: any, idx) => (
                <tr key={row.student_id || row.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="py-1.5 px-1 text-center text-slate-500 border border-slate-300">{idx + 1}</td>
                  <td className="py-1.5 px-2 text-center font-medium text-slate-800 border border-slate-300">{row.student_nis}</td>
                  <td className="py-1.5 px-2.5 font-bold text-slate-900 border border-slate-300 truncate" title={row.student_name}>{row.student_name}</td>
                  <td className="py-1.5 px-1 text-center font-semibold text-slate-700 border border-slate-300">{row.class_name}</td>
                  <td className="py-1.5 px-2 border border-slate-300 overflow-hidden">
                    <div className="font-semibold text-slate-900 text-[8pt] line-clamp-2 leading-tight">
                      {row.items && row.items.length > 0
                        ? row.items.map((it: any) => `${it.item_title} (${formatRupiah(it.amount)})`).join('; ')
                        : row.item_title}
                    </div>
                    <div className="text-[7pt] text-slate-500 mt-0.5 truncate">
                      {row.item_category} {row.due_date ? `• Tempo: ${formatDateIndo(row.due_date)}` : ''}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-slate-900 border border-slate-300">
                    {formatRupiah(row.amount)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-emerald-800 border border-slate-300">
                    {formatRupiah(row.paid_amount)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold border border-slate-300">
                    {row.remaining_amount > 0 ? (
                      <span className="text-rose-700">{formatRupiah(row.remaining_amount)}</span>
                    ) : (
                      <span className="text-emerald-700">Rp 0</span>
                    )}
                  </td>
                  <td className="py-1.5 px-1 text-center border border-slate-300">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[7.5pt] font-bold border ${
                      row.status_label === 'Lunas'
                        ? 'border-emerald-600 text-emerald-800 bg-emerald-50'
                        : row.status_label === 'Sebagian'
                        ? 'border-amber-600 text-amber-800 bg-amber-50'
                        : 'border-rose-600 text-rose-800 bg-rose-50'
                    }`}>
                      {row.status_label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-800 font-bold text-slate-900">
              <tr>
                <td colSpan={5} className="py-2.5 px-3 text-center uppercase tracking-wider font-extrabold text-[9pt] border border-slate-300 whitespace-nowrap">
                  Total Keseluruhan ({rows.length} Santri Terdata)
                </td>
                <td className="py-2.5 px-3 text-right font-extrabold text-[9.5pt] text-slate-950 border border-slate-300 whitespace-nowrap">
                  {formatRupiah(summary.total_nominal)}
                </td>
                <td className="py-2.5 px-3 text-right font-extrabold text-[9.5pt] text-emerald-800 border border-slate-300 whitespace-nowrap">
                  {formatRupiah(summary.total_terbayar)}
                </td>
                <td className="py-2.5 px-3 text-right font-extrabold text-[9.5pt] text-rose-800 border border-slate-300 whitespace-nowrap">
                  {formatRupiah(summary.total_kurang)}
                </td>
                <td className="py-2.5 px-2 text-center text-[9pt] border border-slate-300 whitespace-nowrap">
                  {summary.total_kurang === 0 ? 'Lunas' : 'Belum Lunas'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportPdfModal>

      {/* DETAIL MODAL UNTUK MELIHAT RINCIAN DOKUMEN TAGIHAN KHUSUS */}
      {selectedDetailRow && (
        <Modal
          isOpen={!!selectedDetailRow}
          onClose={() => setSelectedDetailRow(null)}
          title="Rincian Dokumen Tagihan Khusus Santri"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {/* Header Profil Santri */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedDetailRow.student_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  NIS: {selectedDetailRow.student_nis} • Kelas: {selectedDetailRow.class_name} • Wali: {selectedDetailRow.father_name || 'Orang Tua / Wali'} ({selectedDetailRow.parent_phone || '-'})
                </p>
              </div>
              <Badge status={selectedDetailRow.status} size="md" />
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Total Beban Biaya</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatRupiah(selectedDetailRow.amount)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">Telah Diterima</span>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {formatRupiah(selectedDetailRow.paid_amount)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-rose-700 dark:text-rose-300 font-medium">Sisa Piutang</span>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                  {formatRupiah(selectedDetailRow.remaining_amount)}
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">No</th>
                    <th className="py-2.5 px-3">Nama Tagihan / Kebutuhan</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-right">Biaya</th>
                    <th className="py-2.5 px-3 text-right">Terbayar</th>
                    <th className="py-2.5 px-3 text-right">Sisa</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedDetailRow.items && selectedDetailRow.items.length > 0 ? (
                    selectedDetailRow.items.map((it: any, idx: number) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {it.item_title || it.bill_name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {it.item_category || 'Kebutuhan Santri'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatRupiah(it.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatRupiah(it.paid_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                          {formatRupiah(it.remaining_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`print-status-tag ${
                              it.status === 'LUNAS'
                                ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                                : it.paid_amount > 0
                                ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                                : 'border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950/40'
                            }`}
                          >
                            {it.status === 'LUNAS' ? 'Lunas' : it.paid_amount > 0 ? 'Sebagian' : 'Belum Lunas'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5 px-3 text-center text-slate-400">1</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {selectedDetailRow.item_title}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {selectedDetailRow.item_category}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatRupiah(selectedDetailRow.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatRupiah(selectedDetailRow.paid_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatRupiah(selectedDetailRow.remaining_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="print-status-tag border-rose-500 text-rose-700 bg-rose-50">
                          {selectedDetailRow.status_label}
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">
                Total Biaya: <strong className="text-slate-800 dark:text-slate-200">{formatRupiah(selectedDetailRow.amount)}</strong>
              </span>

              <div className="flex items-center gap-2">
                {selectedDetailRow.remaining_amount > 0 && onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('selected_payment_student_id', selectedDetailRow.student_id);
                      setSelectedDetailRow(null);
                      onNavigate('transaksi_input');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-blue-900/20"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Bayar di Kasir</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDetailRow(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Signature Footer for Printed Reports */}
      <ReportPrintFooter />
    </div>
  );
};
