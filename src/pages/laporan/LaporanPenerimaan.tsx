import React, { useState, useEffect } from 'react';
import { TrendingUp, Download, Printer, Filter, Calendar, FileText } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { useAvailableClasses } from '../../context/SchoolContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { ReportPrintHeader } from '../../components/laporan/ReportPrintHeader';
import { ReportPrintFooter } from '../../components/laporan/ReportPrintFooter';
import { ReportPdfModal } from '../../components/laporan/ReportPdfModal';

export const LaporanPenerimaan: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const availableClasses = useAvailableClasses();
  const { success, error } = useNotification();

  const loadReport = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.reports.getPenerimaan({
        class_name: selectedClass,
        date_from: dateFrom,
        date_to: dateTo
      });
      setReportData(data);
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat laporan penerimaan');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useRealtimeSync(() => {
    loadReport(true);
  });

  useEffect(() => {
    loadReport(false);
  }, [selectedClass, dateFrom, dateTo]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!reportData) return;
    const headers = ['Kelas', ...reportData.columns.map((c: any) => c.label), 'TOTAL PENERIMAAN'];
    const rows = reportData.rows.map((r: any) => [
      `Kelas ${r.class_name}`,
      ...reportData.columns.map((c: any) => r[c.key] || 0),
      r.total || 0
    ]);
    // Grand total row
    rows.push([
      'GRAND TOTAL',
      ...reportData.columns.map((c: any) => reportData.grandTotals[c.key] || 0),
      reportData.grandTotals.total || 0
    ]);

    exportTableToExcel('LAPORAN_PENERIMAAN_KAS_IMBS', 'Penerimaan Kas', headers, rows);
    success('Laporan penerimaan kas berhasil diekspor ke Excel');
  };

  const handlePrint = () => {
    window.print();
  };

  const columns = reportData?.columns || [];
  const rows = reportData?.rows || [];
  const grandTotals = reportData?.grandTotals || {};

  return (
    <div className="space-y-6">
      {/* Printable Official Letterhead Header (Only in Print) */}
      <ReportPrintHeader
        title="LAPORAN PENERIMAAN KAS (KOLOM DINAMIS)"
        subtitle="Rekapitulasi Penerimaan Kas Per Tingkat Kelas Berdasarkan Seluruh Pos Tagihan Aktif"
        filterInfo={`${selectedClass ? 'Kelas ' + selectedClass : 'Semua Kelas'}${dateFrom || dateTo ? ' • Periode: ' + (dateFrom || 'Awal') + ' s.d. ' + (dateTo || 'Sekarang') : ''}`}
        summaryMetrics={[
          { label: 'Total Tingkat Kelas', value: `${rows.length} Kelas` },
          { label: 'Pos Tagihan Aktif', value: `${columns.length} Pos` },
          { label: 'Total Penerimaan Kas', value: formatRupiah(grandTotals.total || 0), highlight: true }
        ]}
      />

      {/* Screen Header (Hidden in Print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Laporan Penerimaan Kas (Kolom Dinamis)
          </h2>
          <p className="text-xs text-slate-500">
            Rekapitulasi penerimaan kas per kelas mengikuti seluruh jenis pos tagihan aktif yang dibuat
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
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
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

      {/* Filter Bar (Hidden in Print) */}
      <div className="no-print">
        <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Filter Kelas:</span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:outline-none"
            >
              <option value="">Semua Kelas</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Rentang Tanggal:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
            />
            <span className="text-slate-400">s.d.</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
            />
          </div>

          {(selectedClass || dateFrom || dateTo) && (
            <button
              onClick={() => { setSelectedClass(''); setDateFrom(''); setDateTo(''); }}
              className="px-2.5 py-1 text-slate-500 hover:text-rose-500 text-xs font-semibold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </GlassCard>
      </div>

      {/* Dynamic Columns Report Table */}
      <GlassCard className="p-0 overflow-hidden shadow-sm print:shadow-none print:border-none">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[750px] table-auto text-xs text-left border-collapse print-report-table">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 print:static print:bg-[#0f2744]">Tingkat Kelas</th>
                {columns.map((col: any) => (
                  <th key={col.key} className="py-3 px-4 text-right whitespace-nowrap print:bg-[#0f2744]">
                    {col.label}
                  </th>
                ))}
                <th className="py-3 px-4 text-right whitespace-nowrap bg-brand-50/50 dark:bg-brand-950/20 font-black text-brand-700 dark:text-brand-400 print:bg-[#0f2744] print:text-white">
                  TOTAL KELAS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-8 text-center text-slate-400">
                    Mengkalkulasi penerimaan kas...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="py-8 text-center text-slate-400">
                    Tidak ada data penerimaan untuk filter ini
                  </td>
                </tr>
              ) : (
                rows.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap sticky left-0 bg-white/95 dark:bg-slate-900/95 print:static">
                      Kelas {r.class_name}
                    </td>
                    {columns.map((col: any) => {
                      const val = r[col.key] || 0;
                      return (
                        <td key={col.key} className={`py-3 px-4 text-right whitespace-nowrap ${val > 0 ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                          {val > 0 ? formatRupiah(val) : '-'}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-black text-slate-900 dark:text-white bg-brand-50/20 dark:bg-brand-950/10">
                      {formatRupiah(r.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Grand Total Footer */}
            {rows.length > 0 && (
              <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-black border-t-2 border-slate-300 dark:border-slate-600">
                <tr>
                  <td className="py-3.5 px-4 text-slate-900 dark:text-white whitespace-nowrap sticky left-0 bg-slate-100 dark:bg-slate-800 print:static">
                    GRAND TOTAL
                  </td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="py-3.5 px-4 text-right whitespace-nowrap text-brand-700 dark:text-brand-400">
                      {formatRupiah(grandTotals[col.key] || 0)}
                    </td>
                  ))}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap text-base text-brand-600 dark:text-brand-300 bg-brand-100/60 dark:bg-brand-950/60">
                    {formatRupiah(grandTotals.total || 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </GlassCard>

      {/* Official Signatures & Verification (Only in Print) */}
      <ReportPrintFooter />

      {/* PDF PREVIEW MODAL */}
      <ReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="LAPORAN PENERIMAAN KAS (KOLOM DINAMIS)"
        subtitle="Rekapitulasi Penerimaan Kas Per Tingkat Kelas Berdasarkan Seluruh Pos Tagihan Aktif"
        filterInfo={`${selectedClass ? 'Kelas ' + selectedClass : 'Semua Kelas'}${dateFrom || dateTo ? ' • Periode: ' + (dateFrom || 'Awal') + ' s.d. ' + (dateTo || 'Sekarang') : ''}`}
        summaryMetrics={[
          { label: 'Total Tingkat Kelas', value: `${rows.length} Kelas` },
          { label: 'Pos Tagihan Aktif', value: `${columns.length} Pos` },
          { label: 'Total Penerimaan Kas', value: formatRupiah(grandTotals.total || 0), highlight: true }
        ]}
        fileName={`LAPORAN_PENERIMAAN_KAS_${selectedClass || 'SEMUA'}`}
        wideContent={columns.length >= 5}
      >
        <div className="w-full">
          <table className="table-auto w-full text-left text-[9pt] border-collapse border border-slate-300">
            <thead className="bg-[#0f2744] text-white font-bold">
              <tr>
                <th className="py-2.5 px-3 border border-slate-400 whitespace-nowrap">Tingkat Kelas</th>
                {columns.map((col: any) => (
                  <th key={col.key} className="py-2.5 px-3 text-right whitespace-nowrap border border-slate-400">
                    {col.label}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right whitespace-nowrap border border-slate-400">
                  TOTAL KELAS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r: any, idx: number) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="py-2 px-3 font-bold text-slate-900 border border-slate-300 whitespace-nowrap">
                    Kelas {r.class_name}
                  </td>
                  {columns.map((col: any) => {
                    const val = r[col.key] || 0;
                    return (
                      <td key={col.key} className="py-2 px-3 text-right whitespace-nowrap border border-slate-300">
                        {val > 0 ? (
                          <span className="font-semibold text-slate-800">{formatRupiah(val)}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right font-black text-slate-950 border border-slate-300 whitespace-nowrap">
                    {formatRupiah(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-slate-800 font-bold text-slate-900">
                <tr>
                  <td className="py-2.5 px-3 font-black uppercase tracking-wider border border-slate-300 whitespace-nowrap">
                    GRAND TOTAL
                  </td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="py-2.5 px-3 text-right font-bold text-slate-900 border border-slate-300 whitespace-nowrap">
                      {formatRupiah(grandTotals[col.key] || 0)}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right font-black text-[10pt] text-slate-950 border border-slate-300 whitespace-nowrap">
                    {formatRupiah(grandTotals.total || 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </ReportPdfModal>
    </div>
  );
};
