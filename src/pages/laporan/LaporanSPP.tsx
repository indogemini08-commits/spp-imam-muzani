import React, { useState, useEffect } from 'react';
import { Calendar, Download, Printer, Search, Filter, Check, X, Clock, FileText } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { formatRupiah } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { ReportPrintHeader } from '../../components/laporan/ReportPrintHeader';
import { ReportPrintFooter } from '../../components/laporan/ReportPrintFooter';
import { ReportPdfModal } from '../../components/laporan/ReportPdfModal';
import { useAvailableClasses } from '../../context/SchoolContext';

export const LaporanSPP: React.FC = () => {
  const availableClasses = useAvailableClasses();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [search, setSearch] = useState('');

  const { success, error } = useNotification();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.reports.getMatrixSpp({
        class_name: selectedClass,
        search
      });
      setData(res);
    } catch (err: any) {
      error(err.message || 'Gagal memuat matriks SPP 12 bulan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, search]);

  const months: string[] = data?.months || [
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'
  ];
  const rows: any[] = data?.rows || [];

  const handleExportExcel = () => {
    if (rows.length === 0) return;
    const headers = [
      'No', 'NIS', 'Nama Santri', 'Kelas', 'Tarif SPP',
      ...months,
      'Total Sisa', 'Status Akhir'
    ];

    const exportRows = rows.map((r, i) => [
      i + 1,
      r.nis,
      r.name,
      r.class_name,
      r.spp_type_name || '-',
      ...months.map(m => {
        const mData = r.months[m];
        if (!mData) return '-';
        if (mData.status === 'LUNAS') return 'Lunas';
        if (mData.status === 'SEBAGIAN') return `Sebagian (${formatRupiah(mData.paid)})`;
        if (mData.status === 'TUNGGAKAN') return `Tunggakan (${formatRupiah(mData.remaining)})`;
        return 'Belum Ditagih';
      }),
      r.total_kurang || 0,
      r.status
    ]);

    exportTableToExcel('MATRIKS_SPP_12_BULAN_IMBS', 'Matriks SPP', headers, exportRows);
    success('Matriks SPP 12 bulan berhasil diekspor ke Excel');
  };

  const handlePrint = () => {
    window.print();
  };

  const renderMonthStatusBadge = (monthData: any) => {
    if (!monthData || monthData.status === 'BELUM_DITAGIH') {
      return (
        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium print:bg-transparent print:p-0">
          -
        </span>
      );
    }
    if (monthData.status === 'LUNAS') {
      return (
        <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300/40 print:border-emerald-600 print:text-emerald-900 print:bg-emerald-50/50 print:p-0.5 print:text-[8pt]">
          Lunas
        </span>
      );
    }
    if (monthData.status === 'SEBAGIAN') {
      return (
        <span className="inline-block px-1 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-300/40 print:border-amber-600 print:text-amber-900 print:bg-amber-50/50 print:p-0.5 print:text-[8pt]">
          Cicil
        </span>
      );
    }
    return (
      <span className="inline-block px-1 py-0.5 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold border border-rose-300/40 print:border-rose-600 print:text-rose-900 print:bg-rose-50/50 print:p-0.5 print:text-[8pt]">
        Belum
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Printable Official Header (Only in Print) */}
      <ReportPrintHeader
        title="MATRIKS PEMBAYARAN SPP SANTRI (12 BULAN)"
        subtitle="Pemantauan Pembayaran SPP Bulanan Kalender Pendidikan Tahun Pelajaran 2026/2027"
        filterInfo={`${selectedClass ? 'Kelas ' + selectedClass : 'Semua Kelas'}${search ? ' • Cari: "' + search + '"' : ''} • Keterangan: Lunas / Cicil / Belum`}
        summaryMetrics={[
          { label: 'Total Santri', value: `${rows.length} Santri` },
          { label: 'Realisasi SPP Diterima', value: formatRupiah(data?.grandTotals?.paid || 0), highlight: true },
          { label: 'Sisa Piutang SPP', value: formatRupiah(data?.grandTotals?.remaining || 0) }
        ]}
      />

      {/* Screen Header & Legend (Hidden in Print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600" />
              <span>Matriks Pembayaran SPP 12 Bulan (Juli - Juni)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Pemantauan kelunasan SPP bulanan seluruh santri dalam satu tahun pelajaran aktif
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

        {/* Legend & Filter Bar */}
        <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Keterangan:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-slate-700 dark:text-slate-300">Lunas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span className="text-slate-700 dark:text-slate-300">Sebagian / Cicil</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span className="text-slate-700 dark:text-slate-300">Belum Bayar / Menunggak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-400 inline-block"></span>
              <span className="text-slate-700 dark:text-slate-300">Belum Ditagih</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari santri..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Semua Kelas</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>Kelas {cls}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>
      </div>

      {/* Matrix Table - Fullframe No Horizontal Scroll */}
      <GlassCard className="overflow-hidden border border-slate-200/80 dark:border-slate-800 print:border-none print:shadow-none">
        <div className="w-full overflow-x-auto print:overflow-visible">
          <table className="w-full table-auto text-left text-xs border-collapse print-matrix-table">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-1.5 font-semibold text-center whitespace-nowrap print:bg-[#0f2744] print:text-white">No</th>
                <th className="py-2.5 px-2 font-semibold whitespace-nowrap print:bg-[#0f2744] print:text-white">NIS</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap print:bg-[#0f2744] print:text-white">Nama Santri</th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744] print:text-white">Kls</th>
                {months.map(m => (
                  <th key={m} className="py-2.5 px-1 font-semibold text-center whitespace-nowrap print:bg-[#0f2744] print:text-white">
                    {m.substring(0, 3)}
                  </th>
                ))}
                <th className="py-2.5 px-2 font-semibold text-right whitespace-nowrap bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 print:bg-[#0f2744] print:text-white">
                  Diterima
                </th>
                <th className="py-2.5 px-2 font-semibold text-right whitespace-nowrap bg-slate-100/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 print:bg-[#0f2744] print:text-white">
                  Sisa
                </th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744] print:text-white">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={months.length + 7} className="py-8 text-center text-slate-400">
                    Memuat data matriks SPP 12 bulan...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={months.length + 7} className="py-8 text-center text-slate-400">
                    Tidak ada santri yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-1.5 text-center font-medium text-slate-400 text-xs whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 font-semibold text-slate-700 dark:text-slate-200 text-[11px] whitespace-nowrap">
                      {row.nis}
                    </td>
                    <td className="py-2 px-2.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      <div className="font-bold text-xs whitespace-nowrap" title={row.name}>
                        {row.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal print:hidden whitespace-nowrap">
                        {row.spp_type_name}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] print:bg-transparent print:p-0 font-medium">
                        {row.class_name}
                      </span>
                    </td>
                    {months.map(m => (
                      <td key={m} className="py-2 px-1 text-center whitespace-nowrap">
                        {renderMonthStatusBadge(row.months[m])}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400 text-[11px] print-currency whitespace-nowrap">
                      {formatRupiah(row.total_terbayar || 0)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-[11px] print-currency whitespace-nowrap bg-slate-50/60 dark:bg-slate-800/30">
                      {row.total_kurang > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">{formatRupiah(row.total_kurang)}</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Rp 0</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className={`print-status-tag text-[10px] ${
                        row.status === 'Lunas'
                          ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                          : row.status === 'Sebagian'
                          ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                          : 'border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950/40'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="hidden print:table-footer-group border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-100/90 dark:bg-slate-800/90 text-slate-900 dark:text-white">
                <tr>
                  <td colSpan={4} className="py-2.5 px-2 text-center uppercase tracking-wider font-extrabold text-[10px] print:text-[8pt] whitespace-nowrap">
                    JUMLAH TERBAYAR (RP)
                  </td>
                  {months.map(m => (
                    <td key={m} className="py-2.5 px-1 text-center font-bold text-[10px] print:text-[6.8pt] text-emerald-700 dark:text-emerald-300 print-currency whitespace-nowrap">
                      {data?.monthTotals?.[m]?.paid > 0 ? formatRupiah(data.monthTotals[m].paid) : '-'}
                    </td>
                  ))}
                  <td className="py-2.5 px-2 text-right font-extrabold text-xs text-emerald-700 dark:text-emerald-300 print-currency whitespace-nowrap">
                    {formatRupiah(data?.grandTotals?.paid || 0)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-extrabold text-xs text-rose-700 dark:text-rose-300 print-currency whitespace-nowrap">
                    {formatRupiah(data?.grandTotals?.remaining || 0)}
                  </td>
                  <td className="py-2.5 px-2 text-center text-[10px] whitespace-nowrap">
                    {data?.grandTotals?.remaining === 0 ? '100% Lunas' : `${Math.round(((data?.grandTotals?.paid || 0) / (data?.grandTotals?.amount || 1)) * 100)}% Terbayar`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </GlassCard>

      {/* Official Signatures & Verification (Only in Print) */}
      <ReportPrintFooter />

      {/* PDF Preview Modal with Official Document & Full Totals */}
      <ReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="MATRIKS PEMBAYARAN SPP SANTRI (12 BULAN)"
        subtitle="Pemantauan Pembayaran SPP Bulanan Kalender Pendidikan Tahun Pelajaran 2026/2027"
        filterInfo={`${selectedClass ? 'Kelas ' + selectedClass : 'Semua Kelas'}${search ? ' • Cari: "' + search + '"' : ''}`}
        summaryMetrics={[
          { label: 'Total Santri', value: `${rows.length} Santri` },
          { label: 'Realisasi SPP Diterima', value: formatRupiah(data?.grandTotals?.paid || 0), highlight: true },
          { label: 'Sisa Piutang SPP', value: formatRupiah(data?.grandTotals?.remaining || 0) }
        ]}
        fileName={`LAPORAN_MATRIKS_SPP_12_BULAN_${selectedClass || 'SEMUA'}`}
        wideContent={true}
      >
        <div className="w-full">
          <table className="table-auto w-full text-left text-[8.5pt] border-collapse border border-slate-300">
            <thead className="bg-[#0f2744] text-white font-bold">
              <tr>
                <th className="py-2 px-1.5 text-center whitespace-nowrap border border-slate-400">No</th>
                <th className="py-2 px-2 whitespace-nowrap border border-slate-400">NIS</th>
                <th className="py-2 px-2.5 text-left whitespace-nowrap border border-slate-400">Nama Santri</th>
                <th className="py-2 px-2 text-center whitespace-nowrap border border-slate-400">Kls</th>
                {months.map(m => (
                  <th key={m} className="py-2 px-1 text-center whitespace-nowrap border border-slate-400 text-[8pt]">
                    {m.substring(0, 3)}
                  </th>
                ))}
                <th className="py-2 px-2 text-right whitespace-nowrap border border-slate-400">
                  Diterima
                </th>
                <th className="py-2 px-2 text-right whitespace-nowrap border border-slate-400">
                  Sisa
                </th>
                <th className="py-2 px-2 text-center whitespace-nowrap border border-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="py-2 px-1.5 text-center text-slate-500 border border-slate-300 whitespace-nowrap">{idx + 1}</td>
                  <td className="py-2 px-2 font-medium text-slate-800 border border-slate-300 whitespace-nowrap">{row.nis}</td>
                  <td className="py-2 px-2.5 font-bold text-slate-900 border border-slate-300 whitespace-nowrap">
                    <div className="leading-tight whitespace-nowrap">{row.name}</div>
                    <div className="text-[7.5pt] text-slate-500 font-normal leading-tight mt-0.5 whitespace-nowrap">{row.spp_type_name}</div>
                  </td>
                  <td className="py-2 px-2 text-center font-semibold text-slate-700 border border-slate-300 whitespace-nowrap">{row.class_name}</td>
                  {months.map(m => {
                    const mData = row.months[m];
                    const isLunas = mData?.status === 'LUNAS';
                    const isSebagian = mData?.status === 'SEBAGIAN';
                    const isTunggakan = mData?.status === 'TUNGGAKAN';
                    return (
                      <td key={m} className="py-2 px-1 text-center border border-slate-300 whitespace-nowrap">
                        {isLunas ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[7.5pt] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                            Lunas
                          </span>
                        ) : isSebagian ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[7.5pt] font-bold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                            Cicil
                          </span>
                        ) : isTunggakan ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[7.5pt] font-bold bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap">
                            Belum
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[7.5pt] whitespace-nowrap">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 px-2 text-right font-bold text-emerald-800 border border-slate-300 whitespace-nowrap">
                    {formatRupiah(row.total_terbayar || 0)}
                  </td>
                  <td className="py-2 px-2 text-right font-bold border border-slate-300 whitespace-nowrap">
                    {row.total_kurang > 0 ? (
                      <span className="text-rose-700">{formatRupiah(row.total_kurang)}</span>
                    ) : (
                      <span className="text-emerald-700">Rp 0</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center border border-slate-300 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[8pt] font-bold border whitespace-nowrap ${
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
            {/* Totals row - explicitly rendered for PDF */}
            <tfoot className="bg-slate-100 border-t-2 border-slate-800 font-bold text-slate-900">
              <tr>
                <td colSpan={4} className="py-2.5 px-2.5 text-center uppercase tracking-wider font-extrabold text-[8pt] border border-slate-300 whitespace-nowrap">
                  JUMLAH TERBAYAR (RP)
                </td>
                {months.map(m => (
                  <td key={m} className="py-2.5 px-1 text-center font-bold text-[7.5pt] text-emerald-800 border border-slate-300 whitespace-nowrap">
                    {data?.monthTotals?.[m]?.paid > 0 ? formatRupiah(data.monthTotals[m].paid) : '-'}
                  </td>
                ))}
                <td className="py-2.5 px-2 text-right font-extrabold text-[8.5pt] text-emerald-800 border border-slate-300 whitespace-nowrap">
                  {formatRupiah(data?.grandTotals?.paid || 0)}
                </td>
                <td className="py-2.5 px-2 text-right font-extrabold text-[8.5pt] text-rose-800 border border-slate-300 whitespace-nowrap">
                  {formatRupiah(data?.grandTotals?.remaining || 0)}
                </td>
                <td className="py-2.5 px-2 text-center text-[8pt] border border-slate-300 whitespace-nowrap">
                  {data?.grandTotals?.remaining === 0 ? '100% Lunas' : `${Math.round(((data?.grandTotals?.paid || 0) / (data?.grandTotals?.amount || 1)) * 100)}% Terbayar`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportPdfModal>
    </div>
  );
};
