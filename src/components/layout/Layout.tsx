import React, { useState, useEffect } from 'react';
import { Sidebar, PageView } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearchModal } from '../common/GlobalSearchModal';

interface LayoutProps {
  currentPage: PageView;
  onSelectPage: (page: PageView) => void;
  onOpenParentPortal: () => void;
  onSelectStudentDetail?: (studentId: string) => void;
  onSelectReceipt?: (receiptNo: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentPage,
  onSelectPage,
  onOpenParentPortal,
  onSelectStudentDetail,
  onSelectReceipt,
  children
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Keyboard shortcut Ctrl+K for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#060a14] print:bg-white print:block transition-colors duration-300">
      {/* Sidebar Navigation (Hidden in Print) */}
      <div className="no-print print:hidden">
        <Sidebar
          currentPage={currentPage}
          onSelectPage={onSelectPage}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          onOpenParentPortal={onOpenParentPortal}
        />
      </div>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 print:pl-0 print:m-0 print:w-full ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Topbar Header (Hidden in Print) */}
        <div className="no-print print:hidden">
          <Topbar
            currentPage={currentPage}
            onOpenMobileSidebar={() => setIsMobileOpen(true)}
            onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
            onNavigate={onSelectPage}
          />
        </div>

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 w-full mx-auto print:p-0 print:m-0 print:max-w-none print:w-full ${
          [
            'transaksi_database',
            'transaksi_konfirmasi',
            'transaksi_tagihan',
            'transaksi_khusus',
            'laporan_spp',
            'laporan_tagihan_khusus',
            'laporan_eskul',
            'laporan_pelunasan',
            'laporan_tunggakan',
            'laporan_penerimaan',
            'laporan_daftar_ulang'
          ].includes(currentPage)
            ? 'max-w-none w-full'
            : 'max-w-7xl'
        }`}>
          {children}
        </main>
      </div>

      {/* Universal Global Search Palette */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onSelectStudent={studentId => {
          if (onSelectStudentDetail) onSelectStudentDetail(studentId);
          else onSelectPage('master_santri');
        }}
        onSelectTransaction={receiptNo => {
          if (onSelectReceipt) onSelectReceipt(receiptNo);
          else onSelectPage('transaksi_database');
        }}
      />
    </div>
  );
};
