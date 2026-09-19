import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Search,
  User,
  CheckCircle2,
  Calendar,
  DollarSign,
  Printer,
  Sparkles,
  Layers,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  CheckSquare,
  Square,
  Activity,
  Plus,
  Trash2,
  FilePlus,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { useAvailableClasses } from '../../context/SchoolContext';
import { Student, Bill, PaymentMethod } from '../../types';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { useNotification } from '../../context/NotificationContext';
import { KwitansiModal } from '../../components/kwitansi/KwitansiModal';
import { KwitansiData } from '../../services/pdfGenerator';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';

export const InputPembayaran: React.FC = () => {
  const availableClasses = useAvailableClasses();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [groupedBills, setGroupedBills] = useState<{
    spp: Bill[];
    eskul: Bill[];
    annual: Bill[];
    prev_arrears: Bill[];
    khusus: Bill[];
    other: Bill[];
  }>({
    spp: [],
    eskul: [],
    annual: [],
    prev_arrears: [],
    khusus: [],
    other: []
  });

  // Filter for SPP view (All 12 months, Unpaid only, Paid only)
  const [sppFilter, setSppFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  // Filter for Eskul views per eskul id
  const [eskulFilters, setEskulFilters] = useState<Record<string, 'all' | 'unpaid' | 'paid'>>({});
  const [collapsedEskuls, setCollapsedEskuls] = useState<Record<string, boolean>>({});

  // Manual / Optional Payment Items State
  const [manualItems, setManualItems] = useState<Array<{ id: string; name: string; amount: number; notes?: string }>>([]);
  const [manualName, setManualName] = useState<string>('');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');

  // Payment State
  const [selectedBillIds, setSelectedBillIds] = useState<Record<string, boolean>>({});
  const [allocatedAmounts, setAllocatedAmounts] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash/Tunai Langsung');
  const [discount, setDiscount] = useState<number>(0);
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Search & Filter
  const [studentSearch, setStudentSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Receipt Modal Popup
  const [receiptData, setReceiptData] = useState<KwitansiData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const { user } = useAuth();
  const { success, error, warning } = useNotification();

  // Helper to format clean SPP title without year e.g. "SPP Desember"
  const getSppTitle = (bill: Bill) => {
    if (bill.period_month) {
      return `SPP ${bill.period_month}`;
    }
    return bill.bill_name.replace(/\s+\d{4}$/, '').trim();
  };

  // Helper to format clean Eskul month title without year e.g. "Desember"
  const getEskulMonthTitle = (bill: Bill) => {
    if (bill.period_month) {
      return bill.period_month;
    }
    let name = bill.bill_name;
    if (name.includes(' - ')) {
      name = name.split(' - ')[1] || name;
    }
    return name.replace(/\s+\d{4}$/, '').trim();
  };

  // Load students list - Sorted Alphabetically (A-Z)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await api.students.getAll({
          search: studentSearch,
          class_name: classFilter,
          status: 'Aktif'
        });
        // Sort students alphabetically (A-Z) by name
        const sortedStudents = [...res].sort((a, b) =>
          a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
        );
        setStudents(sortedStudents);
        const preSelected = localStorage.getItem('selected_payment_student_id');
        if (preSelected && sortedStudents.some(s => s.id === preSelected)) {
          setSelectedStudentId(preSelected);
          localStorage.removeItem('selected_payment_student_id');
        } else if (sortedStudents.length > 0 && (!selectedStudentId || !sortedStudents.some(s => s.id === selectedStudentId))) {
          setSelectedStudentId(sortedStudents[0].id);
        }
      } catch (err) {
        console.error('Error fetching students for payment:', err);
      }
    };
    fetchStudents();
  }, [studentSearch, classFilter]);

  // Load student bills when student selected
  useEffect(() => {
    if (!selectedStudentId) return;

    const fetchBills = async () => {
      try {
        const res = await api.billing.getStudentBills(selectedStudentId);
        const studentFromList = students.find(s => s.id === selectedStudentId);
        setSelectedStudent({
          ...studentFromList,
          ...res.student,
          spp_type_name: res.student?.spp_type_name || studentFromList?.spp_type_name || 'SPP Reguler',
          spp_amount: (res.student?.spp_amount !== undefined && res.student?.spp_amount !== null && res.student?.spp_amount > 0)
            ? res.student.spp_amount
            : (studentFromList?.spp_amount || 0)
        });
        setBills(res.bills);
        setGroupedBills(res.grouped);

        // Reset selections & manual items on student switch
        setSelectedBillIds({});
        setManualItems([]);
        const initialAllocations: Record<string, number> = {};
        for (const b of res.bills) {
          initialAllocations[b.id] = b.remaining_amount;
        }
        setAllocatedAmounts(initialAllocations);
      } catch (err) {
        console.error('Error loading student bills:', err);
      }
    };
    fetchBills();
  }, [selectedStudentId]);

  // Handle bill toggle selection
  const handleToggleBill = (billId: string, remaining: number) => {
    const nextChecked = !selectedBillIds[billId];
    setSelectedBillIds(prev => ({ ...prev, [billId]: nextChecked }));

    if (nextChecked && !allocatedAmounts[billId]) {
      setAllocatedAmounts(prev => ({ ...prev, [billId]: remaining }));
    }
  };

  // Handle custom allocation amount change (supports partial/installment)
  const handleAmountChange = (billId: string, val: number, maxRemain: number) => {
    const safeVal = Math.max(0, Math.min(val, maxRemain));
    setAllocatedAmounts(prev => ({ ...prev, [billId]: safeVal }));
  };

  // Eskul grouping by category_id (eskul id)
  const eskulGroups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; monthlyFee: number; bills: Bill[] }>();
    for (const b of groupedBills.eskul || []) {
      const id = b.category_id || 'general';
      if (!map.has(id)) {
        let cleanName = b.bill_name;
        if (cleanName.includes(' - ')) {
          cleanName = cleanName.split(' - ')[0];
        } else if (cleanName.includes('(')) {
          cleanName = cleanName.replace(/\s*\([^)]*\)/, '');
        }
        cleanName = cleanName.replace(/^Eskul\s+/i, '').trim() || 'Ekstrakurikuler';

        map.set(id, {
          id,
          name: cleanName,
          monthlyFee: b.amount,
          bills: []
        });
      }
      map.get(id)!.bills.push(b);
    }
    return Array.from(map.values());
  }, [groupedBills.eskul]);

  // Select all unpaid Eskul for a specific extracurricular
  const handleSelectAllUnpaidEskul = (eskulBills: Bill[]) => {
    const newSelected = { ...selectedBillIds };
    const newAlloc = { ...allocatedAmounts };

    for (const b of eskulBills) {
      if (b.remaining_amount > 0) {
        newSelected[b.id] = true;
        newAlloc[b.id] = b.remaining_amount;
      }
    }
    setSelectedBillIds(newSelected);
    setAllocatedAmounts(newAlloc);
  };

  // Deselect all Eskul for a specific extracurricular
  const handleDeselectAllEskul = (eskulBills: Bill[]) => {
    const newSelected = { ...selectedBillIds };
    for (const b of eskulBills) {
      delete newSelected[b.id];
    }
    setSelectedBillIds(newSelected);
  };

  // Add manual / optional item to checkout
  const handleAddManualItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = manualName.trim();
    const cleanAmount = parseFloat(manualAmount);

    if (!cleanName) {
      warning('Silakan masukkan nama transaksi / pos pembayaran');
      return;
    }

    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      warning('Silakan masukkan nominal pembayaran yang valid (lebih dari Rp 0)');
      return;
    }

    const newItem = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      amount: cleanAmount,
      notes: manualNotes.trim() || undefined
    };

    setManualItems(prev => [...prev, newItem]);
    setManualName('');
    setManualAmount('');
    setManualNotes('');
    success(`Pos "${cleanName}" (${formatRupiah(cleanAmount)}) ditambahkan ke ringkasan!`);
  };

  // Remove manual item
  const handleRemoveManualItem = (id: string) => {
    setManualItems(prev => prev.filter(item => item.id !== id));
  };

  // Calculations
  const selectedBillsList = bills.filter(b => selectedBillIds[b.id]);
  const manualSubtotal = manualItems.reduce((sum, item) => sum + item.amount, 0);
  const subtotal = selectedBillsList.reduce((sum, b) => sum + (allocatedAmounts[b.id] || 0), 0) + manualSubtotal;
  const totalAmount = Math.max(0, subtotal - (discount || 0));
  const isCash = paymentMethod === 'Cash/Tunai Langsung' || paymentMethod === 'Tunai';
  const changeReturned = isCash ? Math.max(0, (cashReceived || 0) - totalAmount) : 0;
  const totalItemCount = selectedBillsList.length + manualItems.length;

  // SPP Calculations & Filters
  const totalSppCount = (groupedBills.spp || []).length;
  const paidSppCount = (groupedBills.spp || []).filter(b => b.status === 'LUNAS').length;
  const unpaidSppCount = totalSppCount - paidSppCount;

  const displayedSpp = (groupedBills.spp || []).filter(b => {
    if (sppFilter === 'unpaid') return b.status !== 'LUNAS';
    if (sppFilter === 'paid') return b.status === 'LUNAS';
    return true;
  });

  const selectedSppCount = (groupedBills.spp || []).filter(b => selectedBillIds[b.id]).length;

  // Select all unpaid SPP
  const handleSelectAllUnpaidSpp = () => {
    const newSelected = { ...selectedBillIds };
    const newAlloc = { ...allocatedAmounts };

    for (const b of groupedBills.spp) {
      if (b.remaining_amount > 0) {
        newSelected[b.id] = true;
        newAlloc[b.id] = b.remaining_amount;
      }
    }
    setSelectedBillIds(newSelected);
    setAllocatedAmounts(newAlloc);
  };

  // Deselect all SPP
  const handleDeselectAllSpp = () => {
    const newSelected = { ...selectedBillIds };
    for (const b of groupedBills.spp) {
      delete newSelected[b.id];
    }
    setSelectedBillIds(newSelected);
  };

  // Process Payment Submission
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) {
      error('Silakan pilih santri terlebih dahulu');
      return;
    }

    if (selectedBillsList.length === 0 && manualItems.length === 0) {
      warning('Pilih minimal satu tagihan atau tambahkan pembayaran pos lainnya');
      return;
    }

    // Validate allocations
    for (const b of selectedBillsList) {
      const amt = allocatedAmounts[b.id];
      if (amt === undefined || amt <= 0) {
        error(`Nominal pembayaran untuk "${b.bill_name}" harus lebih dari Rp 0`);
        return;
      }
      if (amt > b.remaining_amount) {
        error(`Nominal pembayaran untuk "${b.bill_name}" tidak boleh melebihi sisa tagihan (${formatRupiah(b.remaining_amount)})`);
        return;
      }
    }

    const allocations = selectedBillsList
      .filter(b => (allocatedAmounts[b.id] || 0) > 0)
      .map(b => ({
        billId: b.id,
        amount: allocatedAmounts[b.id]
      }));

    if (allocations.length === 0 && manualItems.length === 0) {
      warning('Pilih minimal satu tagihan atau tambahkan pos pembayaran');
      return;
    }

    if (isCash && (cashReceived || 0) < totalAmount) {
      error(`Jumlah uang tunai yang diterima (${formatRupiah(cashReceived || 0)}) kurang dari total bayar (${formatRupiah(totalAmount)})`);
      return;
    }

    setIsProcessing(true);
    try {
      const cashierId = user?.id || 'usr_super_admin';
      const cashierName = user?.name || 'Fakhrur Rodhi (Super Admin)';

      const res = await api.payments.process({
        student_id: selectedStudent.id,
        payment_method: paymentMethod,
        allocations,
        cashier_id: cashierId,
        cashier_name: cashierName,
        notes: notes || 'Pembayaran SPP / Tagihan Sekolah',
        discount,
        cash_received: isCash ? (cashReceived || totalAmount) : totalAmount,
        change_returned: changeReturned,
        manual_items: manualItems.map(item => ({
          name: item.name,
          amount: item.amount,
          notes: item.notes
        }))
      });

      // Confetti celebration!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      success(`Pembayaran berhasil! No. Kwitansi: ${res.receiptNo}`);

      // Fetch receipt data and open modal
      const receiptRes = await api.payments.getReceiptData(res.receiptNo);
      if (receiptRes && receiptRes.transaction) {
        receiptRes.transaction.cashier_name = receiptRes.transaction.cashier_name || cashierName;
      }
      setReceiptData(receiptRes);
      setIsReceiptModalOpen(true);

      // Refresh student bills & reset manual items
      const refreshRes = await api.billing.getStudentBills(selectedStudent.id);
      setBills(refreshRes.bills);
      setGroupedBills(refreshRes.grouped);
      setSelectedBillIds({});
      setAllocatedAmounts({});
      setDiscount(0);
      setCashReceived(0);
      setNotes('');
      setManualItems([]);
      setManualName('');
      setManualAmount('');
      setManualNotes('');
    } catch (err: any) {
      error(err.message || 'Gagal memproses pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Student Picker Card */}
      <GlassCard className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
              <span>Cari Santri (Nama / NIS):</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Ketik nama santri..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
              />
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Semua Kelas</option>
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-7">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Pilih Santri yang Melakukan Pembayaran:
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {[...students]
                .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }))
                .map(s => {
                  const sppLabel = s.spp_type_name
                    ? (s.spp_type_name.toLowerCase().startsWith('spp') ? s.spp_type_name : `SPP ${s.spp_type_name}`)
                    : '';
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.nis}) — Kelas {s.class_name} {sppLabel ? `— ${sppLabel}` : ''}
                    </option>
                  );
                })}
            </select>
          </div>
        </div>
      </GlassCard>

      {selectedStudent ? (
        <form onSubmit={handleSubmitPayment} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Student Summary & Bills Selector */}
          <div className="lg:col-span-8 space-y-6">
            {/* Student Profile Card */}
            <GlassCard className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-700 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-blue-950/30">
                    {selectedStudent.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                      {selectedStudent.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      NIS: {selectedStudent.nis} | Kelas {selectedStudent.class_name} ({selectedStudent.level})
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400">Tarif SPP Santri:</span>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-400">
                    {selectedStudent.spp_type_name || 'SPP'} ({formatRupiah(selectedStudent.spp_amount || 0)}/bln)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-500 text-[11px]">Total Tagihan:</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatRupiah(bills.reduce((sum, b) => sum + b.amount, 0))}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
                  <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">Telah Dibayar:</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {formatRupiah(bills.reduce((sum, b) => sum + b.paid_amount, 0))}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40">
                  <span className="text-rose-600 dark:text-rose-400 text-[11px]">Sisa / Tunggakan:</span>
                  <p className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {formatRupiah(bills.reduce((sum, b) => sum + b.remaining_amount, 0))}
                  </p>
                </div>
              </div>
            </GlassCard>

            {/* SPP Bulanan Checklist (1 Tahun Ajaran Penuh: Juli s.d. Juni) */}
            <GlassCard className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      1. Tagihan SPP Bulanan 1 Tahun Ajaran (Juli s.d. Juni)
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      12 Bulan
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Status: {paidSppCount} Lunas, {unpaidSppCount} Belum Lunas (T.A. 2026/2027)
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllUnpaidSpp}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-900 dark:bg-blue-700 hover:bg-blue-950 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Pilih Semua Belum Lunas</span>
                  </button>

                  {selectedSppCount > 0 && (
                    <button
                      type="button"
                      onClick={handleDeselectAllSpp}
                      className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition-all"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Batal Pilih</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Pills for 12 months */}
              <div className="flex items-center gap-1.5 mb-3.5 pb-2 border-b border-slate-100/80 dark:border-slate-800/60 text-xs">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Tampilkan:</span>
                <button
                  type="button"
                  onClick={() => setSppFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    sppFilter === 'all'
                      ? 'bg-blue-900 text-white shadow-sm shadow-blue-900/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Semua 12 Bulan ({totalSppCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSppFilter('unpaid')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    sppFilter === 'unpaid'
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Belum Lunas ({unpaidSppCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSppFilter('paid')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    sppFilter === 'paid'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Sudah Lunas ({paidSppCount})
                </button>
              </div>

              {/* 12 Months Grid: 3 spacious columns (3 x 4 = 12 months) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {displayedSpp.map((b: Bill) => {
                  const isChecked = Boolean(selectedBillIds[b.id]);
                  const isLunas = b.status === 'LUNAS';

                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isLunas
                          ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 opacity-80'
                          : isChecked
                          ? 'bg-blue-900/10 dark:bg-blue-950/40 border-blue-900/50 dark:border-blue-500/60 shadow-md shadow-blue-900/10'
                          : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {/* Baris 1: Checkbox + Judul SPP (e.g. "SPP Desember") & Badge Status */}
                      <div className="flex items-center justify-between gap-2 pb-2">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            disabled={isLunas}
                            checked={isChecked}
                            onChange={() => handleToggleBill(b.id, b.remaining_amount)}
                            className="w-4 h-4 text-blue-900 rounded disabled:opacity-40 cursor-pointer shrink-0"
                          />
                          <span className="font-extrabold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                            {getSppTitle(b)}
                          </span>
                        </label>

                        <div className="shrink-0">
                          <Badge status={b.status} size="sm" />
                        </div>
                      </div>

                      {/* Baris 2: Jatuh Tempo & Sisa Tagihan */}
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-slate-400 text-[10.5px] whitespace-nowrap">
                          Tempo: {b.due_date ? b.due_date.split('-').reverse().join('/') : '-'}
                        </span>
                        <span className="font-extrabold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                          {formatRupiah(b.remaining_amount)}
                        </span>
                      </div>

                      {/* Partial Payment Input if Checked */}
                      {isChecked && (
                        <div className="mt-2.5 pt-2 border-t border-blue-900/20 dark:border-blue-500/20 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-semibold text-slate-500">Bayar:</span>
                            {(allocatedAmounts[b.id] || 0) < b.remaining_amount && (
                              <button
                                type="button"
                                onClick={() => handleAmountChange(b.id, b.remaining_amount, b.remaining_amount)}
                                className="text-[10px] text-blue-900 dark:text-blue-400 font-bold hover:underline"
                              >
                                (Penuh)
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                            <input
                              type="number"
                              min={1}
                              max={b.remaining_amount}
                              step="any"
                              value={allocatedAmounts[b.id] !== undefined ? allocatedAmounts[b.id] : b.remaining_amount}
                              onChange={e => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                handleAmountChange(b.id, isNaN(val) ? 0 : val, b.remaining_amount);
                              }}
                              className="w-32 pl-7 pr-2 py-1 rounded-lg border border-blue-900/40 dark:border-blue-500/40 bg-white dark:bg-slate-900 text-right font-bold text-xs text-blue-900 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-900"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            {/* 2. Tagihan Ekstrakurikuler Per Masing-Masing Ekstrakurikuler (Sederhana & Rapi) */}
            {eskulGroups.length > 0 && eskulGroups.map((eskul, groupIdx) => {
              const filter = eskulFilters[eskul.id] || 'all';
              const isCollapsed = Boolean(collapsedEskuls[eskul.id]);
              const totalCount = eskul.bills.length;
              const paidCount = eskul.bills.filter(b => b.status === 'LUNAS').length;
              const unpaidCount = totalCount - paidCount;

              const displayedBills = eskul.bills.filter(b => {
                if (filter === 'unpaid') return b.status !== 'LUNAS';
                if (filter === 'paid') return b.status === 'LUNAS';
                return true;
              });

              const selectedEskulCount = eskul.bills.filter(b => selectedBillIds[b.id]).length;

              return (
                <GlassCard key={eskul.id} className="p-4 sm:p-5 border-indigo-100/80 dark:border-indigo-900/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            2.{groupIdx + 1} Eskul: {eskul.name}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {formatRupiah(eskul.monthlyFee || 0)}/bln
                          </span>
                          {selectedEskulCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              {selectedEskulCount} Dipilih
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Status 1 T.A: {paidCount} Lunas, {unpaidCount} Belum Lunas
                        </p>
                      </div>
                    </div>

                    {/* Quick Actions & Collapse Toggle */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleSelectAllUnpaidEskul(eskul.bills)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Pilih Belum Lunas</span>
                      </button>

                      {selectedEskulCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleDeselectAllEskul(eskul.bills)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 text-xs font-medium transition-all cursor-pointer"
                          title="Batal Pilihan Eskul Ini"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setCollapsedEskuls(prev => ({ ...prev, [eskul.id]: !prev[eskul.id] }))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title={isCollapsed ? "Tampilkan Rincian Bulan" : "Sembunyikan Rincian"}
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <>
                      {/* Mini Filter Pills */}
                      <div className="flex items-center gap-1.5 mb-3 text-xs">
                        <span className="text-[10px] text-slate-400 font-medium mr-1">Tampilkan:</span>
                        <button
                          type="button"
                          onClick={() => setEskulFilters(prev => ({ ...prev, [eskul.id]: 'all' }))}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            filter === 'all'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          Semua ({totalCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setEskulFilters(prev => ({ ...prev, [eskul.id]: 'unpaid' }))}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            filter === 'unpaid'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          Belum Lunas ({unpaidCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setEskulFilters(prev => ({ ...prev, [eskul.id]: 'paid' }))}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            filter === 'paid'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          Sudah Lunas ({paidCount})
                        </button>
                      </div>

                      {/* Streamlined Grid: 3 spacious columns (3 x 4 = 12 months) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        {displayedBills.map((b: Bill) => {
                          const isChecked = Boolean(selectedBillIds[b.id]);
                          const isLunas = b.status === 'LUNAS';
                          const eskulMonth = getEskulMonthTitle(b);

                          return (
                            <div
                              key={b.id}
                              className={`p-3 rounded-xl border transition-all ${
                                isLunas
                                  ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-75'
                                  : isChecked
                                  ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-400 shadow-sm shadow-indigo-500/10'
                                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              {/* Row 1: Checkbox + Month Title (e.g. "Desember") & Status Badge */}
                              <div className="flex items-center justify-between gap-2 pb-2">
                                <label className="flex items-center gap-2 cursor-pointer min-w-0">
                                  <input
                                    type="checkbox"
                                    disabled={isLunas}
                                    checked={isChecked}
                                    onChange={() => handleToggleBill(b.id, b.remaining_amount)}
                                    className="w-4 h-4 text-indigo-600 rounded disabled:opacity-40 cursor-pointer shrink-0"
                                  />
                                  <span className="font-extrabold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                                    {eskulMonth}
                                  </span>
                                </label>

                                <div className="shrink-0">
                                  <Badge status={b.status} size="sm" />
                                </div>
                              </div>

                              {/* Row 2: Due Date & Remaining Amount */}
                              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                <span className="text-slate-400 text-[10.5px] whitespace-nowrap">
                                  Tempo: {b.due_date ? b.due_date.split('-').reverse().join('/') : '-'}
                                </span>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs whitespace-nowrap">
                                  {formatRupiah(b.remaining_amount)}
                                </span>
                              </div>

                              {/* Partial Payment Input if Checked */}
                              {isChecked && (
                                <div className="mt-2.5 pt-2 border-t border-indigo-500/20 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-semibold text-slate-500">Bayar:</span>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={b.remaining_amount}
                                      step="any"
                                      value={allocatedAmounts[b.id] !== undefined ? allocatedAmounts[b.id] : b.remaining_amount}
                                      onChange={e => {
                                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        handleAmountChange(b.id, isNaN(val) ? 0 : val, b.remaining_amount);
                                      }}
                                      className="w-32 pl-7 pr-2 py-1 rounded-lg border border-indigo-500/40 bg-white dark:bg-slate-900 text-right font-bold text-xs text-indigo-600 dark:text-indigo-300 focus:outline-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </GlassCard>
              );
            })}

            {/* 3. Tagihan Tahunan / Paket Daftar Ulang Section */}
            {groupedBills.annual && groupedBills.annual.length > 0 && (
              <GlassCard className="p-5">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>3. Tagihan Tahunan / Paket Daftar Ulang</span>
                </h4>
                <div className="space-y-2 text-xs">
                  {groupedBills.annual.map((b: Bill) => {
                    const isChecked = Boolean(selectedBillIds[b.id]);
                    const isLunas = b.status === 'LUNAS';

                    return (
                      <div
                        key={b.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isLunas
                            ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 opacity-75'
                            : isChecked
                            ? 'bg-indigo-500/10 border-indigo-500/40'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              disabled={isLunas}
                              checked={isChecked}
                              onChange={() => handleToggleBill(b.id, b.remaining_amount)}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {b.bill_name}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Total Tagihan: {formatRupiah(b.amount)} | Dibayar: {formatRupiah(b.paid_amount)}
                              </span>
                            </div>
                          </label>

                          <div className="text-right">
                            <Badge status={b.status} size="sm" />
                            <p className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                              Sisa: {formatRupiah(b.remaining_amount)}
                            </p>
                          </div>
                        </div>

                        {/* Custom partial payment allocation */}
                        {isChecked && (
                          <div className="mt-2.5 pt-2 border-t border-indigo-500/20 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-semibold text-slate-500">Nominal Bayar:</span>
                              {(allocatedAmounts[b.id] || 0) < b.remaining_amount && (
                                <button
                                  type="button"
                                  onClick={() => handleAmountChange(b.id, b.remaining_amount, b.remaining_amount)}
                                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                                >
                                  (Penuh)
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                              <input
                                type="number"
                                min={1}
                                max={b.remaining_amount}
                                step="any"
                                value={allocatedAmounts[b.id] !== undefined ? allocatedAmounts[b.id] : b.remaining_amount}
                                onChange={e => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  handleAmountChange(b.id, isNaN(val) ? 0 : val, b.remaining_amount);
                                }}
                                className="w-36 pl-7 pr-2.5 py-1 rounded-lg border border-indigo-500/40 bg-white dark:bg-slate-900 text-right font-bold text-xs text-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {/* 4. Tagihan Tunggakan Tahun Ajaran Sebelumnya */}
            {groupedBills.prev_arrears && groupedBills.prev_arrears.length > 0 && (
              <GlassCard className="p-5 border-amber-500/40 bg-amber-500/5">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      4. Tagihan Tunggakan Tahun Ajaran Sebelumnya
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300">
                    {groupedBills.prev_arrears.length} Tagihan
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {groupedBills.prev_arrears.map((b: Bill) => {
                    const isChecked = Boolean(selectedBillIds[b.id]);
                    const isLunas = b.status === 'LUNAS';

                    return (
                      <div
                        key={b.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isLunas
                            ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 opacity-75'
                            : isChecked
                            ? 'bg-amber-500/15 border-amber-500/60 shadow-md shadow-amber-500/10'
                            : 'bg-white dark:bg-slate-800/90 border-amber-500/30 hover:border-amber-500/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              disabled={isLunas}
                              checked={isChecked}
                              onChange={() => handleToggleBill(b.id, b.remaining_amount)}
                              className="w-4 h-4 text-amber-600 rounded disabled:opacity-40 mt-0.5 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                  {b.bill_name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                                  T.A. Lalu
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Total Tagihan: {formatRupiah(b.amount)} | Dibayar: {formatRupiah(b.paid_amount)}
                              </span>
                            </div>
                          </label>

                          <div className="text-right shrink-0">
                            <Badge status={b.status} size="sm" />
                            <p className="font-bold text-rose-600 dark:text-rose-400 mt-1">
                              Sisa: {formatRupiah(b.remaining_amount)}
                            </p>
                          </div>
                        </div>

                        {/* Custom partial payment allocation */}
                        {isChecked && (
                          <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-semibold text-slate-500">Nominal Bayar:</span>
                              {(allocatedAmounts[b.id] || 0) < b.remaining_amount && (
                                <button
                                  type="button"
                                  onClick={() => handleAmountChange(b.id, b.remaining_amount, b.remaining_amount)}
                                  className="text-[10px] text-amber-700 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                                >
                                  (Penuh)
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                              <input
                                type="number"
                                min={1}
                                max={b.remaining_amount}
                                step="any"
                                value={allocatedAmounts[b.id] !== undefined ? allocatedAmounts[b.id] : b.remaining_amount}
                                onChange={e => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  handleAmountChange(b.id, isNaN(val) ? 0 : val, b.remaining_amount);
                                }}
                                className="w-36 pl-7 pr-2.5 py-1 rounded-lg border border-amber-500/50 bg-white dark:bg-slate-900 text-right font-bold text-xs text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {/* 5. Tagihan Khusus Santri */}
            {groupedBills.khusus && groupedBills.khusus.length > 0 && (
              <GlassCard className="p-5 border-purple-500/40 bg-purple-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        5. Tagihan Khusus Santri (Kebutuhan Pribadi & Asrama)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tagihan personal santri seperti seragam, kitab, kasur, peci, atau penggantian sarpras
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-800 dark:text-purple-300 self-start sm:self-auto">
                    {groupedBills.khusus.length} Tagihan
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {groupedBills.khusus.map((b: Bill) => {
                    const isChecked = Boolean(selectedBillIds[b.id]);
                    const isLunas = b.status === 'LUNAS';

                    return (
                      <div
                        key={b.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isLunas
                            ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 opacity-75'
                            : isChecked
                            ? 'bg-purple-500/15 border-purple-500/60 shadow-md shadow-purple-500/10'
                            : 'bg-white dark:bg-slate-800/90 border-purple-500/30 hover:border-purple-500/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              disabled={isLunas}
                              checked={isChecked}
                              onChange={() => handleToggleBill(b.id, b.remaining_amount)}
                              className="w-4 h-4 text-purple-600 rounded disabled:opacity-40 mt-0.5 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                  {b.bill_name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-800 dark:text-purple-300 font-bold text-[10px]">
                                  Tagihan Khusus
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                                <span>Total Tagihan: {formatRupiah(b.amount)}</span>
                                <span>Dibayar: {formatRupiah(b.paid_amount)}</span>
                                {b.due_date && <span>Jatuh Tempo: {formatDateIndo(b.due_date)}</span>}
                              </div>
                            </div>
                          </label>

                          <div className="text-right shrink-0">
                            <Badge status={b.status} size="sm" />
                            <p className="font-bold text-rose-600 dark:text-rose-400 mt-1">
                              Sisa: {formatRupiah(b.remaining_amount)}
                            </p>
                          </div>
                        </div>

                        {/* Custom partial payment allocation */}
                        {isChecked && (
                          <div className="mt-2.5 pt-2 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-semibold text-slate-500">Nominal Bayar:</span>
                              {(allocatedAmounts[b.id] || 0) < b.remaining_amount && (
                                <button
                                  type="button"
                                  onClick={() => handleAmountChange(b.id, b.remaining_amount, b.remaining_amount)}
                                  className="text-[10px] text-purple-700 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                                >
                                  (Penuh)
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                              <input
                                type="number"
                                min={1}
                                max={b.remaining_amount}
                                step="any"
                                value={allocatedAmounts[b.id] !== undefined ? allocatedAmounts[b.id] : b.remaining_amount}
                                onChange={e => {
                                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  handleAmountChange(b.id, isNaN(val) ? 0 : val, b.remaining_amount);
                                }}
                                className="w-36 pl-7 pr-2.5 py-1 rounded-lg border border-purple-500/50 bg-white dark:bg-slate-900 text-right font-bold text-xs text-purple-700 dark:text-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {/* 6. Tagihan Lainnya (Jika ada di luar SPP/Eskul/Tahunan/Tunggakan/Khusus) */}
            {groupedBills.other && groupedBills.other.length > 0 && (
              <GlassCard className="p-5 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Tagihan Lainnya
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {groupedBills.other.length} Tagihan
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {groupedBills.other.map((b: Bill) => {
                    const isChecked = Boolean(selectedBillIds[b.id]);
                    const isLunas = b.status === 'LUNAS';

                    return (
                      <div
                        key={b.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isLunas
                            ? 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 opacity-75'
                            : isChecked
                            ? 'bg-blue-50 border-blue-400'
                            : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              disabled={isLunas}
                              checked={isChecked}
                              onChange={() => handleToggleBill(b.id, b.remaining_amount)}
                              className="w-4 h-4 text-blue-600 rounded disabled:opacity-40 mt-0.5 cursor-pointer shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm block">
                                {b.bill_name}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Total Tagihan: {formatRupiah(b.amount)} | Dibayar: {formatRupiah(b.paid_amount)}
                              </span>
                            </div>
                          </label>

                          <div className="text-right shrink-0">
                            <Badge status={b.status} size="sm" />
                            <p className="font-bold text-rose-600 dark:text-rose-400 mt-1">
                              Sisa: {formatRupiah(b.remaining_amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            {/* 6. Fitur Pembayaran Opsional / Pos Lainnya (Manual Input) */}
            <GlassCard className="p-5 border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <FilePlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      6. Pembayaran Opsional / Pos Lainnya (Input Manual)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Tambahkan pos pembayaran ad-hoc / kustom seperti Buku Paket, Infaq, Seragam Tambahan, Uang Saku, dll.
                    </p>
                  </div>
                </div>
                {manualItems.length > 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    {manualItems.length} Pos Ditambahkan
                  </span>
                )}
              </div>

              {/* Input Form */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                <div className="md:col-span-5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Transaksi / Pos Biaya *
                  </label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder="Contoh: Buku Paket Semester 1 / Infaq"
                    className="w-full px-3 py-2 rounded-xl border border-emerald-500/40 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddManualItem();
                      }
                    }}
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nominal Pembayaran (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={manualAmount}
                      onChange={e => setManualAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-emerald-500/40 bg-white dark:bg-slate-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualItem();
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="md:col-span-3 flex items-end">
                  <button
                    type="button"
                    onClick={() => handleAddManualItem()}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambahkan</span>
                  </button>
                </div>

                <div className="md:col-span-12">
                  <input
                    type="text"
                    value={manualNotes}
                    onChange={e => setManualNotes(e.target.value)}
                    placeholder="Catatan tambahan untuk pos ini (opsional)..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* List of Added Manual Items */}
              {manualItems.length > 0 && (
                <div className="mt-4 pt-3 border-t border-emerald-500/20 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Daftar Pos Opsional Terpilih:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {manualItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/30 bg-white dark:bg-slate-800/90 shadow-sm"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-bold text-slate-900 dark:text-white block truncate">
                            {item.name}
                          </span>
                          {item.notes && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              Ket: {item.notes}
                            </span>
                          )}
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 block">
                            {formatRupiah(item.amount)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveManualItem(item.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Hapus pos"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right Column: Checkout & Payment Summary */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
            <GlassCard className="p-5">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                Ringkasan Pembayaran
              </h4>

              {/* Items in Checkout */}
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                {selectedBillsList.length === 0 && manualItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Belum ada tagihan yang dipilih. Centang tagihan di sebelah kiri atau tambahkan pos opsional.
                  </p>
                ) : (
                  <>
                    {selectedBillsList.map(b => (
                      <div key={b.id} className="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {b.bill_name}
                        </span>
                        <span className="font-bold text-blue-900 dark:text-blue-400 shrink-0">
                          {formatRupiah(allocatedAmounts[b.id] || 0)}
                        </span>
                      </div>
                    ))}

                    {manualItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 rounded-lg my-1">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 truncate block">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                            (Pos Manual/Lainnya)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {formatRupiah(item.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveManualItem(item.id)}
                            className="text-rose-500 hover:text-rose-700 p-0.5 rounded transition-colors cursor-pointer"
                            title="Hapus Pos"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Subtotal, Diskon, Total */}
              <div className="space-y-2.5 text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal ({totalItemCount} Item):</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatRupiah(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Potongan / Diskon:</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={discount || ''}
                      onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                      className="w-28 pl-7 pr-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-900"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm font-black text-blue-900 dark:text-blue-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>TOTAL BAYAR:</span>
                  <span className="text-base">{formatRupiah(totalAmount)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Metode Pembayaran *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Cash/Tunai Langsung">Cash/Tunai Langsung</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="QRIS Statis/Dinamis">QRIS Statis/Dinamis</option>
                  </select>
                </div>

                {/* Cash Calculation if Cash/Tunai */}
                {isCash && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Uang Diterima:</span>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={cashReceived || ''}
                          onChange={e => setCashReceived(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="0"
                          className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span>Kembalian:</span>
                      <span className={changeReturned > 0 ? 'text-blue-900 dark:text-blue-400' : 'text-slate-500'}>
                        {formatRupiah(changeReturned)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Catatan Pembayaran
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Contoh: Titipan orang tua via wali kelas"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isProcessing || totalItemCount === 0}
                  className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isProcessing ? 'Memproses Transaksi...' : `Proses Pembayaran (${formatRupiah(totalAmount)})`}
                  </span>
                </button>
              </div>
            </GlassCard>
          </div>
        </form>
      ) : (
        <GlassCard className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl shadow-md shadow-blue-900/10">
              💳
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {students.length === 0 ? 'Belum Ada Data Santri' : 'Silakan Pilih Santri'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {students.length === 0
                ? 'Sistem belum memiliki santri aktif untuk dicatat pembayarannya. Silakan tambahkan data santri terlebih dahulu di menu Data Santri atau muat data demo di menu Backup & Restore.'
                : 'Pilih nama santri pada kotak pilihan di atas untuk melihat rincian tagihan (SPP, eskul, daftar ulang) dan memproses pembayaran kasir.'}
            </p>
          </div>
        </GlassCard>
      )}

      {/* Kwitansi Modal Popup */}
      <KwitansiModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        data={receiptData}
        onShareWhatsApp={(data) => {
          const phone = selectedStudent?.parent_phone || selectedStudent?.father_phone || '';
          const text = `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nAlhamdulillah, pembayaran tagihan atas nama santri *${data.transaction.student_name}* (NIS: ${data.transaction.student_nis}) sebesar *${formatRupiah(data.transaction.total_amount)}* telah kami terima dengan nomor kwitansi *${data.transaction.receipt_no}*.\n\nJazakumullahu Khairan Katsiran.\n_${data.school.name}_`;
          window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
        }}
      />
    </div>
  );
};
