import React from 'react';
import {
  Menu,
  Search,
  Sun,
  Moon,
  PlusCircle,
  Send,
  Bell,
  LogOut,
  User as UserIcon,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PageView } from './Sidebar';

interface TopbarProps {
  currentPage: PageView;
  onOpenMobileSidebar: () => void;
  onOpenGlobalSearch: () => void;
  onNavigate: (page: PageView) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentPage,
  onOpenMobileSidebar,
  onOpenGlobalSearch,
  onNavigate
}) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const getPageInfo = (page: PageView): { title: string; subtitle: string } => {
    switch (page) {
      case 'dashboard':
        return { title: 'Dasbor Monitoring Keuangan', subtitle: 'Pusat kendali pembayaran SPP, eskul, dan tunggakan santri secara real-time' };
      case 'master_sekolah':
        return { title: 'Identitas & Data Sekolah', subtitle: 'Kelola informasi resmi sekolah, nomor rekening, kop surat, dan pengaturan kwitansi' };
      case 'master_santri':
        return { title: 'Data Santri / Siswa', subtitle: 'Manajemen data induk santri, penetapan tarif SPP, eskul, dan riwayat tagihan' };
      case 'master_spp':
        return { title: 'Multi Jenis SPP', subtitle: 'Konfigurasi berbagai jenis tarif SPP (Boarding, Reguler, Tahfidz, Beasiswa)' };
      case 'master_eskul':
        return { title: 'Jenis Ekstrakurikuler', subtitle: 'Konfigurasi tarif tagihan kegiatan eskul santri' };
      case 'master_annual':
        return { title: 'Tagihan Tahunan & Daftar Ulang', subtitle: 'Paket daftar ulang, uang pangkal, seragam, modul, dan infaq' };
      case 'master_academic':
        return { title: 'Tahun Pelajaran & Billing Engine', subtitle: 'Kelola periode akademik aktif dan bangkitkan tagihan otomatis' };
      case 'transaksi_input':
        return { title: 'Input Pembayaran Santri', subtitle: 'Pencatatan pembayaran SPP, eskul, dan tagihan tahunan dengan alokasi fleksibel' };
      case 'transaksi_database':
        return { title: 'Database Transaksi', subtitle: 'Riwayat seluruh transaksi penerimaan kas, cetak ulang kwitansi, dan ekspor data' };
      case 'transaksi_konfirmasi':
        return { title: 'Konfirmasi Pembayaran Transfer', subtitle: 'Verifikasi bukti transfer yang diunggah oleh orang tua/wali santri' };
      case 'transaksi_tagihan':
        return { title: 'Tagihan Seluruh Santri', subtitle: 'Eksplorasi buku besar tagihan terpadu (SPP, eskul, tahunan)' };
      case 'transaksi_khusus':
        return { title: 'Tagihan Khusus Santri', subtitle: 'Pencatatan tagihan kebutuhan personal santri (seragam baru, selimut, peci, kitab, dll)' };
      case 'laporan_penerimaan':
        return { title: 'Laporan Penerimaan Kas', subtitle: 'Rekapitulasi penerimaan kas per kelas dengan kolom jenis tagihan dinamis' };
      case 'laporan_pelunasan':
        return { title: 'Laporan Status Pelunasan', subtitle: 'Status lunas, sebagian, dan kekurangan pembayaran per santri' };
      case 'laporan_tunggakan':
        return { title: 'Laporan Tunggakan Santri', subtitle: 'Daftar santri menunggak, total nominal tunggakan, dan aging tagihan' };
      case 'laporan_spp':
        return { title: 'Laporan Matriks SPP 12 Bulan', subtitle: 'Matriks pembayaran SPP bulanan (Juli s.d. Juni) dengan indikator status' };
      case 'laporan_eskul':
        return { title: 'Laporan Matriks Eskul', subtitle: 'Rekapitulasi pembayaran iuran eskul seluruh santri' };
      case 'laporan_daftar_ulang':
        return { title: 'Laporan Rincian Daftar Ulang', subtitle: 'Rekapitulasi pos pembayaran paket daftar ulang tahunan' };
      case 'laporan_tagihan_khusus':
        return { title: 'Laporan Tagihan Khusus Santri', subtitle: 'Rekapitulasi tagihan kebutuhan personal santri (seragam, kitab, asrama, dan perlengkapan)' };
      case 'fitur_wa_reminder':
        return { title: 'Pengingat Tagihan WhatsApp', subtitle: 'Kirim pesan tagihan otomatis langsung ke nomor WhatsApp orang tua/wali' };
      case 'fitur_wa_template':
        return { title: 'Template Pesan WhatsApp', subtitle: 'Kustomisasi template pesan pengingat dengan variabel dinamis' };
      case 'fitur_wa_logs':
        return { title: 'Riwayat Pesan WhatsApp', subtitle: 'Log pengiriman notifikasi WhatsApp tagihan dan kwitansi' };
      case 'akun_pengguna':
        return { title: 'Manajemen Pengguna & Role', subtitle: 'Kelola hak akses Super Admin, Bendahara, Tata Usaha, dan Viewer' };
      case 'akun_audit':
        return { title: 'Log Aktivitas Sistem', subtitle: 'Audit trail pencatatan mutasi transaksi dan pembaruan data penting' };
      case 'akun_backup':
        return { title: 'Cadangan & Pemulihan Data', subtitle: 'Ekspor cadangan JSON, restore database, dan ekspor excel' };
      default:
        return { title: 'Aplikasi SPP Sekolah', subtitle: 'Sistem Manajemen Pembayaran & Tagihan' };
    }
  };

  const info = getPageInfo(currentPage);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0b1329]/95 backdrop-blur-xl border-b border-slate-200/90 dark:border-slate-800 px-4 sm:px-6 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight truncate">
              {info.title}
            </h2>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-300 truncate mt-0.5">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Academic Year Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 rounded-xl text-xs font-semibold text-blue-900 dark:text-blue-200">
            <Calendar className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span>T.A. 2026/2027</span>
          </div>

          {/* Global Search Button */}
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium border border-slate-200/90 dark:border-slate-700 transition-all"
          >
            <Search className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
            <span className="hidden sm:inline">Cari Santri / Transaksi...</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400">
              Ctrl K
            </kbd>
          </button>

          {/* Quick Input Pembayaran Button */}
          <button
            type="button"
            onClick={() => onNavigate('transaksi_input')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-900/30 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Bayar</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700 transition-all"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-90 duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-blue-900 transition-transform hover:-rotate-12 duration-300" />
            )}
          </button>

          {/* User Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-700 dark:from-blue-600 dark:to-indigo-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {user?.name?.split(' ')[0] || 'Admin'}
              </p>
              <span className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase">
                {user?.role?.replace('_', ' ') || 'Admin'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
