import React, { useRef, useState, useEffect } from 'react';
import { Download, Printer, X, FileText, Loader2, ZoomIn, ZoomOut, CheckCircle2, Layers } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ReportPrintHeader, SummaryMetricItem } from './ReportPrintHeader';
import { ReportPrintFooter } from './ReportPrintFooter';
import { useNotification } from '../../context/NotificationContext';

export interface ReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  filterInfo?: string;
  summaryMetrics?: SummaryMetricItem[];
  fileName: string;
  orientation?: 'landscape' | 'portrait';
  paperFormat?: 'a4' | 'a3' | 'auto';
  wideContent?: boolean;
  children: React.ReactNode;
}

export const ReportPdfModal: React.FC<ReportPdfModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  filterInfo,
  summaryMetrics,
  fileName,
  orientation = 'landscape',
  paperFormat = 'auto',
  wideContent = false,
  children
}) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');
  const { success, error } = useNotification();

  const isLandscape = orientation === 'landscape';

  // Determine initial paper size based on props
  useEffect(() => {
    if (isOpen) {
      if (paperFormat === 'a3' || wideContent) {
        setPaperSize('a3');
        setZoomLevel(0.75);
      } else if (paperFormat === 'a4') {
        setPaperSize('a4');
        setZoomLevel(1);
      } else {
        // Auto default
        setPaperSize('a4');
        setZoomLevel(1);
      }
    }
  }, [isOpen, paperFormat, wideContent]);

  // Ensure scroll position is reset to the top whenever the modal opens
  useEffect(() => {
    if (isOpen && previewContainerRef.current) {
      previewContainerRef.current.scrollTop = 0;
      previewContainerRef.current.scrollLeft = 0;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    if (!paperRef.current) return;
    setIsGenerating(true);
    const prevZoom = zoomLevel;
    try {
      // Temporarily reset zoom to 1 to guarantee 1:1 pixel crispness without CSS transform scale distortion
      if (prevZoom !== 1) {
        setZoomLevel(1);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const element = paperRef.current;
      // Create canvas at 2x resolution for crisp high-definition text
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: element.scrollWidth + 60
      });

      const isA3 = paperSize === 'a3';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'l' : 'p',
        unit: 'mm',
        format: isA3 ? 'a3' : 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Handle multi-page documents if table exceeds 1 page
      while (heightLeft > 2) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_\-]/g, '_');
      pdf.save(`${sanitizedFileName}.pdf`);
      success(`Dokumen "${sanitizedFileName}.pdf" (${paperSize.toUpperCase()}) berhasil diunduh`);
    } catch (err: any) {
      console.error('Gagal generate PDF:', err);
      error('Gagal memproses dokumen PDF: ' + (err?.message || 'Error tidak terduga'));
    } finally {
      if (prevZoom !== 1) {
        setZoomLevel(prevZoom);
      }
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getModalMaxWidth = () => {
    if (paperSize === 'a3') {
      return 'max-w-[97vw] xl:max-w-[1620px]';
    }
    if (isLandscape) {
      return 'max-w-[1300px]';
    }
    return 'max-w-4xl';
  };

  const getPaperWidthClass = () => {
    if (paperSize === 'a3') {
      return 'w-[1550px] min-w-[1550px] max-w-[1550px]';
    }
    if (isLandscape) {
      return 'w-[1120px] min-w-[1120px] max-w-[1120px]';
    }
    return 'w-[800px] min-w-[800px] max-w-[800px]';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Container */}
      <div className={`relative w-full ${getModalMaxWidth()} my-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] overflow-hidden z-10 transition-all duration-200`}>
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Preview Dokumen PDF Resmi
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                  paperSize === 'a3'
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                    : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }`}>
                  {paperSize.toUpperCase()} {isLandscape ? 'Landscape' : 'Portrait'} {paperSize === 'a3' ? '(Format Lebar)' : ''}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-md">
                {title} • {fileName}.pdf
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Paper Size Switcher Toggle */}
            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300/60 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 px-1.5 hidden sm:inline flex items-center gap-1">
                <Layers className="w-3 h-3" /> Kertas:
              </span>
              <button
                type="button"
                onClick={() => {
                  setPaperSize('a4');
                  setZoomLevel(1);
                }}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  paperSize === 'a4'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Format kertas A4 standar"
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaperSize('a3');
                  setZoomLevel(0.75);
                }}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  paperSize === 'a3'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Format kertas A3 Ekstra Lebar (Cocok untuk tabel dengan banyak kolom)"
              >
                A3 Lebar
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 px-1.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.5, Number((prev - 0.05).toFixed(2))))}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-xs transition-colors cursor-pointer"
                title="Perkecil Preview"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1 font-semibold min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(1.4, Number((prev + 0.05).toFixed(2))))}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-xs transition-colors cursor-pointer"
                title="Perbesar Preview"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Direct */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
              title="Cetak via dialog printer browser"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PDF ({paperSize.toUpperCase()})</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
              title="Tutup Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Sheet Preview Stage */}
        <div
          ref={previewContainerRef}
          className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-200/90 dark:bg-slate-950/90 flex justify-center items-start"
        >
          <div
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }}
            className="w-full flex justify-center"
          >
            {/* The Paper Sheet to be Captured */}
            <div
              ref={paperRef}
              className={`pdf-document-paper bg-white text-slate-900 shadow-2xl border border-slate-300 p-8 sm:p-9 rounded-sm font-sans ${getPaperWidthClass()}`}
              style={{
                boxSizing: 'border-box'
              }}
            >
              {/* Kop Surat & Metadata (forced visible) */}
              <ReportPrintHeader
                title={title}
                subtitle={subtitle}
                filterInfo={filterInfo}
                summaryMetrics={summaryMetrics}
                forceVisible={true}
              />

              {/* Document Body / Table Content */}
              <div className="my-4 text-slate-900 w-full overflow-visible">
                {children}
              </div>

              {/* Signatures & Legal Footer (forced visible) */}
              <ReportPrintFooter forceVisible={true} />
            </div>
          </div>
        </div>

        {/* Bottom Status bar */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Tata letak dokumen sesuai standar format resmi cetak {paperSize.toUpperCase()} {isLandscape ? 'Landscape' : 'Portrait'}
          </span>
          <span>Ukuran kertas menyesuaikan otomatis. Klik <strong>"Unduh PDF ({paperSize.toUpperCase()})"</strong> untuk menyimpan berkas.</span>
        </div>
      </div>
    </div>
  );
};

