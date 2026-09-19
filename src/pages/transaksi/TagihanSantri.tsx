import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, Search, Filter, PlusCircle, CreditCard, Calendar, CheckCircle2, ArrowRight, Eye, Sparkles } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { Bill, Student } from '../../types';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { useNotification } from '../../context/NotificationContext';
import { useAvailableClasses } from '../../context/SchoolContext';
import { PageView } from '../../components/layout/Sidebar';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

interface TagihanSantriProps {
  onNavigate: (page: PageView) => void;
}

export const TagihanSantri: React.FC<TagihanSantriProps> = ({ onNavigate }) => {
  const availableClasses = useAvailableClasses();
  const [bills, setBills] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Manual Bill Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    student_id: '',
    category: 'LAINNYA',
    bill_name: '',
    amount: 500000,
    due_date: '2026-09-30'
  });

  const { success, error } = useNotification();

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [billsData, stdData] = await Promise.all([
        api.billing.getAll({
          search,
          category: categoryFilter,
          status: statusFilter,
          class_name: classFilter,
          limit: '200'
        }),
        api.students.getAll({ status: 'Aktif' })
      ]);
      setBills(billsData);
      setStudents(stdData);
      if (stdData.length > 0 && !manualForm.student_id) {
        setManualForm(prev => ({ ...prev, student_id: stdData[0].id }));
      }
    } catch (err: any) {
      if (!silent) error(err.message || 'Gagal memuat daftar tagihan');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter, statusFilter, classFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Realtime multi-device sync (silent background update)
  useRealtimeSync(() => loadData(true));

  // Submit Manual Bill
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.student_id || !manualForm.bill_name || !manualForm.amount) {
      error('Santri, nama tagihan, dan nominal wajib diisi');
      return;
    }

    try {
      await api.billing.createManualBill(manualForm);
      success(`Tagihan manual "${manualForm.bill_name}" berhasil dibuat`);
      setIsManualModalOpen(false);
      setManualForm({
        student_id: students[0]?.id || '',
        category: 'LAINNYA',
        bill_name: '',
        amount: 500000,
        due_date: '2026-09-30'
      });
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal membuat tagihan manual');
    }
  };

  const totalBeban = bills.reduce((sum, b) => sum + b.amount, 0);
  const totalLunas = bills.reduce((sum, b) => sum + b.paid_amount, 0);
  const totalSisa = bills.reduce((sum, b) => sum + b.remaining_amount, 0);

  // Detail Modal State
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any | null>(null);

  // Group bills by student for 1 row per student presentation
  const groupedStudentBills = useMemo(() => {
    const map = new Map<string, {
      student_id: string;
      student_name: string;
      student_nis: string;
      student_class: string;
      bills: any[];
      total_amount: number;
      total_paid: number;
      total_remaining: number;
      overall_status: 'LUNAS' | 'SEBAGIAN' | 'TUNGGAKAN' | 'BELUM_BAYAR';
      earliest_due_date?: string;
      latest_due_date?: string;
    }>();

    for (const b of bills) {
      const sId = b.student_id;
      if (!map.has(sId)) {
        map.set(sId, {
          student_id: sId,
          student_name: b.student_name,
          student_nis: b.student_nis,
          student_class: b.student_class,
          bills: [],
          total_amount: 0,
          total_paid: 0,
          total_remaining: 0,
          overall_status: 'LUNAS',
          earliest_due_date: b.due_date,
          latest_due_date: b.due_date
        });
      }
      const entry = map.get(sId)!;
      entry.bills.push(b);
      entry.total_amount += Number(b.amount || 0);
      entry.total_paid += Number(b.paid_amount || 0);
      entry.total_remaining += Number(b.remaining_amount || 0);
      if (b.due_date && (!entry.earliest_due_date || b.due_date < entry.earliest_due_date)) {
        entry.earliest_due_date = b.due_date;
      }
      if (b.due_date && (!entry.latest_due_date || b.due_date > entry.latest_due_date)) {
        entry.latest_due_date = b.due_date;
      }
    }

    for (const entry of map.values()) {
      if (entry.total_remaining <= 0) {
        entry.overall_status = 'LUNAS';
      } else if (entry.total_paid > 0) {
        entry.overall_status = 'SEBAGIAN';
      } else {
        const hasOverdue = entry.bills.some(b => b.status === 'TUNGGAKAN');
        entry.overall_status = hasOverdue ? 'TUNGGAKAN' : 'BELUM_BAYAR';
      }
    }

    return Array.from(map.values());
  }, [bills]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Buku Besar Tagihan Santri Terpadu
          </h2>
          <p className="text-xs text-slate-500">
            Eksplorasi seluruh pos tagihan SPP, Eskul, Daftar Ulang, dan pos tagihan lainnya per santri
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all transform active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Buat Tagihan Manual / Custom</span>
          </button>
        </div>
      </div>

      {/* Summary Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
          <span className="text-[11px] text-slate-500 font-semibold">Total Nilai Tagihan:</span>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{formatRupiah(totalBeban)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 backdrop-blur-md">
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Realisasi Pembayaran:</span>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatRupiah(totalLunas)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/40 backdrop-blur-md">
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">Total Sisa / Tunggakan:</span>
          <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">{formatRupiah(totalSisa)}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari santri, NIS, atau tagihan..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
          >
            <option value="">Semua Kategori Tagihan</option>
            <option value="SPP">SPP Bulanan</option>
            <option value="ESKUL">Ekstrakurikuler</option>
            <option value="DAFTAR_ULANG">Daftar Ulang</option>
            <option value="TAHUNAN">Tahunan / Uang Pangkal</option>
            <option value="LAINNYA">Tagihan Lainnya / Custom</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="TUNGGAKAN">Tunggakan (Jatuh Tempo)</option>
            <option value="SEBAGIAN">Sebagian (Dicicil)</option>
            <option value="BELUM_BAYAR">Belum Bayar</option>
            <option value="LUNAS">Lunas</option>
          </select>

          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none"
          >
            <option value="">Semua Kelas</option>
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>Kelas {cls}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Bills Table - 1 Row per Student */}
      <GlassCard className="p-0 overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="w-full overflow-x-auto overscroll-x-contain -webkit-overflow-scrolling-touch">
          <table className="w-full min-w-[850px] text-xs text-left border-collapse">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3.5 text-center w-12 whitespace-nowrap">No</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Santri / Siswa</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Kelas</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Rincian Pos Tagihan</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Total Tagihan</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Total Dibayar</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Sisa Tunggakan</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Memuat daftar tagihan santri...
                  </td>
                </tr>
              ) : groupedStudentBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada santri dan tagihan yang sesuai filter
                  </td>
                </tr>
              ) : (
                groupedStudentBills.map((s, idx) => (
                  <tr key={s.student_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3.5 text-center font-medium text-slate-400 text-xs whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">{s.student_name}</div>
                      <div className="text-[11px] text-slate-400 font-normal whitespace-nowrap">
                        NIS: {s.student_nis}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      Kelas {s.student_class}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentDetail(s)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 font-bold text-xs border border-blue-200/70 dark:border-blue-800/70 transition-colors cursor-pointer whitespace-nowrap"
                          title="Klik untuk melihat rincian seluruh tagihan santri ini"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{s.bills.length} Pos Tagihan</span>
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[220px] whitespace-nowrap" title={s.bills.map(b => b.bill_name).join(', ')}>
                          {s.bills[0]?.bill_name}
                          {s.bills.length > 1 && ` (+${s.bills.length - 1} lainnya)`}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                      {formatRupiah(s.total_amount)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap">
                      {formatRupiah(s.total_paid)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-black text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap">
                      {formatRupiah(s.total_remaining)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <Badge status={s.overall_status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentDetail(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-all border border-blue-200 dark:border-blue-800 cursor-pointer shadow-sm whitespace-nowrap active:scale-95"
                          title="Lihat rincian tagihan santri"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          <span>Detail</span>
                        </button>

                        {s.overall_status !== 'LUNAS' ? (
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem('selected_payment_student_id', s.student_id);
                              onNavigate('transaksi_input');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all whitespace-nowrap active:scale-95 cursor-pointer"
                            title="Buka kasir pembayaran untuk santri ini"
                          >
                            <CreditCard className="w-3.5 h-3.5 shrink-0" />
                            <span>Bayar</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-semibold whitespace-nowrap">Lunas</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* DETAIL MODAL RINCIAN TAGIHAN SANTRI */}
      <Modal
        isOpen={Boolean(selectedStudentDetail)}
        onClose={() => setSelectedStudentDetail(null)}
        title={`Rincian Tagihan Santri: ${selectedStudentDetail?.student_name || ''}`}
        subtitle={`NIS: ${selectedStudentDetail?.student_nis || ''} • Kelas ${selectedStudentDetail?.student_class || ''}`}
        maxWidth="3xl"
      >
        {selectedStudentDetail && (
          <div className="space-y-4 text-xs">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Total Beban Tagihan:</span>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  {formatRupiah(selectedStudentDetail.total_amount)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">Total Terbayar:</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatRupiah(selectedStudentDetail.total_paid)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
                <span className="text-rose-700 dark:text-rose-400 font-medium">Sisa Tunggakan:</span>
                <p className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatRupiah(selectedStudentDetail.total_remaining)}
                </p>
              </div>
            </div>

            {/* Bills List Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3 whitespace-nowrap">No</th>
                    <th className="py-2 px-3 whitespace-nowrap">Nama Pos Tagihan</th>
                    <th className="py-2 px-3 whitespace-nowrap">Kategori</th>
                    <th className="py-2 px-3 whitespace-nowrap">Jatuh Tempo</th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Tarif</th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Dibayar</th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Sisa</th>
                    <th className="py-2 px-3 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedStudentDetail.bills.map((b: any, idx: number) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3 text-slate-400 font-medium whitespace-nowrap">{idx + 1}</td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {b.bill_name}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                          {b.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateIndo(b.due_date)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {formatRupiah(b.amount)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatRupiah(b.paid_amount)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatRupiah(b.remaining_amount)}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <Badge status={b.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 whitespace-nowrap">
                Total {selectedStudentDetail.bills.length} pos tagihan terdata
              </span>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setSelectedStudentDetail(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  Tutup
                </button>
                {selectedStudentDetail.overall_status !== 'LUNAS' && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('selected_payment_student_id', selectedStudentDetail.student_id);
                      setSelectedStudentDetail(null);
                      onNavigate('transaksi_input');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span>Buka Pembayaran Santri Ini</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE MANUAL BILL MODAL */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Buat Tagihan Manual / Custom"
        subtitle="Tambahkan pos tagihan ad-hoc untuk santri (Study Tour, Laundry, Asrama, dll.)"
        maxWidth="md"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1">Pilih Santri *</label>
            <select
              required
              value={manualForm.student_id}
              onChange={e => setManualForm({ ...manualForm, student_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.nis}) - Kelas {s.class_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Kategori Tagihan</label>
            <select
              value={manualForm.category}
              onChange={e => setManualForm({ ...manualForm, category: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
            >
              <option value="LAINNYA">Tagihan Khusus / Lainnya</option>
              <option value="TAHUNAN">Tahunan / Uang Kegiatan</option>
              <option value="DAFTAR_ULANG">Daftar Ulang</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Nama Tagihan *</label>
            <input
              type="text"
              required
              value={manualForm.bill_name}
              onChange={e => setManualForm({ ...manualForm, bill_name: e.target.value })}
              placeholder="Contoh: Study Tour Jogja 2026, Laundry Khusus"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Nominal Tagihan (Rp) *</label>
            <input
              type="number"
              required
              min={1000}
              step={10000}
              value={manualForm.amount}
              onChange={e => setManualForm({ ...manualForm, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-bold text-brand-600 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Tanggal Jatuh Tempo *</label>
            <input
              type="date"
              required
              value={manualForm.due_date}
              onChange={e => setManualForm({ ...manualForm, due_date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/30"
            >
              Terbitkan Tagihan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
