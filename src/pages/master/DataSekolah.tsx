import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Save,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  Send,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  GraduationCap,
  RefreshCw
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { SchoolSettings, BankAccountSetting } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import { useSchool, DEFAULT_AVAILABLE_CLASSES } from '../../context/SchoolContext';
import { uploadToImamMuzaniPay, isSupabaseConfigured } from '../../lib/supabase';

export const DataSekolah: React.FC = () => {
  const { settings: globalSettings, updateSettings } = useSchool();
  const [settings, setSettings] = useState<SchoolSettings | null>(globalSettings);
  const [isLoading, setIsLoading] = useState(!globalSettings);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useNotification();

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBankIndex, setEditingBankIndex] = useState<number | null>(null);
  const [bankFormData, setBankFormData] = useState<BankAccountSetting>({
    id: '',
    bank_name: '',
    bank_code: '',
    account_number: '',
    account_name: '',
    is_active: true
  });

  // Class Management State
  const [newClassName, setNewClassName] = useState('');
  const [editingClassIndex, setEditingClassIndex] = useState<number | null>(null);
  const [editingClassName, setEditingClassName] = useState('');

  // Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Hapus',
    cancelText: 'Batal',
    danger: true,
    onConfirm: () => {}
  });

  const appLogoInputRef = useRef<HTMLInputElement>(null);
  const schoolLogoInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.school.getSettings();
      if (data) {
        setSettings(data);
      }
    } catch (err: any) {
      error(err.message || 'Gagal memuat data sekolah');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!globalSettings) {
      loadSettings();
    } else {
      setSettings(globalSettings);
      setIsLoading(false);
    }
  }, [globalSettings]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'app_logo_url' | 'logo_url',
    label: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Format file harus berupa gambar (PNG, JPG, WebP, SVG)');
      return;
    }

    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      error('Ukuran file terlalu besar! Maksimal 5 MB');
      return;
    }

    // Jika Supabase aktif, upload langsung ke bucket Storage ImamMuzaniPay
    if (isSupabaseConfigured()) {
      const uploadRes = await uploadToImamMuzaniPay(file, 'logos');
      if (uploadRes.success && uploadRes.url && settings) {
        setSettings({ ...settings, [field]: uploadRes.url });
        success(`${label} berhasil diunggah ke Storage ImamMuzaniPay. Klik "Simpan Perubahan" untuk menerapkan.`);
        e.target.value = '';
        return;
      }
    }

    // Fallback lokal FileReader base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64 && settings) {
        setSettings({ ...settings, [field]: base64 });
        success(`${label} berhasil diambil dari perangkat. Klik "Simpan Perubahan" untuk menerapkan.`);
      }
    };
    reader.onerror = () => {
      error('Gagal membaca file gambar dari perangkat Anda');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetLogo = (field: 'app_logo_url' | 'logo_url', label: string) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: '' });
    success(`${label} direset ke bawaan. Klik "Simpan Perubahan" untuk menerapkan.`);
  };

  const handleOpenAddBank = () => {
    setEditingBankIndex(null);
    setBankFormData({
      id: `bank_${Date.now()}`,
      bank_name: '',
      bank_code: '',
      account_number: '',
      account_name: '',
      is_active: true
    });
    setIsBankModalOpen(true);
  };

  const handleOpenEditBank = (idx: number) => {
    if (!settings?.bank_accounts) return;
    setEditingBankIndex(idx);
    setBankFormData({ ...settings.bank_accounts[idx] });
    setIsBankModalOpen(true);
  };

  const handleDeleteBank = (idx: number) => {
    if (!settings?.bank_accounts) return;
    const cur = settings.bank_accounts;
    const target = cur[idx];
    const removedName = target?.bank_name || 'Rekening';
    const accNum = target?.account_number || '';
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Rekening Bank?',
      message: `Apakah Anda yakin ingin menghapus rekening ${removedName}${accNum ? ` (${accNum})` : ''} atas nama ${target?.account_name || '-'} dari daftar rekening tujuan pembayaran sekolah?`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      danger: true,
      onConfirm: () => executeDeleteBank(idx)
    });
  };

  const executeDeleteBank = async (idx: number) => {
    if (!settings) return;
    const cur = [...(settings.bank_accounts || [])];
    const target = cur[idx];
    const removedName = target?.bank_name || 'Rekening';
    cur.splice(idx, 1);
    const updated = { ...settings, bank_accounts: cur };
    setSettings(updated);
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    try {
      await updateSettings(updated);
      success(`${removedName} berhasil dihapus dari daftar rekening.`);
    } catch (err: any) {
      error('Gagal menghapus rekening: ' + (err.message || 'Terjadi kesalahan'));
    }
  };

  const handleToggleBankStatus = async (idx: number) => {
    if (!settings) return;
    const cur = [...(settings.bank_accounts || [])];
    if (!cur[idx]) return;
    const newStatus = cur[idx].is_active === false;
    cur[idx] = { ...cur[idx], is_active: newStatus };
    const updated = { ...settings, bank_accounts: cur };
    setSettings(updated);
    try {
      await updateSettings(updated);
      success(`Status rekening ${cur[idx].bank_name} diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}.`);
    } catch (err: any) {
      error('Gagal mengubah status: ' + (err.message || ''));
    }
  };

  const handleSaveBankForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const bankName = (bankFormData.bank_name || '').trim();
    const accNum = (bankFormData.account_number || '').trim();
    const accName = (bankFormData.account_name || '').trim();
    const bankCode = (bankFormData.bank_code || '').trim();

    if (!bankName || !accNum || !accName) {
      error('Nama bank, nomor rekening, dan atas nama rekening wajib diisi');
      return;
    }

    const cleanItem: BankAccountSetting = {
      id: bankFormData.id || `bank_${Date.now()}`,
      bank_name: bankName,
      bank_code: bankCode,
      account_number: accNum,
      account_name: accName,
      is_active: bankFormData.is_active !== false
    };

    const cur = [...(settings.bank_accounts || [])];
    if (editingBankIndex !== null) {
      cur[editingBankIndex] = cleanItem;
    } else {
      cur.push(cleanItem);
    }
    const updated = { ...settings, bank_accounts: cur };
    setSettings(updated);
    setIsBankModalOpen(false);
    try {
      await updateSettings(updated);
      success(`Rekening ${cleanItem.bank_name} (${cleanItem.account_number}) berhasil disimpan ke sistem.`);
    } catch (err: any) {
      error('Gagal menyimpan rekening bank: ' + (err.message || 'Terjadi kesalahan'));
    }
  };

  const currentClasses = settings?.available_classes && settings.available_classes.length > 0
    ? settings.available_classes
    : DEFAULT_AVAILABLE_CLASSES;

  const handleAddClass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;
    const trimmed = newClassName.trim();
    if (!trimmed) {
      error('Nama kelas tidak boleh kosong');
      return;
    }

    if (currentClasses.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      error(`Kelas "${trimmed}" sudah ada di daftar`);
      return;
    }

    const updatedClasses = [...currentClasses, trimmed];
    const updated = { ...settings, available_classes: updatedClasses };
    setSettings(updated);
    setNewClassName('');
    try {
      await updateSettings(updated);
      success(`Kelas "${trimmed}" berhasil ditambahkan dan disimpan.`);
    } catch (err: any) {
      error('Gagal menyimpan penambahan kelas: ' + (err.message || ''));
    }
  };

  const handleDeleteClass = (index: number) => {
    if (!settings) return;
    if (currentClasses.length <= 1) {
      error('Minimal harus ada 1 kelas yang aktif di sekolah');
      return;
    }
    const targetName = currentClasses[index];
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Kelas?',
      message: `Apakah Anda yakin ingin menghapus Kelas "${targetName}" dari daftar kelas yang tersedia? Data santri yang terdaftar di kelas ini tetap aman dan dapat disinkronkan kembali.`,
      confirmText: 'Hapus',
      cancelText: 'Batal',
      danger: true,
      onConfirm: () => executeDeleteClass(index)
    });
  };

  const executeDeleteClass = async (index: number) => {
    if (!settings) return;
    const targetName = currentClasses[index];
    const updatedClasses = currentClasses.filter((_, i) => i !== index);
    const updated = { ...settings, available_classes: updatedClasses };
    setSettings(updated);
    if (editingClassIndex === index) {
      setEditingClassIndex(null);
    }
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    try {
      await updateSettings(updated);
      success(`Kelas "${targetName}" berhasil dihapus.`);
    } catch (err: any) {
      error('Gagal menyimpan penghapusan kelas: ' + (err.message || ''));
    }
  };

  const handleStartEditClass = (index: number) => {
    setEditingClassIndex(index);
    setEditingClassName(currentClasses[index]);
  };

  const handleSaveEditClass = async (index: number) => {
    if (!settings) return;
    const trimmed = editingClassName.trim();
    if (!trimmed) {
      error('Nama kelas tidak boleh kosong');
      return;
    }
    if (currentClasses.some((c, i) => i !== index && c.toLowerCase() === trimmed.toLowerCase())) {
      error(`Kelas "${trimmed}" sudah ada di daftar`);
      return;
    }
    const oldName = currentClasses[index];
    const updatedClasses = [...currentClasses];
    updatedClasses[index] = trimmed;
    const updated = { ...settings, available_classes: updatedClasses };
    setSettings(updated);
    setEditingClassIndex(null);
    try {
      await updateSettings(updated);
      await api.school.renameClass(oldName, trimmed);
      success(`Nama kelas "${oldName}" berhasil diubah menjadi "${trimmed}" dan data santri telah disinkronkan.`);
    } catch (err: any) {
      error('Gagal menyimpan perubahan kelas: ' + (err.message || ''));
    }
  };

  const handleResetDefaultClasses = () => {
    if (!settings) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Kembalikan Daftar Kelas ke Standar?',
      message: 'Apakah Anda yakin ingin mengembalikan daftar kelas ke konfigurasi bawaan sekolah (Kelas VII s.d. XII)? Seluruh data kelas santri juga akan otomatis disinkronkan.',
      confirmText: 'Ya, Kembalikan ke Standar',
      cancelText: 'Batal',
      danger: false,
      onConfirm: () => executeResetDefaultClasses()
    });
  };

  const executeResetDefaultClasses = async () => {
    if (!settings) return;
    const updated = { ...settings, available_classes: DEFAULT_AVAILABLE_CLASSES };
    setSettings(updated);
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    try {
      await updateSettings(updated);
      await api.school.syncStudentClasses();
      success('Daftar kelas berhasil dikembalikan ke standar bawaan dan data santri disinkronkan.');
    } catch (err: any) {
      error('Gagal mereset kelas: ' + (err.message || ''));
    }
  };

  const handleSyncClassesWithStudents = async () => {
    try {
      await api.school.syncStudentClasses();
      success('Seluruh data kelas santri berhasil disinkronkan sesuai format daftar kelas sekolah.');
    } catch (err: any) {
      error('Gagal menyinkronkan data santri: ' + (err.message || ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      await updateSettings(settings);
      success('Identitas dan pengaturan sekolah (termasuk logo) berhasil disimpan');
    } catch (err: any) {
      error(err.message || 'Gagal menyimpan pengaturan sekolah');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        Memuat data identitas sekolah...
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top action save bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Identitas & Pengaturan Sekolah</span>
          </h2>
          <p className="text-xs text-slate-500">
            Kelola branding aplikasi, logo lembaga, kop laporan resmi, data kwitansi, dan integrasi WhatsApp
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/30 transition-all transform active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </div>

      {/* SECTION 1: CUSTOM LOGO APPS & LOGO LEMBAGA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Logo Aplikasi */}
        <GlassCard className="p-6 relative overflow-hidden border-blue-900/20 dark:border-blue-500/20">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-900/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Logo Aplikasi (Branding Sistem)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tampil pada Sidebar, Topbar, dan Halaman Login
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              UI System
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Visual Preview */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-2 shadow-inner overflow-hidden">
                {settings.app_logo_url ? (
                  <img
                    src={settings.app_logo_url}
                    alt="Logo Aplikasi"
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-700 dark:from-blue-600 dark:to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-md">
                    IM
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-2 text-center sm:text-left w-full">
              <input
                ref={appLogoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'app_logo_url', 'Logo Aplikasi')}
              />

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => appLogoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih dari Perangkat</span>
                </button>

                {settings.app_logo_url && (
                  <button
                    type="button"
                    onClick={() => handleResetLogo('app_logo_url', 'Logo Aplikasi')}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Bawaan</span>
                  </button>
                )}
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                Format: PNG, JPG, WebP, SVG. Disarankan persegi (rasio 1:1, min. 128x128 px, maks 2.5 MB).
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Card 2: Logo Lembaga / Sekolah */}
        <GlassCard className="p-6 relative overflow-hidden border-indigo-900/20 dark:border-indigo-500/20">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-900/10 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Logo Lembaga / Sekolah (Kop Resmi)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tampil pada Kop Laporan Cetak, Kwitansi Resmi, & Surat
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
              Dokumen Resmi
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Visual Preview */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-2 shadow-inner overflow-hidden">
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt="Logo Lembaga"
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-md">
                    IM
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-2 text-center sm:text-left w-full">
              <input
                ref={schoolLogoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'logo_url', 'Logo Lembaga')}
              />

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => schoolLogoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih dari Perangkat</span>
                </button>

                {settings.logo_url && (
                  <button
                    type="button"
                    onClick={() => handleResetLogo('logo_url', 'Logo Lembaga')}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Bawaan</span>
                  </button>
                )}
              </div>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                Disarankan PNG transparan resolusi tinggi (min. 200x200 px) agar hasil cetak Kop Laporan sangat tajam dan tidak pecah.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* SECTION 2: IDENTITAS & SETTINGS DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Identitas Sekolah */}
        <div className="lg:col-span-7 space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-900 dark:text-blue-400" />
              <span>Profil Lembaga / Sekolah</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Resmi Sekolah / Pesantren
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={e => setSettings({ ...settings, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kota / Wilayah
                  </label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={e => setSettings({ ...settings, city: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Resmi Keuangan
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  value={settings.address}
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Telepon Kantor
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor WhatsApp CS / Admin
                  </label>
                  <input
                    type="text"
                    value={settings.whatsapp}
                    onChange={e => setSettings({ ...settings, whatsapp: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Bendahara Penandatangan */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-900 dark:text-blue-400" />
              <span>Pejabat Bendahara & Penandatangan Dokumen</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Bendahara
                </label>
                <input
                  type="text"
                  value={settings.treasurer_name}
                  onChange={e => setSettings({ ...settings, treasurer_name: e.target.value })}
                  placeholder="Nama beserta gelar"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  NIP / NUPTK Bendahara
                </label>
                <input
                  type="text"
                  value={settings.treasurer_nip}
                  onChange={e => setSettings({ ...settings, treasurer_nip: e.target.value })}
                  placeholder="19880512xxxx"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </GlassCard>

          {/* Pimpinan Lembaga & Yayasan Naungan */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-900 dark:text-blue-400" />
              <span>Pimpinan Lembaga & Yayasan Naungan</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Yayasan Naungan (Kop Laporan Resmi)
                </label>
                <input
                  type="text"
                  value={settings.yayasan_name || ''}
                  onChange={e => setSettings({ ...settings, yayasan_name: e.target.value })}
                  placeholder="Contoh: YAYASAN PENDIDIKAN ISLAM IMAM MUZANI"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold uppercase focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Dicetak pada baris teratas Kop Laporan Keuangan, Kop Surat Resmi, dan Kwitansi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sebutan / Jabatan Pimpinan
                  </label>
                  <input
                    type="text"
                    value={settings.headmaster_title || ''}
                    onChange={e => setSettings({ ...settings, headmaster_title: e.target.value })}
                    placeholder="Kepala Sekolah / Mudir Pesantren"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NIP / NIY / NUPTK Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    value={settings.headmaster_nip || ''}
                    onChange={e => setSettings({ ...settings, headmaster_nip: e.target.value })}
                    placeholder="NIY: 197804152005011002"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Kepala Sekolah / Mudir Pesantren
                </label>
                <input
                  type="text"
                  value={settings.headmaster_name || ''}
                  onChange={e => setSettings({ ...settings, headmaster_name: e.target.value })}
                  placeholder="Nama beserta gelar lengkap (contoh: KH. Abdullah Syafi'i, Lc., M.Pd.I.)"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Tampil pada kolom "Mengetahui" pada lembar pengesahan cetak seluruh laporan keuangan.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Format Nomor & WhatsApp */}
        <div className="lg:col-span-5 space-y-6">
          {/* Format Penomoran Kwitansi & Transaksi */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-900 dark:text-blue-400" />
              <span>Format Penomoran Kwitansi</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prefix Kwitansi
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_prefix}
                    onChange={e => setSettings({ ...settings, receipt_prefix: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold font-mono focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Contoh: KWT</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prefix Transaksi
                  </label>
                  <input
                    type="text"
                    value={settings.trx_prefix}
                    onChange={e => setSettings({ ...settings, trx_prefix: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold font-mono focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Contoh: TRX</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <span className="text-slate-500 text-[11px]">Pratinjau Nomor Selanjutnya:</span>
                <p className="text-sm font-bold font-mono text-blue-900 dark:text-blue-400 mt-0.5">
                  {settings.receipt_prefix}/2026/09/{String(settings.next_receipt_seq || 1).padStart(4, '0')}
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Konfigurasi WhatsApp Gateway */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Pengaturan WhatsApp Gateway</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Provider / Integrasi WhatsApp
                </label>
                <select
                  value={settings.wa_provider}
                  onChange={e => setSettings({ ...settings, wa_provider: e.target.value as any })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                >
                  <option value="direct_link">Direct wa.me (Tanpa Biaya / Buka Web & App Langsung)</option>
                  <option value="mock_api">Simulasi Gateway Otomatis (Testing)</option>
                  <option value="fonnte">Fonnte WhatsApp API Gateway</option>
                  <option value="wablas">Wablas Gateway API</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Arsitektur modular: dapat diganti kapan saja tanpa merusak sistem tagihan
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pengirim (Sender Name)
                </label>
                <input
                  type="text"
                  value={settings.wa_sender_name}
                  onChange={e => setSettings({ ...settings, wa_sender_name: e.target.value })}
                  placeholder="Bendahara IMBS"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor WhatsApp Pengirim
                </label>
                <input
                  type="text"
                  value={settings.wa_sender_number}
                  onChange={e => setSettings({ ...settings, wa_sender_number: e.target.value })}
                  placeholder="081298765432"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Kaki Pesan (Footer)
                </label>
                <textarea
                  rows={2}
                  value={settings.wa_footer}
                  onChange={e => setSettings({ ...settings, wa_footer: e.target.value })}
                  placeholder="Pesan otomatis sistem administrasi keuangan..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* SECTION: DAFTAR KELAS YANG TERSEDIA */}
      <GlassCard className="p-6 relative overflow-hidden border-emerald-900/20 dark:border-emerald-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daftar Kelas Yang Tersedia</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {currentClasses.length} Kelas Aktif
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Kelola daftar kelas untuk alokasi santri, penetapan tagihan, dan filter laporan keuangan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSyncClassesWithStudents}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all shadow-sm"
              title="Sinkronkan kelas seluruh santri dengan daftar kelas aktif"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan Santri</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaultClasses}
              className="flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Kembalikan daftar kelas standar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Bawaan</span>
            </button>
          </div>
        </div>

        {/* Input Bar to Add New Class */}
        <div className="mb-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Tambah Kelas Baru
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddClass();
                  }
                }}
                placeholder="Ketik nama kelas (Contoh: 7C, 8C, 10 IPS, 11 IPA)..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => handleAddClass()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
            💡 Tips: Tekan Enter atau klik "+ Tambah Kelas". Kelas baru akan langsung tersedia di menu Data Santri dan seluruh filter laporan.
          </p>
        </div>

        {/* List of Classes */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Daftar Kelas Aktif Saat Ini:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {currentClasses.map((cls, idx) => (
              <div
                key={`${cls}-${idx}`}
                className="flex items-center justify-between gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 shadow-sm transition-all hover:border-emerald-500/50 group"
              >
                {editingClassIndex === idx ? (
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="text"
                      autoFocus
                      value={editingClassName}
                      onChange={e => setEditingClassName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEditClass(idx);
                        } else if (e.key === 'Escape') {
                          setEditingClassIndex(null);
                        }
                      }}
                      className="w-full px-2 py-1 text-xs font-bold rounded border border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditClass(idx)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 rounded"
                      title="Simpan Nama Kelas"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={`Kelas ${cls}`}>
                        Kelas {cls}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleStartEditClass(idx)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Edit Nama Kelas"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClass(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Hapus Kelas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* SECTION 3: REKENING BANK TUJUAN PEMBAYARAN SEKOLAH */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-900/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Rekening Bank Tujuan Pembayaran Sekolah
              </h3>
              <p className="text-[11px] text-slate-500">
                Daftar rekening resmi yang ditampilkan kepada wali santri pada Portal Mandiri untuk transfer pembayaran
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddBank}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/20 transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Rekening Bank</span>
          </button>
        </div>

        {/* Bank List Grid */}
        {(!settings.bank_accounts || settings.bank_accounts.length === 0) ? (
          <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            Belum ada rekening bank yang terdaftar. Klik "Tambah Rekening Bank" untuk menambahkan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {settings.bank_accounts.map((b, idx) => (
              <div
                key={b.id || idx}
                className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between relative group hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {b.bank_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 shrink-0">
                      Kode: {b.bank_code || '-'}
                    </span>
                  </div>

                  <p className="text-base font-black font-mono tracking-wider text-blue-950 dark:text-blue-300 mt-1">
                    {b.account_number}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    a.n. <strong className="text-slate-700 dark:text-slate-200">{b.account_name}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => handleToggleBankStatus(idx)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all cursor-pointer hover:opacity-80 ${
                      b.is_active !== false
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }`}
                    title="Klik untuk mengubah status Aktif / Nonaktif"
                  >
                    {b.is_active !== false ? '● Aktif' : '○ Nonaktif'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditBank(idx)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Edit Rekening"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBank(idx)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Hapus Rekening"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
      </form>

      {/* MODAL TAMBAH / EDIT REKENING BANK (Ditempatkan di luar form utama) */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title={editingBankIndex !== null ? 'Edit Rekening Bank Sekolah' : 'Tambah Rekening Bank Sekolah'}
        subtitle="Kelola rekening tujuan pembayaran transfer bagi orang tua/wali santri"
        maxWidth="md"
      >
        <form onSubmit={handleSaveBankForm} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Bank Resmi *
            </label>
            <input
              type="text"
              required
              value={bankFormData.bank_name}
              onChange={e => setBankFormData({ ...bankFormData, bank_name: e.target.value })}
              placeholder="Contoh: Bank Syariah Indonesia (BSI), BCA, Mandiri"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-semibold focus:ring-2 focus:ring-blue-900 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kode Bank (Transfer)
              </label>
              <input
                type="text"
                value={bankFormData.bank_code}
                onChange={e => setBankFormData({ ...bankFormData, bank_code: e.target.value })}
                placeholder="Contoh: 451, 014"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-mono focus:ring-2 focus:ring-blue-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Rekening *
              </label>
              <input
                type="text"
                required
                value={bankFormData.account_number}
                onChange={e => setBankFormData({ ...bankFormData, account_number: e.target.value })}
                placeholder="Contoh: 7123-456-789"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-mono font-bold text-blue-950 dark:text-blue-300 focus:ring-2 focus:ring-blue-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Atas Nama Rekening (Pemilik Rekening) *
            </label>
            <input
              type="text"
              required
              value={bankFormData.account_name}
              onChange={e => setBankFormData({ ...bankFormData, account_name: e.target.value })}
              placeholder="Contoh: IMBS Keuangan SPP / Yayasan Imam Muzani"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 font-semibold focus:ring-2 focus:ring-blue-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="bank_active_check"
              checked={bankFormData.is_active !== false}
              onChange={e => setBankFormData({ ...bankFormData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-900 rounded cursor-pointer"
            />
            <label htmlFor="bank_active_check" className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
              Aktifkan rekening ini (Ditampilkan di Portal Wali Santri)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsBankModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold shadow-md shadow-blue-900/30 transition-all transform active:scale-95 cursor-pointer"
            >
              Simpan ke Daftar
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        danger={confirmDialog.danger}
      />
    </>
  );
};
