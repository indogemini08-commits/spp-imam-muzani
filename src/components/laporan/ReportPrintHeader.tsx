import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateIndo } from '../../services/terbilang';
import { Building2 } from 'lucide-react';

export interface SummaryMetricItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface ReportPrintHeaderProps {
  title: string;
  subtitle?: string;
  filterInfo?: string;
  summaryMetrics?: SummaryMetricItem[];
  forceVisible?: boolean;
}

export const ReportPrintHeader: React.FC<ReportPrintHeaderProps> = ({
  title,
  subtitle,
  filterInfo,
  summaryMetrics,
  forceVisible = false
}) => {
  const { settings } = useSchool();
  const { user } = useAuth();

  const printDate = new Date();
  const printDateStr = formatDateIndo(printDate.toISOString());
  const printTimeStr = printDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`${forceVisible ? 'block' : 'hidden print:block'} w-full mb-4 text-slate-900`}>
      {/* 1. KOP SURAT RESMI LEMBAGA */}
      <div className="flex items-center justify-between gap-4 pb-2">
        {/* Logo Lembaga / Sekolah */}
        <div className="w-20 h-20 shrink-0 flex items-center justify-center">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt="Logo Lembaga"
              className="max-h-20 max-w-20 object-contain"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl border-2 border-slate-800 flex flex-col items-center justify-center text-slate-900 bg-slate-50">
              <Building2 className="w-8 h-8 text-slate-800 mb-0.5" />
              <span className="text-[8px] font-black tracking-tighter">IMBS</span>
            </div>
          )}
        </div>

        {/* Teks Identitas Lembaga (Center) */}
        <div className="flex-1 text-center px-2">
          <h3 className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
            {settings?.yayasan_name || 'YAYASAN PENDIDIKAN ISLAM IMAM MUZANI'}
          </h3>
          <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase leading-tight mt-0.5 font-serif">
            {settings?.name || 'IMAM MUZANI BOARDING SCHOOL'}
          </h1>
          <p className="text-[10px] text-slate-600 leading-snug mt-0.5">
            {settings?.address || 'Jl. Pendidikan Islam No. 45, Kompleks Islamic Center'}, {settings?.city || 'Bogor, Jawa Barat'}
          </p>
          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
            Telp: {settings?.phone || '(0251) 8345678'} • WA: {settings?.whatsapp || '081298765432'} • Email: {settings?.email || 'keuangan@imbs.sch.id'}
          </p>
        </div>

        {/* Kode Dokumen & Registrasi (Right Box) */}
        <div className="w-28 shrink-0 text-right text-[8.5pt] border border-slate-300 p-1.5 rounded bg-slate-50/50">
          <span className="block text-[7pt] text-slate-500 font-bold uppercase">Dokumen Keuangan</span>
          <span className="block font-mono font-bold text-slate-800 text-[8pt]">FORM-KEU/2026</span>
          <span className="block text-[7pt] text-slate-500 mt-1">Status Dokumen:</span>
          <span className="inline-block px-1 py-0.2 bg-blue-100 text-blue-900 text-[7pt] font-bold rounded">
            RESMI / SAH
          </span>
        </div>
      </div>

      {/* Garis Ganda Kop Surat Resmi */}
      <div className="w-full mt-1 mb-3">
        <div className="border-t-2 border-slate-900 w-full" />
        <div className="border-t border-slate-900 w-full mt-0.5" />
      </div>

      {/* 2. JUDUL DOKUMEN LAPORAN & METADATA */}
      <div className="text-center mb-3">
        <h2 className="text-sm font-black tracking-wide text-slate-950 uppercase underline decoration-2 underline-offset-4">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[10px] text-slate-600 mt-1 font-medium">
            {subtitle}
          </p>
        )}
        
        {/* Baris Parameter Filter & Metadata */}
        <div className="flex flex-wrap items-center justify-between text-[8.5pt] text-slate-600 mt-2.5 pt-1.5 border-t border-b border-slate-200 py-1">
          <div>
            <span className="font-semibold text-slate-800">Tahun Pelajaran:</span> 2026/2027 (Ganjil)
            {filterInfo && (
              <>
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-semibold text-slate-800">Kriteria:</span> {filterInfo}
              </>
            )}
          </div>
          <div className="text-right">
            <span>Dicetak: <strong>{printDateStr}</strong> pkl <strong>{printTimeStr} WIB</strong></span>
            <span className="mx-2 text-slate-300">|</span>
            <span>Operator: <strong>{user?.name || 'Admin Keuangan'}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. EXECUTIVE SUMMARY METRICS (JIKA ADA) */}
      {summaryMetrics && summaryMetrics.length > 0 && (
        <div className="mb-3">
          <div className="grid grid-flow-col auto-cols-fr gap-2 text-center">
            {summaryMetrics.map((m, idx) => (
              <div
                key={idx}
                className={`p-1.5 rounded border ${
                  m.highlight
                    ? 'border-blue-900 bg-blue-50/50'
                    : 'border-slate-300 bg-slate-50/30'
                }`}
              >
                <span className="block text-[7.5pt] text-slate-600 font-medium uppercase tracking-tight">
                  {m.label}
                </span>
                <span className={`block text-[10pt] font-black ${m.highlight ? 'text-blue-950' : 'text-slate-900'}`}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
