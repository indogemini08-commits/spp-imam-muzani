import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { formatDateIndo } from '../../services/terbilang';

interface ReportPrintFooterProps {
  forceVisible?: boolean;
}

export const ReportPrintFooter: React.FC<ReportPrintFooterProps> = ({ forceVisible = false }) => {
  const { settings } = useSchool();

  const printDate = new Date();
  const dateStr = formatDateIndo(printDate.toISOString());
  const city = settings?.city?.split(',')[0]?.trim() || 'Bogor';

  return (
    <div className={`${forceVisible ? 'block' : 'hidden print:block'} w-full mt-6 pt-2 text-slate-900 border-t border-slate-200`} style={{ pageBreakInside: 'avoid' }}>
      {/* Kolom Tanda Tangan Pengesahan */}
      <div className="flex justify-between items-start text-[9pt] px-4 pt-2">
        {/* Kolom Kiri: Pimpinan / Kepala Sekolah */}
        <div className="text-center w-64">
          <p className="font-semibold text-slate-700">Mengetahui,</p>
          <p className="font-bold text-slate-900 text-[9.5pt]">
            {settings?.headmaster_title || 'Kepala Sekolah / Mudir Pesantren'}
          </p>
          
          {/* Ruang Stempel & Tanda Tangan */}
          <div className="h-16 flex items-center justify-center">
            <span className="text-[7.5pt] text-slate-300 italic">[Tanda Tangan & Stempel Resmi]</span>
          </div>

          <p className="font-bold text-slate-950 underline text-[9.5pt]">
            {settings?.headmaster_name || "KH. Abdullah Syafi'i, Lc., M.Pd.I."}
          </p>
          <p className="text-[8pt] text-slate-600 font-mono">
            {settings?.headmaster_nip || 'NIY: 197804152005011002'}
          </p>
        </div>

        {/* Kolom Kanan: Bendahara Keuangan */}
        <div className="text-center w-64">
          <p className="font-semibold text-slate-700">
            {city}, {dateStr}
          </p>
          <p className="font-bold text-slate-900 text-[9.5pt]">
            Bendahara / Bagian Keuangan
          </p>

          {/* Ruang Stempel & Tanda Tangan */}
          <div className="h-16 flex items-center justify-center">
            <span className="text-[7.5pt] text-slate-300 italic">[Tanda Tangan Petugas]</span>
          </div>

          <p className="font-bold text-slate-950 underline text-[9.5pt]">
            {settings?.treasurer_name || 'Ustadz Fakhrur Rodhi Al-Hanafi, S.E.'}
          </p>
          <p className="text-[8pt] text-slate-600 font-mono">
            NIP: {settings?.treasurer_nip || '198805122014021003'}
          </p>
        </div>
      </div>

      {/* Catatan Legalitas Dokumen & Penomoran Halaman */}
      <div className="flex items-center justify-between mt-6 pt-2 border-t border-dashed border-slate-300 text-[7.5pt] text-slate-400">
        <p>
          Dokumen ini diterbitkan secara sah dan tervalidasi melalui <strong>Aplikasi SPP Sekolah</strong> • {settings?.name || 'Imam Muzani Boarding School'}
        </p>
        <p className="font-mono">
          Halaman Laporan Sah
        </p>
      </div>
    </div>
  );
};
