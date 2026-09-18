import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Layers,
  Activity,
  Calendar,
  CreditCard,
  Receipt,
  FileCheck2,
  FileSpreadsheet,
  TrendingUp,
  AlertCircle,
  CalendarDays,
  Dumbbell,
  FolderArchive,
  MessageSquareText,
  Clock,
  History,
  ShieldAlert,
  Database,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Send,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';

export type PageView =
  | 'dashboard'
  | 'master_sekolah'
  | 'master_santri'
  | 'master_spp'
  | 'master_eskul'
  | 'master_annual'
  | 'master_academic'
  | 'transaksi_input'
  | 'transaksi_database'
  | 'transaksi_konfirmasi'
  | 'transaksi_tagihan'
  | 'transaksi_khusus'
  | 'laporan_penerimaan'
  | 'laporan_pelunasan'
  | 'laporan_tunggakan'
  | 'laporan_spp'
  | 'laporan_eskul'
  | 'laporan_daftar_ulang'
  | 'laporan_tagihan_khusus'
  | 'fitur_wa_reminder'
  | 'fitur_wa_template'
  | 'fitur_wa_logs'
  | 'akun_pengguna'
  | 'akun_audit'
  | 'akun_backup';

interface SidebarProps {
  currentPage: PageView;
  onSelectPage: (page: PageView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenParentPortal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenParentPortal
}) => {
  const { user, logout, canAccess } = useAuth();
  const { settings } = useSchool();

  const handleNav = (page: PageView) => {
    onSelectPage(page);
    onCloseMobile();
  };

  const navGroups = [
    {
      label: 'UTAMA',
      items: [
        { id: 'dashboard' as PageView, label: 'Dasbor', icon: LayoutDashboard, module: 'dashboard' }
      ]
    },
    {
      label: 'DATA MASTER',
      items: [
        { id: 'master_sekolah' as PageView, label: 'Data Sekolah', icon: Building2, module: 'master_sekolah' },
        { id: 'master_santri' as PageView, label: 'Data Santri / Siswa', icon: Users, module: 'master_santri' },
        { id: 'master_spp' as PageView, label: 'Jenis SPP', icon: Layers, module: 'master_spp' },
        { id: 'master_eskul' as PageView, label: 'Jenis Eskul', icon: Activity, module: 'master_eskul' },
        { id: 'master_annual' as PageView, label: 'Tagihan Tahunan', icon: FolderArchive, module: 'master_annual' },
        { id: 'master_academic' as PageView, label: 'Tahun Pelajaran', icon: Calendar, module: 'master_academic' }
      ]
    },
    {
      label: 'TRANSAKSI',
      items: [
        { id: 'transaksi_input' as PageView, label: 'Input Pembayaran', icon: CreditCard, module: 'transaksi' },
        { id: 'transaksi_database' as PageView, label: 'Database Transaksi', icon: Receipt, module: 'transaksi' },
        { id: 'transaksi_konfirmasi' as PageView, label: 'Konfirmasi Bayar', icon: FileCheck2, module: 'transaksi' },
        { id: 'transaksi_tagihan' as PageView, label: 'Tagihan Santri', icon: FileSpreadsheet, module: 'transaksi' },
        { id: 'transaksi_khusus' as PageView, label: 'Tagihan Khusus', icon: Sparkles, module: 'transaksi' }
      ]
    },
    {
      label: 'LAPORAN',
      items: [
        { id: 'laporan_penerimaan' as PageView, label: 'Penerimaan Kas', icon: TrendingUp, module: 'laporan' },
        { id: 'laporan_pelunasan' as PageView, label: 'Status Pelunasan', icon: FileCheck2, module: 'laporan' },
        { id: 'laporan_tunggakan' as PageView, label: 'Tunggakan Santri', icon: AlertCircle, module: 'laporan' },
        { id: 'laporan_spp' as PageView, label: 'Laporan SPP (12 Bln)', icon: CalendarDays, module: 'laporan' },
        { id: 'laporan_eskul' as PageView, label: 'Laporan Eskul', icon: Dumbbell, module: 'laporan' },
        { id: 'laporan_daftar_ulang' as PageView, label: 'Laporan Daftar Ulang', icon: FolderArchive, module: 'laporan' },
        { id: 'laporan_tagihan_khusus' as PageView, label: 'Laporan Tagihan Khusus', icon: Sparkles, module: 'laporan' }
      ]
    },
    {
      label: 'FITUR UNGGULAN',
      items: [
        { id: 'fitur_wa_reminder' as PageView, label: 'Pengingat WhatsApp', icon: Send, module: 'whatsapp' },
        { id: 'fitur_wa_template' as PageView, label: 'Template Pesan WA', icon: MessageSquareText, module: 'whatsapp' },
        { id: 'fitur_wa_logs' as PageView, label: 'Riwayat WhatsApp', icon: History, module: 'whatsapp' }
      ]
    },
    {
      label: 'AKUN & SISTEM',
      items: [
        { id: 'akun_pengguna' as PageView, label: 'Pengguna & Role', icon: Users, module: 'master_sekolah' },
        { id: 'akun_audit' as PageView, label: 'Log Aktivitas', icon: Clock, module: 'master_sekolah' },
        { id: 'akun_backup' as PageView, label: 'Backup & Restore', icon: Database, module: 'master_sekolah' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-40
          bg-white/98 dark:bg-[#0b1329]/95
          border-r border-slate-200/90 dark:border-slate-800
          backdrop-blur-2xl flex flex-col transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header Branding */}
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-700 dark:from-blue-600 dark:to-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-900/30 shrink-0 overflow-hidden">
              {settings?.app_logo_url ? (
                <img src={settings.app_logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                'IM'
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  APLIKASI SPP
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-300 truncate">
                  {settings?.name || 'Imam Muzani Boarding School'}
                </p>
                <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 bg-blue-900/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 rounded text-[9px] font-semibold">
                  T.A. 2026/2027
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Action Buttons */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1 space-y-1.5">
            <button
              onClick={() => handleNav('transaksi_input')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-blue-900 to-indigo-800 hover:from-blue-950 hover:to-indigo-900 dark:from-blue-600 dark:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-950/25 transition-all transform active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Input Pembayaran</span>
            </button>

            <button
              onClick={() => handleNav('fitur_wa_reminder')}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-semibold transition-all"
            >
              <Send className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>★ Pengingat WA</span>
            </button>
          </div>
        )}

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              {!isCollapsed && (
                <div className="px-3 mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  if (!canAccess(item.module)) return null;

                  const isActive = currentPage === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={isCollapsed ? item.label : undefined}
                      onClick={() => handleNav(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group
                        ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-900 to-indigo-800 dark:from-blue-600 dark:to-indigo-600 text-white shadow-md shadow-blue-900/25 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-blue-50/80 dark:hover:bg-slate-800/70 hover:text-blue-900 dark:hover:text-white'
                        }
                        ${isCollapsed ? 'justify-center px-2' : ''}
                      `}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Portal Orang Tua Shortcut */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onOpenParentPortal}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all ${isCollapsed ? 'justify-center px-2' : ''}`}
              title="Portal Orang Tua"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate font-semibold">Portal Orang Tua</span>}
            </button>
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-700 to-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-[10px] text-slate-400 capitalize truncate">
                  {user?.role?.replace('_', ' ') || 'Pengguna'}
                </p>
              </div>
            )}

            {!isCollapsed && (
              <button
                type="button"
                onClick={logout}
                title="Keluar / Logout"
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
