import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { PageView } from './components/layout/Sidebar';
import { Login } from './pages/Login';

// Pages
import { Dashboard } from './pages/Dashboard';

// Master Data
import { DataSekolah } from './pages/master/DataSekolah';
import { DataSantri } from './pages/master/DataSantri';
import { JenisSPP } from './pages/master/JenisSPP';
import { JenisEskul } from './pages/master/JenisEskul';
import { TagihanTahunan } from './pages/master/TagihanTahunan';
import { TahunPelajaran } from './pages/master/TahunPelajaran';

// Transaksi
import { InputPembayaran } from './pages/transaksi/InputPembayaran';
import { DatabaseTransaksi } from './pages/transaksi/DatabaseTransaksi';
import { KonfirmasiBayar } from './pages/transaksi/KonfirmasiBayar';
import { TagihanSantri } from './pages/transaksi/TagihanSantri';
import { TagihanKhusus } from './pages/transaksi/TagihanKhusus';

// Laporan
import { LaporanPenerimaan } from './pages/laporan/LaporanPenerimaan';
import { LaporanPelunasan } from './pages/laporan/LaporanPelunasan';
import { LaporanTunggakan } from './pages/laporan/LaporanTunggakan';
import { LaporanSPP } from './pages/laporan/LaporanSPP';
import { LaporanEskul } from './pages/laporan/LaporanEskul';
import { LaporanDaftarUlang } from './pages/laporan/LaporanDaftarUlang';
import { LaporanTagihanKhusus } from './pages/laporan/LaporanTagihanKhusus';

// Fitur Unggulan
import { PengingatWA } from './pages/fitur/PengingatWA';
import { TemplateWA } from './pages/fitur/TemplateWA';
import { RiwayatWA } from './pages/fitur/RiwayatWA';

// Portal Wali Santri
import { PortalOrangTua } from './pages/portal/PortalOrangTua';

// Akun & Pengaturan
import { Pengguna } from './pages/akun/Pengguna';
import { LogAktivitas } from './pages/akun/LogAktivitas';
import { BackupRestore } from './pages/akun/BackupRestore';
import { api } from './services/api';
import { KwitansiVerificationModal } from './components/kwitansi/KwitansiVerificationModal';

export const App: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [viewMode, setViewMode] = useState<'admin' | 'portal'>('admin');

  const [verifiedReceiptData, setVerifiedReceiptData] = useState<any | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  // Check URL params for direct parent portal navigation and receipt verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyReceipt = params.get('verify_receipt') || params.get('verify');
    if (verifyReceipt) {
      api.payments.getReceiptData(verifyReceipt)
        .then(data => {
          if (data) {
            setVerifiedReceiptData(data);
            setIsVerificationModalOpen(true);
          }
        })
        .catch(err => console.warn('Could not load receipt for verification:', err));
    }

    if (params.get('portal') === 'true' || params.has('nis')) {
      setViewMode('portal');
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold tracking-wider text-emerald-400">
          MEMUAT APLIKASI SPP SEKOLAH...
        </p>
      </div>
    );
  }

  // 1. Parent Portal Public View
  if (viewMode === 'portal') {
    return (
      <PortalOrangTua
        onBackToStaffLogin={() => setViewMode('admin')}
      />
    );
  }

  // 2. Staff / Admin Login Screen
  if (!isAuthenticated || !user) {
    return (
      <Login
        onOpenParentPortal={() => setViewMode('portal')}
      />
    );
  }

  // 3. Authenticated Admin Dashboard & Management Shell
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      
      // Master Data
      case 'master_sekolah':
        return <DataSekolah />;
      case 'master_santri':
        return <DataSantri />;
      case 'master_spp':
        return <JenisSPP />;
      case 'master_eskul':
        return <JenisEskul />;
      case 'master_annual':
        return <TagihanTahunan />;
      case 'master_academic':
        return <TahunPelajaran />;

      // Transaksi
      case 'transaksi_input':
        return <InputPembayaran />;
      case 'transaksi_database':
        return <DatabaseTransaksi />;
      case 'transaksi_konfirmasi':
        return <KonfirmasiBayar />;
      case 'transaksi_tagihan':
        return <TagihanSantri onNavigate={setCurrentPage} />;
      case 'transaksi_khusus':
        return <TagihanKhusus onNavigate={setCurrentPage} />;

      // Laporan Keuangan
      case 'laporan_penerimaan':
        return <LaporanPenerimaan />;
      case 'laporan_pelunasan':
        return <LaporanPelunasan />;
      case 'laporan_tunggakan':
        return <LaporanTunggakan />;
      case 'laporan_spp':
        return <LaporanSPP />;
      case 'laporan_eskul':
        return <LaporanEskul onNavigate={setCurrentPage} />;
      case 'laporan_daftar_ulang':
        return <LaporanDaftarUlang />;
      case 'laporan_tagihan_khusus':
        return <LaporanTagihanKhusus onNavigate={setCurrentPage} />;

      // Fitur Unggulan
      case 'fitur_wa_reminder':
        return <PengingatWA />;
      case 'fitur_wa_template':
        return <TemplateWA />;
      case 'fitur_wa_logs':
        return <RiwayatWA />;

      // Akun & Pengaturan
      case 'akun_pengguna':
        return <Pengguna />;
      case 'akun_audit':
        return <LogAktivitas />;
      case 'akun_backup':
        return <BackupRestore />;

      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <>
      <Layout
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        onOpenParentPortal={() => setViewMode('portal')}
        onSelectStudentDetail={() => setCurrentPage('master_santri')}
        onSelectReceipt={() => setCurrentPage('transaksi_database')}
      >
        {renderCurrentPage()}
      </Layout>

      {/* Global Receipt Verification Modal (when scanned via QR Code) */}
      <KwitansiVerificationModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        data={verifiedReceiptData}
      />
    </>
  );
};

export default App;
