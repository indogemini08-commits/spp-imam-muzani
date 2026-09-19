import React, { useState, useEffect } from 'react';
import { Activity, Download, Printer, Filter, CheckCircle2, Eye, CreditCard, FileText } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { formatRupiah } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { EskulType } from '../../types';
import { PageView } from '../../components/layout/Sidebar';
import { ReportPrintHeader } from '../../components/laporan/ReportPrintHeader';
import { ReportPrintFooter } from '../../components/laporan/ReportPrintFooter';
import { ReportPdfModal } from '../../components/laporan/ReportPdfModal';
import { useAvailableClasses } from '../../context/SchoolContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

interface LaporanEskulProps {
  onNavigate?: (page: PageView) => void;
}

export const LaporanEskul: React.FC<LaporanEskulProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any[]>([]);
  const [eskulList, setEskulList] = useState<EskulType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEskulDetail, setSelectedEskulDetail] = useState<any>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedEskul, setSelectedEskul] = useState('');

  const availableClasses = useAvailableClasses();
  const { success, error } = useNotification();

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [res, types] = await Promise.all([
        api.reports.getMatrixEskul({
          class_name: selectedClass,
          eskul_id: selectedEskul
        }),
        api.eskul.getAll()
      ]);
      setData(res || []);
      setEskulList(types || []);
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat laporan ekstrakurikuler');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useRealtimeSync(() => {
    loadData(true);
  });

  useEffect(() => {
    loadData(false);
  }, [selectedClass, selectedEskul]);

  const handleExportExcel = () => {
    if (data.length === 0) return;
    const headers = [
      'No', 'NIS', 'Nama Santri', 'Kelas', 'Ekstrakurikuler',
      'Iuran per Bulan', 'Sisa Tunggakan', 'Status'
    ];
    const rows = data.map((d, i) => [
      i + 1,
      d.nis,
      d.name,
      d.class_name,
      d.eskul_name,
      d.amount_per_month || 0,
      d.total_kurang || 0,
      d.status
    ]);

    exportTableToExcel('LAPORAN_EKSTRAKURIKULER_IMBS', 'Eskul Santri', headers, rows);
    success('Laporan ekstrakurikuler berhasil diekspor ke Excel');
  };

  const handlePrint = () => {
    window.print();
  };

  const totalOverdue = data.reduce((acc, d) => acc + (d.total_kurang || 0), 0);
  const totalLunasCount = data.filter(d => d.status === 'Lunas').length;

  return (
    <div className="space-y-6">
      {/* Printable Official Letterhead Header (Only in Print) */}
      <ReportPrintHeader
        title="LAPORAN PEMBAYARAN IURAN EKSTRAKURIKULER"
        subtitle="Rekapitulasi Partisipasi Eskul Santri, Iuran Bulanan, dan Status Kelunasan"
        filterInfo={`${selectedClass ? 'Kelas: ' + selectedClass : 'Semua Kelas'}${selectedEskul ? ' • Cabang: ' + (eskulList.find(e => e.id === selectedEskul)?.name || '') : ''}`}
        summaryMetrics={[
          { label: 'Total Santri Eskul', value: `${data.length} Santri` },
          { label: 'Lunas Iuran', value: `${totalLunasCount} Santri` },
          { label: 'Total Tunggakan Eskul', value: formatRupiah(totalOverdue), highlight: true }
        ]}
      />

      {/* Screen Header & Filters (Hidden in Print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <span>Laporan Pembayaran Ekstrakurikuler</span>
            </h2>
            <p className="text-xs text-slate-500">
              Pemantauan kepesertaan eskul santri (Tahfidz Intensif, Panahan, Robotik, Futsal, Silat, dll) dan status iurannya
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

        {/* Filter Bar */}
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Semua Kelas</option>
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            </div>

            <div className="w-52">
              <select
                value={selectedEskul}
                onChange={(e) => setSelectedEskul(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Semua Cabang Eskul</option>
                {eskulList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({formatRupiah(e.amount)}/bln)
                  </option>
                ))}
              </select>
            </div>

            {(selectedClass || selectedEskul) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClass('');
                  setSelectedEskul('');
                }}
                className="text-xs text-slate-500 hover:text-rose-500 px-2 py-1.5 underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}

            <div className="ml-auto text-xs text-slate-500">
              Total Peserta: <strong className="text-slate-900 dark:text-white">{data.length} santri</strong>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Data Table */}
      <GlassCard className="p-0 overflow-hidden shadow-sm print:shadow-none print:border-none">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[850px] table-auto text-left text-xs border-collapse print-report-table">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold">
              <tr>
                <th className="py-2.5 px-2 text-center whitespace-nowrap print:bg-[#0f2744]">No</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap print:bg-[#0f2744]">NIS</th>
                <th className="py-2.5 px-3 whitespace-nowrap print:bg-[#0f2744]">Nama Santri</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap print:bg-[#0f2744]">Kelas</th>
                <th className="py-2.5 px-3 whitespace-nowrap print:bg-[#0f2744]">Ekstrakurikuler</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap print:bg-[#0f2744]">Iuran / Bulan</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap print:bg-[#0f2744]">Sisa Tunggakan</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap print:bg-[#0f2744]">Status</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap no-print print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Memuat data ekstrakurikuler...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada kepesertaan ekstrakurikuler ditemukan untuk kriteria ini.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={row.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-2 text-center font-medium text-slate-400 align-middle text-xs whitespace-nowrap">{idx + 1}</td>
                    <td className="py-2 px-2.5 font-semibold text-slate-700 dark:text-slate-200 align-middle text-xs whitespace-nowrap">{row.nis}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white align-middle whitespace-nowrap">{row.name}</td>
                    <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] print:bg-transparent print:p-0 font-medium whitespace-nowrap">
                        {row.class_name}
                      </span>
                    </td>
                    <td className="py-2 px-3 align-middle whitespace-nowrap">
                      {/* Compact Screen View */}
                      <div className="flex items-center gap-2 print:hidden whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 whitespace-nowrap">
                          {row.eskuls?.length || 1} Cabang
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap" title={row.eskul_name}>
                          {row.eskul_name}
                        </span>
                      </div>
                      {/* Clean Print View */}
                      <span className="hidden print:inline font-medium text-slate-800 whitespace-nowrap">
                        {row.eskul_name}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white align-middle text-xs print-currency whitespace-nowrap">
                      {formatRupiah(row.amount_per_month)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold align-middle text-xs print-currency whitespace-nowrap">
                      {row.total_kurang > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">{formatRupiah(row.total_kurang)}</span>
                      ) : (
                        <span className="text-emerald-500 font-semibold">Rp 0</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                      <span className={`print-status-tag ${
                        row.status === 'Lunas'
                          ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                          : row.status === 'Sebagian'
                          ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                          : 'border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950/40'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center align-middle no-print print:hidden whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedEskulDetail(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 transition-colors cursor-pointer"
                        title={`Lihat rincian partisipasi eskul ${row.name}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* View / Detail Modal */}
      {selectedEskulDetail && (
        <Modal
          isOpen={Boolean(selectedEskulDetail)}
          onClose={() => setSelectedEskulDetail(null)}
          title="Rincian Kepesertaan & Iuran Ekstrakurikuler"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Santri Profile Header */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedEskulDetail.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  NIS: {selectedEskulDetail.nis} • Kelas: {selectedEskulDetail.class_name}
                </p>
              </div>
              <span
                className={`print-status-tag font-semibold ${
                  selectedEskulDetail.status === 'Lunas'
                    ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                    : selectedEskulDetail.status === 'Sebagian'
                    ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                    : 'border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950/40'
                }`}
              >
                {selectedEskulDetail.status}
              </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/50">
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">Cabang Diikuti</span>
                <p className="text-base font-bold text-indigo-900 dark:text-indigo-100 mt-0.5">
                  {selectedEskulDetail.eskuls?.length || 1} Cabang
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Iuran per Bulan</span>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatRupiah(selectedEskulDetail.amount_per_month)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">Total Terbayar</span>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {formatRupiah(selectedEskulDetail.total_paid || 0)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-rose-700 dark:text-rose-300 font-medium">Sisa Tunggakan</span>
                <p className="text-base font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                  {formatRupiah(selectedEskulDetail.total_kurang || 0)}
                </p>
              </div>
            </div>

            {/* Itemized Table of Enrolled Eskuls */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">No</th>
                    <th className="py-2.5 px-3">Cabang Ekstrakurikuler</th>
                    <th className="py-2.5 px-3 text-right">Tarif / Bln</th>
                    <th className="py-2.5 px-3 text-right">Terbayar</th>
                    <th className="py-2.5 px-3 text-right">Tunggakan</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedEskulDetail.eskuls && selectedEskulDetail.eskuls.length > 0 ? (
                    selectedEskulDetail.eskuls.map((esk: any, idx: number) => (
                      <tr key={esk.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          {esk.name}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white">
                          {formatRupiah(esk.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatRupiah(esk.total_paid || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                          {formatRupiah(esk.total_kurang || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`print-status-tag ${
                              esk.status === 'Lunas'
                                ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                                : 'border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950/40'
                            }`}
                          >
                            {esk.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5 px-3 text-center text-slate-400">1</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {selectedEskulDetail.eskul_name}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900 dark:text-white">
                        {formatRupiah(selectedEskulDetail.amount_per_month)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatRupiah(selectedEskulDetail.total_paid || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatRupiah(selectedEskulDetail.total_kurang || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="print-status-tag border-rose-500 text-rose-700 bg-rose-50">
                          {selectedEskulDetail.status}
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
                Total Beban Iuran: <strong className="text-slate-800 dark:text-slate-200">{formatRupiah((selectedEskulDetail.total_paid || 0) + (selectedEskulDetail.total_kurang || 0))}</strong>
              </span>

              <div className="flex items-center gap-2">
                {selectedEskulDetail.total_kurang > 0 && onNavigate && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('selected_payment_student_id', selectedEskulDetail.student_id);
                      setSelectedEskulDetail(null);
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
                  onClick={() => setSelectedEskulDetail(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Official Signatures & Verification (Only in Print) */}
      <ReportPrintFooter />

      {/* PDF PREVIEW MODAL */}
      <ReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="LAPORAN PEMBAYARAN IURAN EKSTRAKURIKULER"
        subtitle="Rekapitulasi Partisipasi Eskul Santri, Iuran Bulanan, dan Status Kelunasan"
        filterInfo={`${selectedClass ? 'Kelas: ' + selectedClass : 'Semua Kelas'}${selectedEskul ? ' • Cabang: ' + (eskulList.find(e => e.id === selectedEskul)?.name || '') : ''}`}
        summaryMetrics={[
          { label: 'Total Santri Eskul', value: `${data.length} Santri` },
          { label: 'Lunas Iuran', value: `${totalLunasCount} Santri` },
          { label: 'Total Tunggakan Eskul', value: formatRupiah(totalOverdue), highlight: true }
        ]}
        fileName={`LAPORAN_EKSTRAKURIKULER_${selectedClass || 'SEMUA'}`}
      >
        <div className="w-full">
          <table className="table-auto w-full text-left text-[9pt] border-collapse border border-slate-300">
            <thead className="bg-[#0f2744] text-white font-bold">
              <tr>
                <th className="py-2.5 px-2 text-center whitespace-nowrap border border-slate-400">No</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap border border-slate-400">NIS</th>
                <th className="py-2.5 px-3 text-left whitespace-nowrap border border-slate-400">Nama Santri</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap border border-slate-400">Kelas</th>
                <th className="py-2.5 px-3 text-left whitespace-nowrap border border-slate-400">Ekstrakurikuler Diikuti</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap border border-slate-400">Iuran / Bln</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap border border-slate-400">Tunggakan</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap border border-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="py-2 px-2 text-center text-slate-500 border border-slate-300 whitespace-nowrap">{idx + 1}</td>
                  <td className="py-2 px-2.5 font-medium text-slate-800 border border-slate-300 whitespace-nowrap">{row.nis}</td>
                  <td className="py-2 px-3 font-bold text-slate-900 border border-slate-300 whitespace-nowrap">{row.name}</td>
                  <td className="py-2 px-2 text-center font-semibold text-slate-700 border border-slate-300 whitespace-nowrap">{row.class_name}</td>
                  <td className="py-2 px-3 border border-slate-300 whitespace-nowrap">
                    <div className="font-semibold text-slate-900 whitespace-nowrap">{row.eskul_name}</div>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 border border-slate-300 whitespace-nowrap">
                    {formatRupiah(row.amount_per_month)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold border border-slate-300 whitespace-nowrap">
                    {row.total_kurang > 0 ? (
                      <span className="text-rose-700">{formatRupiah(row.total_kurang)}</span>
                    ) : (
                      <span className="text-emerald-700">Rp 0</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center border border-slate-300 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[8.5pt] font-bold border whitespace-nowrap ${
                      row.status === 'Lunas'
                        ? 'border-emerald-600 text-emerald-800 bg-emerald-50'
                        : row.status === 'Sebagian'
                        ? 'border-amber-600 text-amber-800 bg-amber-50'
                        : 'border-rose-600 text-rose-800 bg-rose-50'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-800 font-bold text-slate-900">
              <tr>
                <td colSpan={6} className="py-2.5 px-3 text-center uppercase tracking-wider font-extrabold text-[9pt] border border-slate-300 whitespace-nowrap">
                  Total Tunggakan Eskul ({data.length} Santri Terdata)
                </td>
                <td className="py-2.5 px-3 text-right font-black text-[10pt] text-rose-800 border border-slate-300 whitespace-nowrap">
                  {formatRupiah(totalOverdue)}
                </td>
                <td className="py-2.5 px-2 text-center text-[9pt] border border-slate-300 whitespace-nowrap">
                  {totalOverdue === 0 ? '100% Lunas' : `${totalLunasCount} Lunas`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportPdfModal>
    </div>
  );
};

