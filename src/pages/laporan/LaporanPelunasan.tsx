import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Clock, Download, Printer, Search, Filter, FileText } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { formatRupiah } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { ReportPrintHeader } from '../../components/laporan/ReportPrintHeader';
import { ReportPrintFooter } from '../../components/laporan/ReportPrintFooter';
import { ReportPdfModal } from '../../components/laporan/ReportPdfModal';

export const LaporanPelunasan: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  const { success, error } = useNotification();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.reports.getPelunasan({
        class_name: selectedClass,
        status: selectedStatus,
        search
      });
      setData(res || []);
    } catch (err: any) {
      error(err.message || 'Gagal memuat laporan status pelunasan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedStatus, search]);

  // Metric aggregates
  const totalStudents = data.length;
  const countLunas = data.filter(d => d.status === 'Lunas').length;
  const countSebagian = data.filter(d => d.status === 'Sebagian').length;
  const countBelumLunas = data.filter(d => d.status === 'Belum Lunas').length;
  const totalRemainingSum = data.reduce((acc, d) => acc + (d.total_remaining || 0), 0);

  const handleExportExcel = () => {
    if (data.length === 0) return;
    const headers = [
      'No', 'NIS', 'Nama Santri', 'Kelas',
      'Total SPP', 'SPP Terbayar', 'Sisa SPP',
      'Sisa Eskul', 'Sisa Daftar Ulang', 'Total Sisa Tagihan', 'Status Pelunasan'
    ];
    const rows = data.map((d, i) => [
      i + 1,
      d.nis,
      d.name,
      d.class_name,
      d.total_spp || 0,
      d.paid_spp || 0,
      d.remaining_spp || 0,
      d.remaining_eskul || 0,
      d.remaining_annual || 0,
      d.total_remaining || 0,
      d.status
    ]);

    exportTableToExcel('LAPORAN_STATUS_PELUNASAN_IMBS', 'Status Pelunasan', headers, rows);
    success('Laporan status pelunasan berhasil diekspor ke Excel');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Official Header (Only in Print) */}
      <ReportPrintHeader
        title="LAPORAN STATUS PELUNASAN SANTRI"
        subtitle="Monitoring Kelunasan Biaya Pendidikan (SPP Bulanan, Ekstrakurikuler, dan Paket Daftar Ulang)"
        filterInfo={`${selectedClass ? 'Kelas ' + selectedClass : 'Semua Kelas'}${selectedStatus ? ' • Status: ' + selectedStatus : ''}${search ? ' • Pencarian: "' + search + '"' : ''}`}
        summaryMetrics={[
          { label: 'Total Santri', value: `${totalStudents} Siswa` },
          { label: 'Lunas Semua', value: `${countLunas} Siswa` },
          { label: 'Sebagian / Cicil', value: `${countSebagian} Siswa` },
          { label: 'Belum Ada Bayar', value: `${countBelumLunas} Siswa` },
          { label: 'Total Sisa Piutang', value: formatRupiah(totalRemainingSum), highlight: true }
        ]}
      />

      {/* Screen Interactive Header, Metric Cards, & Filter (Hidden in Print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Laporan Status Pelunasan Tagihan
            </h2>
            <p className="text-xs text-slate-500">
              Monitoring kelunasan santri secara menyeluruh (SPP, Ekstrakurikuler, dan Daftar Ulang)
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <GlassCard className="p-3.5 border-l-4 border-l-blue-500">
          <p className="text-[11px] font-medium text-slate-500">Total Santri</p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{totalStudents}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Siswa terdaftar</p>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-emerald-500">
          <p className="text-[11px] font-medium text-slate-500">Lunas Semua</p>
          <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{countLunas}</h3>
          <p className="text-[10px] text-emerald-500/80 mt-0.5">{totalStudents ? Math.round((countLunas / totalStudents) * 100) : 0}% tuntas</p>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-amber-500">
          <p className="text-[11px] font-medium text-slate-500">Sebagian / Cicil</p>
          <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{countSebagian}</h3>
          <p className="text-[10px] text-amber-500/80 mt-0.5">Sudah cicil sebagian</p>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-rose-500">
          <p className="text-[11px] font-medium text-slate-500">Belum Ada Bayar</p>
          <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">{countBelumLunas}</h3>
          <p className="text-[10px] text-rose-500/80 mt-0.5">Perlu tindak lanjut</p>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-purple-500">
          <p className="text-[11px] font-medium text-slate-500">Total Sisa Tagihan</p>
          <h3 className="text-base font-bold text-purple-700 dark:text-purple-300 mt-1 truncate">
            {formatRupiah(totalRemainingSum)}
          </h3>
          <p className="text-[10px] text-purple-500/80 mt-0.5">Potensi penerimaan</p>
        </GlassCard>
      </div>

      {/* Filter Bar */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama santri atau NIS..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="w-40">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Semua Kelas</option>
              <option value="7A">Kelas 7A</option>
              <option value="7B">Kelas 7B</option>
              <option value="8A">Kelas 8A</option>
              <option value="8B">Kelas 8B</option>
              <option value="9A">Kelas 9A</option>
              <option value="10 IPA">Kelas 10 IPA</option>
            </select>
          </div>

          <div className="w-40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Semua Status</option>
              <option value="Lunas">Lunas</option>
              <option value="Sebagian">Sebagian</option>
              <option value="Belum Lunas">Belum Lunas</option>
            </select>
          </div>

          {(selectedClass || selectedStatus || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedClass('');
                setSelectedStatus('');
                setSearch('');
              }}
              className="text-xs text-slate-500 hover:text-rose-500 px-2 py-1.5 underline"
            >
              Reset Filter
            </button>
          )}
        </div>
      </GlassCard>
      </div>

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden shadow-sm print:shadow-none print:border-none">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full table-auto text-xs text-left border-collapse print-report-table">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">No</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap print:bg-[#0f2744]">NIS</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap print:bg-[#0f2744]">Nama Santri</th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">Kelas</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">Total SPP</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">SPP Terbayar</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">Sisa SPP</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">Sisa Eskul</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">Sisa Dftr Ulang</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap bg-slate-100/50 dark:bg-slate-800/50 print:bg-[#0f2744] print:text-white">Total Sisa</th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Memuat data status pelunasan...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Tidak ada data santri ditemukan dengan filter ini.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-2 text-center font-medium text-slate-400 whitespace-nowrap">{idx + 1}</td>
                    <td className="py-2 px-2.5 font-medium whitespace-nowrap">{row.nis}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">{row.name}</td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium print:bg-transparent print:p-0">
                        {row.class_name}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">{formatRupiah(row.total_spp)}</td>
                    <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                      {formatRupiah(row.paid_spp)}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {row.remaining_spp > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">{formatRupiah(row.remaining_spp)}</span>
                      ) : (
                        <span className="text-emerald-500 font-semibold">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {row.remaining_eskul > 0 ? formatRupiah(row.remaining_eskul) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {row.remaining_annual > 0 ? formatRupiah(row.remaining_annual) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                      {row.total_remaining > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">{formatRupiah(row.total_remaining)}</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Lunas (Rp 0)</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className={`print-status-tag ${
                        row.status === 'Lunas'
                          ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                          : row.status === 'Sebagian'
                          ? 'border-amber-500 text-amber-700 bg-amber-50'
                          : 'border-rose-500 text-rose-700 bg-rose-50'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Official Signatures & Verification (Only in Print) */}
      <ReportPrintFooter />

      {/* PDF PREVIEW MODAL */}
      <ReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="LAPORAN STATUS PELUNASAN SANTRI"
        subtitle="Monitoring Kelunasan Biaya Pendidikan (SPP Bulanan, Ekstrakurikuler, dan Paket Daftar Ulang)"
        filterInfo={`${selectedClass ? 'Kelas ' + selectedClass : 'Semua Kelas'}${selectedStatus ? ' • Status: ' + selectedStatus : ''}${search ? ' • Pencarian: "' + search + '"' : ''}`}
        summaryMetrics={[
          { label: 'Total Santri', value: `${totalStudents} Siswa` },
          { label: 'Lunas Semua', value: `${countLunas} Siswa` },
          { label: 'Sebagian / Cicil', value: `${countSebagian} Siswa` },
          { label: 'Belum Ada Bayar', value: `${countBelumLunas} Siswa` },
          { label: 'Total Sisa Piutang', value: formatRupiah(totalRemainingSum), highlight: true }
        ]}
        fileName={`LAPORAN_STATUS_PELUNASAN_${selectedClass || 'SEMUA'}`}
      >
        <div className="w-full">
          <table className="table-auto w-full text-left text-[8.5pt] border-collapse border border-slate-300">
            <thead className="bg-[#0f2744] text-white font-bold">
              <tr>
                <th className="py-2 px-2 text-center whitespace-nowrap border border-slate-400">No</th>
                <th className="py-2 px-2.5 whitespace-nowrap border border-slate-400">NIS</th>
                <th className="py-2 px-3 text-left whitespace-nowrap border border-slate-400">Nama Santri</th>
                <th className="py-2 px-2 text-center whitespace-nowrap border border-slate-400">Kelas</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap border border-slate-400">Total SPP</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap border border-slate-400">Bayar SPP</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap border border-slate-400">Sisa SPP</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap border border-slate-400">Sisa Eskul</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap border border-slate-400">Sisa Dftr Ulang</th>
                <th className="py-2 px-2.5 text-right whitespace-nowrap border border-slate-400">Total Piutang</th>
                <th className="py-2 px-2 text-center whitespace-nowrap border border-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="py-1.5 px-2 text-center text-slate-500 border border-slate-300 whitespace-nowrap">{idx + 1}</td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-800 border border-slate-300 whitespace-nowrap">{row.nis}</td>
                  <td className="py-1.5 px-3 font-bold text-slate-900 border border-slate-300 whitespace-nowrap">{row.name}</td>
                  <td className="py-1.5 px-2 text-center font-semibold text-slate-700 border border-slate-300 whitespace-nowrap">{row.class_name}</td>
                  <td className="py-1.5 px-2.5 text-right border border-slate-300 whitespace-nowrap">{formatRupiah(row.total_spp)}</td>
                  <td className="py-1.5 px-2.5 text-right font-semibold text-emerald-800 border border-slate-300 whitespace-nowrap">{formatRupiah(row.paid_spp)}</td>
                  <td className="py-1.5 px-2.5 text-right border border-slate-300 whitespace-nowrap">
                    {row.remaining_spp > 0 ? (
                      <span className="text-amber-700 font-semibold">{formatRupiah(row.remaining_spp)}</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">-</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5 text-right border border-slate-300 whitespace-nowrap">
                    {row.remaining_eskul > 0 ? formatRupiah(row.remaining_eskul) : '-'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right border border-slate-300 whitespace-nowrap">
                    {row.remaining_annual > 0 ? formatRupiah(row.remaining_annual) : '-'}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-bold border border-slate-300 whitespace-nowrap">
                    {row.total_remaining > 0 ? (
                      <span className="text-rose-700">{formatRupiah(row.total_remaining)}</span>
                    ) : (
                      <span className="text-emerald-700">Lunas (Rp 0)</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-center border border-slate-300 whitespace-nowrap">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8pt] font-bold border ${
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
                <td colSpan={9} className="py-2.5 px-3 text-center uppercase tracking-wider font-extrabold text-[9pt] border border-slate-300 whitespace-nowrap">
                  Total Keseluruhan Sisa Piutang Seluruh Santri
                </td>
                <td className="py-2.5 px-2.5 text-right font-extrabold text-[9.5pt] text-rose-800 border border-slate-300 whitespace-nowrap">
                  {formatRupiah(totalRemainingSum)}
                </td>
                <td className="py-2.5 px-2 text-center text-[8pt] border border-slate-300 whitespace-nowrap">
                  {totalRemainingSum === 0 ? '100% Lunas' : `${countLunas}/${totalStudents} Santri`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportPdfModal>
    </div>
  );
};
