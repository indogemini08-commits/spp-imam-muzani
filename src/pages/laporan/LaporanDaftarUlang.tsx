import React, { useState, useEffect } from 'react';
import { Package, Download, Printer, Filter, CheckCircle2, Clock, FileText } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { formatRupiah } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { AnnualBillType } from '../../types';
import { ReportPrintHeader } from '../../components/laporan/ReportPrintHeader';
import { ReportPrintFooter } from '../../components/laporan/ReportPrintFooter';
import { ReportPdfModal } from '../../components/laporan/ReportPdfModal';

export const LaporanDaftarUlang: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Filter
  const [selectedClass, setSelectedClass] = useState('');

  const { success, error } = useNotification();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.reports.getDaftarUlang({
        class_name: selectedClass
      });
      setData(res);
    } catch (err: any) {
      error(err.message || 'Gagal memuat laporan daftar ulang');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass]);

  const annualTypes: AnnualBillType[] = data?.annualTypes || [];
  const rows: any[] = data?.rows || [];

  const totalNominalAll = rows.reduce((acc, r) => acc + (r.total_nominal || 0), 0);
  const totalDibayarAll = rows.reduce((acc, r) => acc + (r.total_dibayar || 0), 0);
  const totalKurangAll = rows.reduce((acc, r) => acc + (r.total_kurang || 0), 0);

  const handleExportExcel = () => {
    if (rows.length === 0) return;
    const headers = [
      'No', 'NIS', 'Nama Santri', 'Kelas',
      ...annualTypes.map(a => a.name),
      'Total Paket', 'Total Terbayar', 'Sisa Pembayaran', 'Status'
    ];

    const exportRows = rows.map((r, i) => [
      i + 1,
      r.nis,
      r.name,
      r.class_name,
      ...annualTypes.map(a => {
        const it = r.items[a.id];
        if (!it || it.status === 'BUKAN_SASARAN') return '-';
        return it.status === 'LUNAS' ? 'Lunas' : `Sisa ${formatRupiah(it.remaining)}`;
      }),
      r.total_nominal || 0,
      r.total_dibayar || 0,
      r.total_kurang || 0,
      r.status
    ]);

    exportTableToExcel('LAPORAN_DAFTAR_ULANG_IMBS', 'Daftar Ulang', headers, exportRows);
    success('Laporan daftar ulang berhasil diekspor ke Excel');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Official Letterhead Header (Only in Print) */}
      <ReportPrintHeader
        title="LAPORAN BIAYA DAFTAR ULANG TAHUNAN"
        subtitle="Rekapitulasi Pelunasan Komponen Pangkal Gedung, Seragam, Kitab, Sarpras, dan Kegiatan Santri"
        filterInfo={selectedClass ? `Tingkat Kelas: ${selectedClass}` : 'Semua Tingkat Kelas'}
        summaryMetrics={[
          { label: 'Total Santri Terdata', value: `${rows.length} Santri` },
          { label: 'Total Tagihan Paket', value: formatRupiah(totalNominalAll) },
          { label: 'Realisasi Diterima', value: formatRupiah(totalDibayarAll) },
          { label: 'Sisa Piutang Daftar Ulang', value: formatRupiah(totalKurangAll), highlight: true }
        ]}
      />

      {/* Screen Header & Filter (Hidden in Print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              <span>Laporan Daftar Ulang & Tagihan Tahunan</span>
            </h2>
            <p className="text-xs text-slate-500">
              Rincian pelunasan paket daftar ulang (Uang Pangkal, Seragam, Kitab, Sarpras, & Kegiatan) per santri
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

        {/* Filter Bar */}
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filter Kelas:
              </span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
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

            <div className="text-xs text-slate-500">
              Total Santri: <strong className="text-slate-900 dark:text-white">{rows.length} siswa</strong>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden shadow-sm print:shadow-none print:border-none">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full table-auto text-xs text-left border-collapse print-report-table">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
              <tr>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">No</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap print:bg-[#0f2744]">NIS</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap print:bg-[#0f2744]">Nama Santri</th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">Kelas</th>
                {annualTypes.map(a => (
                  <th key={a.id} className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">
                    {a.name}
                  </th>
                ))}
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">Total Paket</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">Terbayar</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap bg-slate-100/50 dark:bg-slate-800/50 print:bg-[#0f2744] print:text-white">Sisa Tagihan</th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={5 + annualTypes.length} className="py-8 text-center text-slate-400">
                    Memuat data daftar ulang...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5 + annualTypes.length} className="py-8 text-center text-slate-400">
                    Tidak ada santri yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-2 text-center font-medium text-slate-400 whitespace-nowrap">{idx + 1}</td>
                    <td className="py-2 px-2.5 font-medium whitespace-nowrap">{row.nis}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] print:bg-transparent print:p-0 font-medium whitespace-nowrap">
                        {row.class_name}
                      </span>
                    </td>
                    {annualTypes.map(a => {
                      const item = row.items[a.id];
                      if (!item || item.status === 'BUKAN_SASARAN') {
                        return <td key={a.id} className="py-2 px-2 text-center text-slate-400 font-mono whitespace-nowrap">-</td>;
                      }
                      return (
                        <td key={a.id} className="py-2 px-2 text-right whitespace-nowrap">
                          {item.status === 'LUNAS' ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              Lunas
                            </span>
                          ) : item.paid > 0 ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              {formatRupiah(item.remaining)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                              {formatRupiah(item.remaining)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right font-medium whitespace-nowrap">{formatRupiah(row.total_nominal)}</td>
                    <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                      {formatRupiah(row.total_dibayar)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white bg-slate-50/60 dark:bg-slate-800/30 whitespace-nowrap">
                      {row.total_kurang > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">{formatRupiah(row.total_kurang)}</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Rp 0</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <span className={`print-status-tag ${
                        row.status === 'Lunas'
                          ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                          : row.status === 'Sebagian'
                          ? 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                          : row.status === '-'
                          ? 'border-slate-300 text-slate-500 bg-slate-100 dark:bg-slate-800'
                          : 'border-rose-500 text-rose-700 bg-rose-50 dark:bg-rose-950/40'
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
        title="LAPORAN BIAYA DAFTAR ULANG TAHUNAN"
        subtitle="Rekapitulasi Pelunasan Komponen Pangkal Gedung, Seragam, Kitab, Sarpras, dan Kegiatan Santri"
        filterInfo={selectedClass ? `Tingkat Kelas: ${selectedClass}` : 'Semua Tingkat Kelas'}
        summaryMetrics={[
          { label: 'Total Santri Terdata', value: `${rows.length} Santri` },
          { label: 'Total Tagihan Paket', value: formatRupiah(totalNominalAll) },
          { label: 'Realisasi Diterima', value: formatRupiah(totalDibayarAll) },
          { label: 'Sisa Piutang Daftar Ulang', value: formatRupiah(totalKurangAll), highlight: true }
        ]}
        fileName={`LAPORAN_DAFTAR_ULANG_${selectedClass || 'SEMUA'}`}
        wideContent={annualTypes.length >= 4}
      >
        <div className="w-full">
          <table className="table-auto w-full text-left text-[8.5pt] border-collapse border border-slate-300">
            <thead className="bg-[#0f2744] text-white font-bold">
              <tr>
                <th className="py-2.5 px-2 text-center whitespace-nowrap border border-slate-400">No</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap border border-slate-400">NIS</th>
                <th className="py-2.5 px-3 text-left whitespace-nowrap border border-slate-400">Nama Santri</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap border border-slate-400">Kelas</th>
                {annualTypes.map(a => (
                  <th key={a.id} className="py-2.5 px-2 text-center whitespace-nowrap border border-slate-400">
                    {a.name}
                  </th>
                ))}
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap border border-slate-400">Total Paket</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap border border-slate-400">Terbayar</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap border border-slate-400">Sisa Tagihan</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap border border-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row: any, idx: number) => (
                <tr key={row.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="py-1.5 px-2 text-center text-slate-500 border border-slate-300 whitespace-nowrap">{idx + 1}</td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-800 border border-slate-300 whitespace-nowrap">{row.nis}</td>
                  <td className="py-1.5 px-3 font-bold text-slate-900 border border-slate-300 whitespace-nowrap">{row.name}</td>
                  <td className="py-1.5 px-2 text-center font-semibold text-slate-700 border border-slate-300 whitespace-nowrap">{row.class_name}</td>
                  {annualTypes.map(a => {
                    const item = row.items[a.id];
                    return (
                      <td key={a.id} className="py-1.5 px-2 text-center text-[8pt] border border-slate-300 whitespace-nowrap">
                        {!item || item.status === 'BUKAN_SASARAN' ? (
                          <span className="text-slate-400">-</span>
                        ) : item.status === 'LUNAS' ? (
                          <span className="font-bold text-emerald-800">Lunas</span>
                        ) : (
                          <span className="font-semibold text-rose-700">{formatRupiah(item.remaining)}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-2.5 text-right font-medium text-slate-900 border border-slate-300 whitespace-nowrap">
                    {formatRupiah(row.total_nominal)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-bold text-emerald-800 border border-slate-300 whitespace-nowrap">
                    {formatRupiah(row.total_dibayar)}
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-bold border border-slate-300 whitespace-nowrap">
                    {row.total_kurang > 0 ? (
                      <span className="text-rose-700">{formatRupiah(row.total_kurang)}</span>
                    ) : (
                      <span className="text-emerald-700">Rp 0</span>
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
                <td colSpan={4 + annualTypes.length} className="py-2.5 px-3 text-center uppercase tracking-wider font-extrabold text-[9pt] border border-slate-300 whitespace-nowrap">
                  Total Akumulasi Seluruh Santri ({rows.length} Santri)
                </td>
                <td className="py-2.5 px-2.5 text-right font-extrabold text-[9pt] text-slate-950 border border-slate-300 whitespace-nowrap">
                  {formatRupiah(totalNominalAll)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-extrabold text-[9pt] text-emerald-800 border border-slate-300 whitespace-nowrap">
                  {formatRupiah(totalDibayarAll)}
                </td>
                <td className="py-2.5 px-2.5 text-right font-black text-[9.5pt] text-rose-800 border border-slate-300 whitespace-nowrap">
                  {formatRupiah(totalKurangAll)}
                </td>
                <td className="py-2.5 px-2 text-center text-[8pt] border border-slate-300 whitespace-nowrap">
                  {totalKurangAll === 0 ? '100% Lunas' : 'Belum Lunas'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportPdfModal>
    </div>
  );
};
