import React, { useState, useEffect } from 'react';
import {
  GraduationCap, Search, CheckCircle2, Clock, AlertTriangle,
  Download, Printer, CreditCard, Upload, ArrowRight, ShieldCheck,
  Building, Phone, User, Calendar, Moon, Sun, ArrowLeft, Copy, Check
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { KwitansiModal } from '../../components/kwitansi/KwitansiModal';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { useSchool } from '../../context/SchoolContext';
import { uploadToImamMuzaniPay, isSupabaseConfigured } from '../../lib/supabase';

interface PortalProps {
  onBackToStaffLogin?: () => void;
}

export const PortalOrangTua: React.FC<PortalProps> = ({ onBackToStaffLogin }) => {
  const { theme, toggleTheme } = useTheme();
  const { success, error } = useNotification();

  // NIS input
  const [nisInput, setNisInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [portalData, setPortalData] = useState<any>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'tagihan' | 'riwayat' | 'konfirmasi' | 'rekening'>('tagihan');

  // Kwitansi Modal
  const [kwitansiData, setKwitansiData] = useState<any>(null);
  const [isKwitansiOpen, setIsKwitansiOpen] = useState(false);

  // Confirmation Form state
  const [confirmBank, setConfirmBank] = useState('BSI');
  const [confirmSender, setConfirmSender] = useState('');
  const [confirmAmount, setConfirmAmount] = useState('');
  const [confirmDate, setConfirmDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirmProofImage, setConfirmProofImage] = useState<string | null>(null);
  const [confirmProofFile, setConfirmProofFile] = useState<File | null>(null);
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);

  // Copied bank account state
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  const { settings } = useSchool();
  const displayAccounts = (portalData?.payment_accounts && portalData.payment_accounts.length > 0)
    ? portalData.payment_accounts
    : (settings?.bank_accounts && settings.bank_accounts.length > 0)
      ? settings.bank_accounts.filter((a: any) => a.is_active !== false).map((a: any) => ({
          bank: a.bank_name,
          code: a.bank_code,
          accountNumber: a.account_number,
          accountName: a.account_name
        }))
      : [
          { bank: 'Bank Syariah Indonesia (BSI)', code: '451', accountNumber: '7123-456-789', accountName: 'IMBS Keuangan SPP' },
          { bank: 'Bank Central Asia (BCA)', code: '014', accountNumber: '800-123-4567', accountName: 'Yayasan Imam Muzani Boarding School' },
          { bank: 'Bank Muamalat', code: '147', accountNumber: '102-000-8899', accountName: 'SPP Imam Muzani' }
        ];

  // Auto-fill from URL query param if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nisParam = params.get('nis');
    if (nisParam) {
      setNisInput(nisParam);
      handleLookup(nisParam);
    }
  }, []);

  const handleLookup = async (nisToSearch?: string) => {
    const targetNis = (nisToSearch || nisInput).trim();
    if (!targetNis) {
      error('Mohon masukkan NIS santri');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.portal.checkNis(targetNis, pinInput);
      setPortalData(data);
      success(`Data santri ${data.student.name} berhasil dimuat`);
    } catch (err: any) {
      error(err.message || 'Data santri dengan NIS tersebut tidak ditemukan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      error('Ukuran file bukti maksimal 5 MB');
      return;
    }

    setConfirmProofFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setConfirmProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalData?.student?.id) return;

    const parsedAmount = parseInt(confirmAmount.replace(/[^0-9]/g, ''), 10);
    if (!parsedAmount || parsedAmount <= 0) {
      error('Nominal pembayaran wajib diisi dengan benar');
      return;
    }

    setIsSubmittingConfirm(true);
    try {
      let finalProofUrl = confirmProofImage || '';

      // Upload ke Supabase Storage Bucket 'ImamMuzaniPay' jika file tersedia & Supabase aktif
      if (confirmProofFile && isSupabaseConfigured()) {
        const uploadRes = await uploadToImamMuzaniPay(confirmProofFile, 'proofs');
        if (uploadRes.success && uploadRes.url) {
          finalProofUrl = uploadRes.url;
        } else if (uploadRes.error) {
          console.warn('Gagal upload ke bucket ImamMuzaniPay, fallback ke data payload:', uploadRes.error);
        }
      }

      await api.confirmations.submit({
        student_id: portalData.student.id,
        bank_target: confirmBank,
        sender_name: confirmSender || portalData.student.parent_name || 'Wali Santri',
        sender_bank: 'Transfer Bank / ATM',
        amount: parsedAmount,
        payment_date: confirmDate,
        proof_file: finalProofUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80',
        notes: confirmNotes
      });

      success('Konfirmasi pembayaran & bukti transfer berhasil dikirim ke sistem! Admin akan segera memverifikasi.');
      setConfirmAmount('');
      setConfirmSender('');
      setConfirmNotes('');
      setConfirmProofImage(null);
      setConfirmProofFile(null);
      // Reload portal data
      await handleLookup(portalData.student.nis);
      setActiveTab('riwayat');
    } catch (err: any) {
      error(err.message || 'Gagal mengirim konfirmasi pembayaran');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  const handleOpenReceipt = async (receiptNo: string) => {
    try {
      const data = await api.payments.getReceiptData(receiptNo);
      setKwitansiData(data);
      setIsKwitansiOpen(true);
    } catch (err: any) {
      error(err.message || 'Gagal memuat kwitansi');
    }
  };

  const handleCopyAccount = (accNo: string, bank: string) => {
    navigator.clipboard.writeText(accNo);
    setCopiedBank(bank);
    success(`Nomor rekening ${bank} disalin`);
    setTimeout(() => setCopiedBank(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white transition-colors duration-300">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0b1329]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 px-4 lg:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-700 dark:from-blue-600 dark:to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-900/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                IMAM MUZANI BOARDING SCHOOL
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-300">
                Portal Informasi Pembayaran & Tagihan Santri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Ganti Mode Gelap / Terang"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {onBackToStaffLogin && (
              <button
                type="button"
                onClick={onBackToStaffLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Login Pegawai</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Search Banner / Lookup if not loaded */}
        {!portalData ? (
          <div className="max-w-xl mx-auto mt-8 space-y-6 text-center">
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                Layanan Wali Santri Mandiri
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Cek Tagihan & Riwayat Pembayaran
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300 max-w-md mx-auto">
                Silakan masukkan Nomor Induk Santri (NIS) ananda untuk melihat rincian tagihan SPP, ekstrakurikuler, daftar ulang, serta mengunduh kwitansi pembayaran.
              </p>
            </div>

            <GlassCard className="p-6 text-left shadow-xl border-t-4 border-t-blue-900 dark:border-t-blue-500">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLookup();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Nomor Induk Santri (NIS)
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={nisInput}
                      onChange={(e) => setNisInput(e.target.value)}
                      placeholder="Masukkan NIS (contoh: 202607001)"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    PIN / Tanggal Lahir <span className="font-normal text-slate-400">(Opsional jika diaktifkan)</span>
                  </label>
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Masukkan PIN (Default: 123456)"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-900 hover:bg-blue-950 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-950/30 transition-all active:scale-[0.98]"
                >
                  <Search className="w-4 h-4" />
                  <span>{isLoading ? 'Mencari Data Santri...' : 'Lihat Tagihan & Riwayat'}</span>
                </button>
              </form>
            </GlassCard>
          </div>
        ) : (
          /* Portal Data Loaded View */
          <div className="space-y-6">
            {/* Student Info Card & Change Student Button */}
            <GlassCard className="p-5 border-l-4 border-l-blue-900 dark:border-l-blue-500">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-900 to-indigo-700 dark:from-blue-600 dark:to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                    {portalData.student.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        {portalData.student.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200">
                        Kelas {portalData.student.class_name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-300 mt-1">
                      <span>NIS: <strong className="font-mono text-slate-900 dark:text-white">{portalData.student.nis}</strong></span>
                      <span>Tarif SPP: <strong className="text-slate-900 dark:text-white">{portalData.student.spp_type_name}</strong></span>
                      <span>Wali: <strong className="text-slate-900 dark:text-white">{portalData.student.father_name || portalData.student.parent_phone}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPortalData(null);
                    setNisInput('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Ganti Santri
                </button>
              </div>
            </GlassCard>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassCard className="p-4 border-l-4 border-l-blue-600">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Total Biaya Pendidikan</p>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {formatRupiah(portalData.summary.total_bills)}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Akumulasi SPP, Eskul & Daftar Ulang</p>
              </GlassCard>

              <GlassCard className="p-4 border-l-4 border-l-emerald-600">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Total Telah Terbayar</p>
                <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatRupiah(portalData.summary.total_paid)}
                </h3>
                <p className="text-[11px] text-emerald-600/90 dark:text-emerald-400/80 mt-0.5">Telah diverifikasi oleh kasir/keuangan</p>
              </GlassCard>

              <GlassCard className="p-4 border-l-4 border-l-rose-600">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Sisa Tagihan Tertunda</p>
                <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {formatRupiah(portalData.summary.total_remaining)}
                </h3>
                <p className="text-[11px] text-rose-600/90 dark:text-rose-400/80 mt-0.5">Kewajiban wajib (tidak termasuk infaq sukarela)</p>
              </GlassCard>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('tagihan')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'tagihan'
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Daftar Tagihan</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('riwayat')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'riwayat'
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Riwayat Pembayaran ({portalData.transactions?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('konfirmasi')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'konfirmasi'
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Konfirmasi Bayar Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rekening')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'rekening'
                    ? 'bg-blue-900 dark:bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Rekening Tujuan Sekolah</span>
              </button>
            </div>

            {/* TAB CONTENT 1: DAFTAR TAGIHAN */}
            {activeTab === 'tagihan' && (
              <div className="space-y-6">
                {/* SPP Bulanan */}
                <GlassCard className="p-5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
                    <span>1. SPP Bulanan (Tahun Ajaran 2026/2027)</span>
                    <span className="text-xs font-normal text-slate-400">Jatuh tempo setiap tgl 10</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {portalData.bills.spp.map((b: any) => (
                      <div
                        key={b.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          b.status === 'LUNAS'
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/40'
                            : b.status === 'SEBAGIAN'
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/40'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{b.period_month}</span>
                          <Badge variant={b.status === 'LUNAS' ? 'success' : b.status === 'SEBAGIAN' ? 'warning' : 'danger'}>
                            {b.status}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{formatRupiah(b.amount)}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span>Terbayar:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(b.paid_amount)}</span>
                        </div>
                        {b.remaining_amount > 0 && (
                          <div className="flex items-center justify-between text-[11px] text-rose-500 font-bold mt-1">
                            <span>Sisa:</span>
                            <span>{formatRupiah(b.remaining_amount)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Ekstrakurikuler & Daftar Ulang */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ekstrakurikuler */}
                  <GlassCard className="p-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                      2. Tagihan Ekstrakurikuler
                    </h3>
                    {portalData.bills.eskul.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Tidak ada tagihan ekstrakurikuler</p>
                    ) : (
                      <div className="space-y-2">
                        {portalData.bills.eskul.map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{b.bill_name}</p>
                              <span className="text-[10px] text-slate-400">Jatuh Tempo: {b.due_date}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900 dark:text-white">{formatRupiah(b.amount)}</p>
                              <Badge variant={b.status === 'LUNAS' ? 'success' : 'warning'}>{b.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>

                  {/* Daftar Ulang / Tahunan */}
                  <GlassCard className="p-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                      3. Tagihan Daftar Ulang / Tahunan
                    </h3>
                    {portalData.bills.annual.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Tidak ada tagihan daftar ulang</p>
                    ) : (
                      <div className="space-y-2">
                        {portalData.bills.annual.map((b: any) => {
                          const isOptional = b.is_mandatory === 0 || b.is_mandatory === false;
                          const isLunas = b.status === 'LUNAS';
                          const isSebagian = b.status === 'SEBAGIAN';

                          return (
                            <div
                              key={b.id}
                              className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                                isOptional
                                  ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-200/60 dark:border-sky-900/40'
                                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/60 dark:border-slate-700/60'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-800 dark:text-slate-200">{b.bill_name}</p>
                                  {isOptional && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300">
                                      Opsional / Infaq
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span>Bayar: {formatRupiah(b.paid_amount)}</span>
                                  {b.remaining_amount > 0 && (
                                    <span className={isOptional ? 'text-slate-500 font-medium' : 'text-rose-500 font-semibold'}>
                                      Sisa: {formatRupiah(b.remaining_amount)} {isOptional ? '(Sukarela)' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-900 dark:text-white">{formatRupiah(b.amount)}</p>
                                {isOptional ? (
                                  <Badge variant={isLunas ? 'success' : isSebagian ? 'warning' : 'neutral'}>
                                    {isLunas ? 'Lunas (Infaq)' : isSebagian ? 'Sebagian' : 'Opsional / Sukarela'}
                                  </Badge>
                                ) : (
                                  <Badge variant={isLunas ? 'success' : isSebagian ? 'warning' : 'danger'}>
                                    {b.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </GlassCard>

                  {/* 4. Tagihan Khusus & Kebutuhan Personal Santri */}
                  {portalData.bills.other && portalData.bills.other.length > 0 && (
                    <GlassCard className="p-5 border-indigo-200/60 dark:border-indigo-900/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            4. Tagihan Khusus & Kebutuhan Santri
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {portalData.bills.other.length} Item
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">Seragam, selimut, peci, kitab, dsb.</span>
                      </div>

                      <div className="space-y-2">
                        {portalData.bills.other.map((b: any) => {
                          const isLunas = b.status === 'LUNAS';
                          const isSebagian = b.status === 'SEBAGIAN';

                          return (
                            <div
                              key={b.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                            >
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{b.bill_name}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span>Bayar: {formatRupiah(b.paid_amount)}</span>
                                  {b.remaining_amount > 0 && (
                                    <span className="text-rose-500 font-semibold">
                                      Sisa: {formatRupiah(b.remaining_amount)}
                                    </span>
                                  )}
                                  <span>• Jatuh tempo: {formatDateIndo(b.due_date)}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-900 dark:text-white">{formatRupiah(b.amount)}</p>
                                <Badge variant={isLunas ? 'success' : isSebagian ? 'warning' : 'danger'}>
                                  {b.status}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </GlassCard>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: RIWAYAT PEMBAYARAN */}
            {activeTab === 'riwayat' && (
              <GlassCard className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Riwayat Transaksi Sukses & Kwitansi Resmi
                  </h3>
                  <span className="text-xs text-slate-400">Total {portalData.transactions?.length || 0} pembayaran</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Tanggal & Waktu</th>
                        <th className="py-3 px-4 font-semibold">Nomor Kwitansi</th>
                        <th className="py-3 px-4 font-semibold">Metode Bayar</th>
                        <th className="py-3 px-4 font-semibold">Rincian Pos yang Dibayar</th>
                        <th className="py-3 px-4 font-semibold text-right">Nominal Bayar</th>
                        <th className="py-3 px-4 font-semibold text-center">Unduh Kwitansi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {portalData.transactions?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Belum ada riwayat pembayaran yang tercatat.
                          </td>
                        </tr>
                      ) : (
                        portalData.transactions.map((trx: any) => (
                          <tr key={trx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-900 dark:text-white">{formatDateIndo(trx.date)}</p>
                              <span className="text-[10px] text-slate-400">{trx.time || '10:00'} WIB</span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                              {trx.receipt_number}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                                {trx.payment_method}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-xs">
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                                {trx.items?.map((it: any) => it.bill_name).join(', ') || 'Pembayaran Tagihan'}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(trx.amount)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenReceipt(trx.receipt_number)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 rounded-lg text-xs font-semibold transition-all border border-brand-200/60 dark:border-brand-800/60"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Kwitansi PDF</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}

            {/* TAB CONTENT 3: KONFIRMASI BAYAR TRANSFER MANDIRI */}
            {activeTab === 'konfirmasi' && (
              <div className="max-w-2xl mx-auto">
                <GlassCard className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Form Konfirmasi Pembayaran Transfer
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Sudah transfer melalui ATM / M-Banking? Silakan konfirmasi di bawah ini agar diverifikasi admin sekolah.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitConfirmation} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Transfer ke Rekening Sekolah
                        </label>
                        <select
                          value={confirmBank}
                          onChange={(e) => setConfirmBank(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          {displayAccounts.map((acc: any) => {
                            const bName = acc.bank || acc.bank_name;
                            const accNum = acc.accountNumber || acc.account_number;
                            const accOwner = acc.accountName || acc.account_name;
                            const label = `${bName} - ${accNum} (${accOwner})`;
                            return <option key={label} value={label}>{label}</option>;
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Nominal Transfer (Rp)
                        </label>
                        <input
                          type="text"
                          value={confirmAmount}
                          onChange={(e) => setConfirmAmount(e.target.value)}
                          placeholder="Contoh: 1.500.000"
                          required
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Nama Pengirim / Pemilik Rekening
                        </label>
                        <input
                          type="text"
                          value={confirmSender}
                          onChange={(e) => setConfirmSender(e.target.value)}
                          placeholder="Nama di buku tabungan / rekening"
                          required
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tanggal Transfer
                        </label>
                        <input
                          type="date"
                          value={confirmDate}
                          onChange={(e) => setConfirmDate(e.target.value)}
                          required
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Catatan Alokasi (Opsional)
                      </label>
                      <input
                        type="text"
                        value={confirmNotes}
                        onChange={(e) => setConfirmNotes(e.target.value)}
                        placeholder="Contoh: Pembayaran SPP September & Eskul Tahfidz"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Upload Foto Bukti Transfer / Struk ATM
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 dark:file:bg-brand-950/50 dark:file:text-brand-300 hover:file:bg-brand-100"
                      />
                      {confirmProofImage && (
                        <div className="mt-3 p-2 border border-slate-200 dark:border-slate-700 rounded-xl inline-block">
                          <img src={confirmProofImage} alt="Pratinjau Bukti" className="h-28 object-contain rounded-lg" />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingConfirm}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all active:scale-[0.98]"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isSubmittingConfirm ? 'Mengirim Konfirmasi...' : 'Kirim Konfirmasi Pembayaran'}</span>
                    </button>
                  </form>
                </GlassCard>
              </div>
            )}

            {/* TAB CONTENT 4: INFORMASI REKENING SEKOLAH */}
            {activeTab === 'rekening' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {displayAccounts.map((item: any, idx: number) => {
                  const bgs = [
                    'from-teal-600 to-emerald-700',
                    'from-blue-600 to-indigo-700',
                    'from-purple-600 to-fuchsia-700',
                    'from-amber-600 to-orange-700',
                    'from-slate-700 to-slate-900'
                  ];
                  const bg = bgs[idx % bgs.length];
                  const bankTitle = item.bank || item.bank_name;
                  const bCode = item.code || item.bank_code;
                  const accNum = item.accountNumber || item.account_number;
                  const accOwner = item.accountName || item.account_name;

                  return (
                    <GlassCard key={bankTitle + accNum} className="p-5 flex flex-col justify-between relative overflow-hidden">
                      <div>
                        <div className={`p-4 rounded-2xl bg-gradient-to-tr ${bg} text-white mb-4 shadow-lg`}>
                          <div className="flex items-center justify-between">
                            <CreditCard className="w-6 h-6 text-white/80" />
                            <span className="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded">
                              Bank Code: {bCode}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold mt-4 tracking-wide">{bankTitle}</h4>
                          <p className="text-xl font-mono font-black mt-1 tracking-widest">{accNum}</p>
                          <p className="text-[11px] text-white/80 mt-2">a.n. {accOwner}</p>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                          Gunakan kode bank <strong>{bCode}</strong> jika Anda melakukan transfer dari rekening bank yang berbeda (ATM Bersama / Prima).
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyAccount(accNum, bankTitle)}
                        className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all active:scale-95"
                      >
                        {copiedBank === bankTitle ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Tersalin ke Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin No Rekening</span>
                          </>
                        )}
                      </button>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Kwitansi Modal */}
      {kwitansiData && (
        <KwitansiModal
          isOpen={isKwitansiOpen}
          onClose={() => {
            setIsKwitansiOpen(false);
            setKwitansiData(null);
          }}
          receiptData={kwitansiData}
        />
      )}

      {/* Portal Footer */}
      <footer className="mt-12 py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>© 2026 IMAM MUZANI BOARDING SCHOOL. All rights reserved.</p>
        <p className="mt-1 text-[11px]">Butuh bantuan pembayaran? Hubungi Layanan Keuangan: (0251) 8345678 / WhatsApp: 0812-9876-5432</p>
      </footer>
    </div>
  );
};
