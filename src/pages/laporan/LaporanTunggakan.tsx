import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, Printer, MessageCircle, Filter, Phone, Calendar, FileText, Eye, CheckCircle } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { useAvailableClasses } from '../../context/SchoolContext';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { ReportPrintHeader } from '../../components/laporan/ReportPrintHeader';
import { ReportPrintFooter } from '../../components/laporan/ReportPrintFooter';
import { ReportPdfModal } from '../../components/laporan/ReportPdfModal';

export const LaporanTunggakan: React.FC = () => {
  const availableClasses = useAvailableClasses();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Filters
  const [selectedClass, setSelectedClass] = useState('');

  // View / Detail Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<any>(null);

  // WhatsApp Modal State
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [selectedStudentForWa, setSelectedStudentForWa] = useState<{
    id: string;
    name: string;
    phone: string;
    message: string;
  } | null>(null);

  const { success, error } = useNotification();

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await api.reports.getTunggakan({
        class_name: selectedClass
      });
      setData(res);
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat laporan tunggakan');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useRealtimeSync(() => {
    loadData(true);
  });

  useEffect(() => {
    loadData(false);
  }, [selectedClass]);

  const summary = data?.summary || {
    total_students_overdue: 0,
    total_overdue_amount: 0,
    spp_overdue_amount: 0,
    eskul_overdue_amount: 0,
    annual_overdue_amount: 0
  };

  const rows: any[] = data?.rows || [];

  const handleOpenWaModal = (row: any) => {
    const defaultMsg = `Assalamu'alaikum Warahmatullahi Wabarakatuh,\n\nYth. Orang Tua/Wali dari ananda *${row.name}* (Kelas ${row.class_name}).\n\nKami menginformasikan bahwa saat ini terdapat kewajiban administrasi sekolah yang telah jatuh tempo dengan rincian sbb:\n\n*Rincian Tagihan:*\n${row.bill_details}\n\n*Total Tunggakan:* *${formatRupiah(row.total_arrears)}*\n\nMohon untuk segera melakukan pembayaran atau konfirmasi ke bagian administrasi/keuangan sekolah.\n\n_Jazakumullahu Khairan Katsiran_,\n*Bendahara Imam Muzani Boarding School*`;

    setSelectedStudentForWa({
      id: row.id,
      name: row.name,
      phone: row.parent_phone || '',
      message: defaultMsg
    });
    setWaModalOpen(true);
  };

  const handleExportExcel = () => {
    if (rows.length === 0) return;
    const headers = [
      'No', 'NIS', 'Nama Santri', 'Kelas', 'No HP Wali',
      'Tunggakan SPP', 'Tunggakan Eskul', 'Tunggakan Dftr Ulang',
      'Total Tunggakan', 'Jatuh Tempo Terlama', 'Rincian Tagihan'
    ];
    const exportRows = rows.map((r, i) => [
      i + 1,
      r.nis,
      r.name,
      r.class_name,
      r.parent_phone || '-',
      r.spp_arrears || 0,
      r.eskul_arrears || 0,
      r.annual_arrears || 0,
      r.total_arrears || 0,
      r.earliest_due_date ? formatDateIndo(r.earliest_due_date) : '-',
      r.bill_details || '-'
    ]);

    exportTableToExcel('LAPORAN_TUNGGAKAN_SANTRI_IMBS', 'Tunggakan Santri', headers, exportRows);
    success('Laporan tunggakan berhasil diekspor ke Excel');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Official Letterhead Header (Only in Print) */}
      <ReportPrintHeader
        title="LAPORAN TUNGGAKAN & PIUTANG SANTRI"
        subtitle="Daftar Santri Yang Memiliki Kewajiban Biaya Pendidikan Jatuh Tempo"
        filterInfo={selectedClass ? `Tingkat Kelas: ${selectedClass}` : 'Semua Tingkat Kelas'}
        summaryMetrics={[
          { label: 'Santri Menunggak', value: `${summary.total_students_overdue} Siswa` },
          { label: 'Tunggakan SPP', value: formatRupiah(summary.spp_overdue_amount) },
          { label: 'Tunggakan Eskul', value: formatRupiah(summary.eskul_overdue_amount) },
          { label: 'Tunggakan Dftr Ulang', value: formatRupiah(summary.annual_overdue_amount) },
          { label: 'Total Piutang Sekolah', value: formatRupiah(summary.total_overdue_amount), highlight: true }
        ]}
      />

      {/* Screen Interactive Header, Summary, & Filters (Hidden in Print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span>Laporan Tunggakan & Tagihan Jatuh Tempo</span>
            </h2>
            <p className="text-xs text-slate-500">
              Daftar santri yang memiliki tunggakan biaya pendidikan beserta tindak lanjut notifikasi WhatsApp
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <GlassCard className="p-3.5 border-l-4 border-l-rose-500">
            <p className="text-[11px] font-medium text-slate-500">Santri Menunggak</p>
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {summary.total_students_overdue} <span className="text-xs font-normal text-slate-400">orang</span>
            </h3>
            <p className="text-[10px] text-rose-500/80 mt-0.5">Memiliki sisa tagihan</p>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-amber-500">
            <p className="text-[11px] font-medium text-slate-500">Total Nominal Tunggakan</p>
            <h3 className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1 truncate">
              {formatRupiah(summary.total_overdue_amount)}
            </h3>
            <p className="text-[10px] text-amber-500/80 mt-0.5">Akumulasi seluruh pos</p>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-blue-500">
            <p className="text-[11px] font-medium text-slate-500">Tunggakan SPP</p>
            <h3 className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1 truncate">
              {formatRupiah(summary.spp_overdue_amount)}
            </h3>
            <p className="text-[10px] text-blue-500/80 mt-0.5">SPP bulanan tertunda</p>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-indigo-500">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tunggakan Eskul</p>
            <h3 className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-1 truncate">
              {formatRupiah(summary.eskul_overdue_amount)}
            </h3>
            <p className="text-[10px] text-indigo-500/80 mt-0.5">Iuran eskul santri</p>
          </GlassCard>

          <GlassCard className="p-3.5 border-l-4 border-l-purple-500">
            <p className="text-[11px] font-medium text-slate-500">Tunggakan Daftar Ulang</p>
            <h3 className="text-base font-bold text-purple-600 dark:text-purple-400 mt-1 truncate">
              {formatRupiah(summary.annual_overdue_amount)}
            </h3>
            <p className="text-[10px] text-purple-500/80 mt-0.5">Tahunan & seragam</p>
          </GlassCard>
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
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer font-medium"
              >
                <option value="">Semua Kelas</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Ditemukan: <strong className="text-slate-900 dark:text-white">{rows.length} santri</strong> memiliki tunggakan
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden border border-slate-200/80 dark:border-slate-800 print:border-none print:shadow-none">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[900px] table-auto text-left text-xs border-collapse print-report-table">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">No</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap print:bg-[#0f2744]">NIS</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap print:bg-[#0f2744]">Nama Santri</th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap print:bg-[#0f2744]">Kelas</th>
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap print:bg-[#0f2744]">Rincian Pos Tunggakan</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">SPP</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">Eskul</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap print:bg-[#0f2744]">Daftar Ulang</th>
                <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 print:bg-[#0f2744] print:text-white">Total Tunggakan</th>
                <th className="py-2.5 px-2 font-semibold text-center whitespace-nowrap no-print print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Memuat data santri menunggak...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                    Alhamdulillah, tidak ada santri yang menunggak dengan kriteria ini.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-2 text-center font-medium text-slate-400 whitespace-nowrap">{idx + 1}</td>
                    <td className="py-2.5 px-2.5 font-medium whitespace-nowrap">{row.nis}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <p className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">{row.name}</p>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
                        <Phone className="w-3 h-3 text-slate-400 print:hidden" />
                        <span>{row.parent_phone || '-'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium print:bg-transparent print:p-0 whitespace-nowrap">
                        {row.class_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap" title={row.bill_details}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100/80 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                          {row.unpaid_count || row.unpaid_bills?.length || 1} Pos
                        </span>
                        {row.spp_arrears > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            SPP
                          </span>
                        )}
                        {row.eskul_arrears > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Eskul
                          </span>
                        )}
                        {row.annual_arrears > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Dftr Ulang
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {row.spp_arrears > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-medium">{formatRupiah(row.spp_arrears)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {row.eskul_arrears > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">{formatRupiah(row.eskul_arrears)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {row.annual_arrears > 0 ? (
                        <span className="text-purple-600 dark:text-purple-400 font-medium">{formatRupiah(row.annual_arrears)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/10 whitespace-nowrap">
                      {formatRupiah(row.total_arrears)}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap no-print print:hidden">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentForDetail(row);
                            setIsDetailModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-all active:scale-95 cursor-pointer shadow-xs"
                          title="Lihat rincian lengkap tunggakan santri"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenWaModal(row)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                          title="Kirim pengingat tagihan lewat WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Kirim WA</span>
                        </button>
                      </div>
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

      {/* Modal Detail Rincian Tunggakan */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedStudentForDetail(null);
        }}
        title="Rincian Pos Tunggakan Santri"
        maxWidth="3xl"
      >
        {selectedStudentForDetail && (
          <div className="space-y-4">
            {/* Student Info Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedStudentForDetail.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  NIS: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedStudentForDetail.nis}</span> • 
                  Kelas: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedStudentForDetail.class_name}</span> • 
                  No. HP Wali: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedStudentForDetail.parent_phone || '-'}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-500 block">Total Tunggakan</span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                  {formatRupiah(selectedStudentForDetail.total_arrears)}
                </span>
              </div>
            </div>

            {/* 4 Mini Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
                <p className="text-[10px] text-slate-500 font-medium">Total Piutang</p>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                  {formatRupiah(selectedStudentForDetail.total_arrears)}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                <p className="text-[10px] text-slate-500 font-medium">Tunggakan SPP</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                  {formatRupiah(selectedStudentForDetail.spp_arrears)}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <p className="text-[10px] text-slate-500 font-medium">Tunggakan Eskul</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                  {formatRupiah(selectedStudentForDetail.eskul_arrears)}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50">
                <p className="text-[10px] text-slate-500 font-medium">Tunggakan Dftr Ulang</p>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mt-0.5 truncate">
                  {formatRupiah(selectedStudentForDetail.annual_arrears)}
                </p>
              </div>
            </div>

            {/* Detailed Table of Unpaid Bills */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-semibold">
                    <tr>
                      <th className="py-2 px-3 text-center">No</th>
                      <th className="py-2 px-3">Kategori</th>
                      <th className="py-2 px-3">Nama Tagihan</th>
                      <th className="py-2 px-3">Jatuh Tempo</th>
                      <th className="py-2 px-3 text-right">Tagihan</th>
                      <th className="py-2 px-3 text-right">Sudah Bayar</th>
                      <th className="py-2 px-3 text-right text-rose-600 dark:text-rose-400">Sisa Tunggakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedStudentForDetail.unpaid_bills && selectedStudentForDetail.unpaid_bills.length > 0 ? (
                      selectedStudentForDetail.unpaid_bills.map((bill: any, bIdx: number) => (
                        <tr key={bIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 text-center text-slate-400">{bIdx + 1}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              bill.category === 'SPP'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                : bill.category === 'ESKUL'
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                            }`}>
                              {bill.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                            {bill.bill_name}
                          </td>
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                            {bill.due_date ? formatDateIndo(bill.due_date) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {formatRupiah(bill.amount)}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                            {bill.paid_amount > 0 ? formatRupiah(bill.paid_amount) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                            {formatRupiah(bill.remaining_amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-slate-400">
                          Tidak ada detail tunggakan yang tercatat.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedStudentForDetail(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const st = selectedStudentForDetail;
                  setIsDetailModalOpen(false);
                  setSelectedStudentForDetail(null);
                  handleOpenWaModal(st);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Kirim Pengingat WhatsApp</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* WhatsApp Modal (Hidden in Print) */}
      <div className="no-print print:hidden">
        {selectedStudentForWa && (
          <WhatsAppModal
            isOpen={waModalOpen}
            onClose={() => {
              setWaModalOpen(false);
              setSelectedStudentForWa(null);
            }}
            studentId={selectedStudentForWa.id}
            studentName={selectedStudentForWa.name}
            recipientPhone={selectedStudentForWa.phone}
            initialMessage={selectedStudentForWa.message}
            onSuccess={() => {
              loadData();
            }}
          />
        )}
      </div>

      {/* PDF PREVIEW MODAL - PROPORTIONAL FIXED LAYOUT (NO OVERFLOW) */}
      <ReportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="LAPORAN TUNGGAKAN & PIUTANG SANTRI"
        subtitle="Daftar Santri Yang Memiliki Kewajiban Biaya Pendidikan Jatuh Tempo"
        filterInfo={selectedClass ? `Tingkat Kelas: ${selectedClass}` : 'Semua Tingkat Kelas'}
        summaryMetrics={[
          { label: 'Santri Menunggak', value: `${summary.total_students_overdue} Siswa` },
          { label: 'Tunggakan SPP', value: formatRupiah(summary.spp_overdue_amount) },
          { label: 'Tunggakan Eskul', value: formatRupiah(summary.eskul_overdue_amount) },
          { label: 'Tunggakan Dftr Ulang', value: formatRupiah(summary.annual_overdue_amount) },
          { label: 'Total Piutang Sekolah', value: formatRupiah(summary.total_overdue_amount), highlight: true }
        ]}
        fileName={`LAPORAN_TUNGGAKAN_SANTRI_${selectedClass || 'SEMUA'}`}
        orientation="landscape"
        paperFormat="a4"
      >
        <div className="w-full">
          <table className="w-full table-fixed text-left text-[8pt] border-collapse border border-slate-300">
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '19%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead className="bg-[#0f2744] text-white font-bold">
              <tr>
                <th className="py-2 px-1 text-center border border-slate-400">No</th>
                <th className="py-2 px-2 text-center border border-slate-400">NIS</th>
                <th className="py-2 px-2.5 text-left border border-slate-400">Nama Santri</th>
                <th className="py-2 px-1 text-center border border-slate-400">Kelas</th>
                <th className="py-2 px-2 text-left border border-slate-400">Rincian Pos Tunggakan</th>
                <th className="py-2 px-2 text-right border border-slate-400">Tgk. SPP</th>
                <th className="py-2 px-2 text-right border border-slate-400">Tgk. Eskul</th>
                <th className="py-2 px-2 text-right border border-slate-400">Tgk. Dftr Ulang</th>
                <th className="py-2 px-2 text-right border border-slate-400">Total Piutang</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row: any, idx: number) => (
                <tr key={row.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="py-1.5 px-1 text-center text-slate-500 border border-slate-300">{idx + 1}</td>
                  <td className="py-1.5 px-2 text-center font-medium text-slate-800 border border-slate-300">{row.nis}</td>
                  <td className="py-1.5 px-2.5 font-bold text-slate-900 border border-slate-300 truncate" title={row.name}>{row.name}</td>
                  <td className="py-1.5 px-1 text-center font-semibold text-slate-700 border border-slate-300">{row.class_name}</td>
                  <td className="py-1.5 px-2 text-slate-700 border border-slate-300 overflow-hidden">
                    <div className="font-semibold text-slate-800 text-[8pt]">
                      {row.unpaid_count || row.unpaid_bills?.length || 1} Pos Tunggakan
                    </div>
                    <div className="text-[7pt] text-slate-500 leading-tight line-clamp-2" title={row.bill_details}>
                      {row.bill_details}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 text-right border border-slate-300">
                    {row.spp_arrears > 0 ? (
                      <span className="text-rose-700 font-semibold">{formatRupiah(row.spp_arrears)}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right border border-slate-300">
                    {row.eskul_arrears > 0 ? (
                      <span className="text-amber-700 font-semibold">{formatRupiah(row.eskul_arrears)}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right border border-slate-300">
                    {row.annual_arrears > 0 ? (
                      <span className="text-purple-700 font-semibold">{formatRupiah(row.annual_arrears)}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 text-right font-black text-rose-800 border border-slate-300">
                    {formatRupiah(row.total_arrears)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-800 font-bold text-slate-900">
              <tr>
                <td colSpan={5} className="py-2 px-2 text-center uppercase tracking-wider font-extrabold text-[8.5pt] border border-slate-300">
                  Total Piutang Tunggakan ({summary.total_students_overdue} Santri)
                </td>
                <td className="py-2 px-2 text-right font-extrabold text-[8.5pt] text-rose-800 border border-slate-300">
                  {formatRupiah(summary.spp_overdue_amount)}
                </td>
                <td className="py-2 px-2 text-right font-extrabold text-[8.5pt] text-amber-800 border border-slate-300">
                  {formatRupiah(summary.eskul_overdue_amount)}
                </td>
                <td className="py-2 px-2 text-right font-extrabold text-[8.5pt] text-purple-800 border border-slate-300">
                  {formatRupiah(summary.annual_overdue_amount)}
                </td>
                <td className="py-2 px-2 text-right font-black text-[9pt] text-rose-800 border border-slate-300">
                  {formatRupiah(summary.total_overdue_amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </ReportPdfModal>
    </div>
  );
};
