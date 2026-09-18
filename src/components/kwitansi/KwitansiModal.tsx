import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  Share2,
  FileText,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import QRCode from 'qrcode';
import { Modal } from '../common/Modal';
import { KwitansiData, downloadKwitansiPDF, downloadKwitansiFromDOM } from '../../services/pdfGenerator';
import { formatRupiah, formatDateIndo, terbilang } from '../../services/terbilang';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { KwitansiVerificationModal } from './KwitansiVerificationModal';

interface KwitansiModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: KwitansiData | null;
  receiptData?: KwitansiData | any | null;
  onShareWhatsApp?: (data: KwitansiData) => void;
}

export const KwitansiModal: React.FC<KwitansiModalProps> = ({
  isOpen,
  onClose,
  data: propData,
  receiptData,
  onShareWhatsApp
}) => {
  const data = propData || receiptData;
  const [format, setFormat] = useState<'A5' | 'A4' | 'Thermal'>('A5');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();

  const cashierDisplayName = 
    (data?.transaction?.cashier_name && 
     data.transaction.cashier_name !== 'Bendahara Sekolah' && 
     data.transaction.cashier_name !== 'Petugas Keuangan')
      ? data.transaction.cashier_name
      : (user?.name || data?.transaction?.cashier_name || 'Fakhrur Rodhi (Super Admin)');

  // Generate QR Code for Authenticity Verification
  useEffect(() => {
    if (!data) return;
    const verifyPayload = `http://localhost:5173/?verify_receipt=${encodeURIComponent(data.transaction.receipt_no)}&nis=${encodeURIComponent(data.transaction.student_nis)}&amount=${data.transaction.total_amount}`;

    QRCode.toDataURL(verifyPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: {
        dark: '#0f2744', // Biru Navy
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('Error generating QR code:', err));
  }, [data]);

  if (!isOpen || !data) return null;

  const handleDownload = async () => {
    const element = document.getElementById('kwitansi-printable-content');
    if (element) {
      try {
        await downloadKwitansiFromDOM(
          element,
          format,
          data.transaction.student_name,
          data.transaction.receipt_no
        );
        success(`Kwitansi ${data.transaction.receipt_no} (${format}) berhasil diunduh`);
        return;
      } catch (err) {
        console.error('Download from DOM error, falling back to vector PDF:', err);
      }
    }

    if (format === 'Thermal') {
      window.print();
    } else {
      try {
        await downloadKwitansiPDF(data, format);
        success(`Kwitansi ${data.transaction.receipt_no} (${format}) berhasil diunduh`);
      } catch (err: any) {
        notifyError(err.message || 'Gagal mengunduh kwitansi PDF');
      }
    }
  };

  const handlePrint = () => {
    const printArea = document.getElementById('kwitansi-printable-content');
    if (!printArea) {
      window.print();
      return;
    }

    // Create an isolated hidden iframe so ONLY the receipt is printed
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Capture all CSS stylesheets from current head
    const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Kwitansi - ${data.transaction.receipt_no}</title>
          ${headStyles}
          <style>
            @page {
              size: ${format === 'A5' ? 'A5 landscape' : format === 'Thermal' ? '80mm auto' : 'A4 portrait'};
              margin: ${format === 'Thermal' ? '2mm' : '6mm 8mm'};
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            }
            .no-print {
              display: none !important;
            }
            #kwitansi-printable-content {
              border: none !important;
              box-shadow: none !important;
              padding: ${format === 'Thermal' ? '4px' : '10px'} !important;
              margin: 0 auto !important;
              width: 100% !important;
              max-width: ${format === 'Thermal' ? '280px' : '100%'} !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            th, td {
              border-color: #e2e8f0 !important;
            }
            thead {
              background-color: #0f2744 !important;
              -webkit-print-color-adjust: exact !important;
            }
            thead th {
              color: #ffffff !important;
            }
          </style>
        </head>
        <body>
          <div id="kwitansi-printable-content">
            ${printArea.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger printing once loaded
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print iframe error:', e);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 350);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Kwitansi Pembayaran Resmi"
        subtitle={`No. Kwitansi: ${data.transaction.receipt_no} | Transaksi: ${data.transaction.transaction_no}`}
        maxWidth={format === 'Thermal' ? 'md' : '4xl'}
      >
        {/* Format Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setFormat('A5')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                format === 'A5'
                  ? 'bg-white dark:bg-slate-700 text-blue-900 dark:text-blue-300 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              A5 Ringkas
            </button>
            <button
              type="button"
              onClick={() => setFormat('A4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                format === 'A4'
                  ? 'bg-white dark:bg-slate-700 text-blue-900 dark:text-blue-300 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              A4 Standar
            </button>
            <button
              type="button"
              onClick={() => setFormat('Thermal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                format === 'Thermal'
                  ? 'bg-white dark:bg-slate-700 text-blue-900 dark:text-blue-300 font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Struk Thermal POS
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {onShareWhatsApp && (
              <button
                type="button"
                onClick={() => onShareWhatsApp(data)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Kirim WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Langsung</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-900/30 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </button>
          </div>
        </div>

        {/* Kwitansi Visual Preview */}
        {format === 'Thermal' ? (
          /* THERMAL RECEIPT PREVIEW */
          <div id="kwitansi-printable-content" className="bg-white text-slate-900 font-mono text-[11px] p-5 rounded-xl border border-slate-200 shadow-inner max-w-xs mx-auto leading-tight">
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h4 className="font-bold text-sm tracking-wider uppercase text-blue-950">{data.school.name}</h4>
              <p className="text-[10px] text-slate-600">{data.school.address}</p>
              <p className="text-[10px] text-slate-600">Telp: {data.school.phone}</p>
            </div>

            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>No Kwt:</span>
                <span className="font-bold">{data.transaction.receipt_no}</span>
              </div>
              <div className="flex justify-between">
                <span>Tgl:</span>
                <span>{data.transaction.date} {data.transaction.time}</span>
              </div>
              <div className="flex justify-between">
                <span>Santri:</span>
                <span className="font-semibold">{data.transaction.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span>NIS / Kelas:</span>
                <span>{data.transaction.student_nis} ({data.transaction.student_class})</span>
              </div>
              <div className="flex justify-between">
                <span>Metode:</span>
                <span>{data.transaction.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{cashierDisplayName}</span>
              </div>
            </div>

            {/* Items */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-2">
              {data.items.map((it, idx) => (
                <div key={idx}>
                  <div className="font-bold">{it.bill_name}</div>
                  <div className="flex justify-between text-[10px]">
                    <span>{it.category} {it.period_month ? `(${it.period_month})` : ''}</span>
                    <span>{formatRupiah(it.amount_allocated)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(data.transaction.subtotal)}</span>
              </div>
              {data.transaction.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(data.transaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                <span>TOTAL:</span>
                <span>{formatRupiah(data.transaction.total_amount)}</span>
              </div>
              {data.transaction.cash_received && data.transaction.cash_received > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>Tunai Diterima:</span>
                    <span>{formatRupiah(data.transaction.cash_received)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kembalian:</span>
                    <span>{formatRupiah(data.transaction.change_returned || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Thermal QR Code & Authenticity Barcode */}
            <div className="pt-3 pb-1 text-center space-y-1.5">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="QR Verifikasi"
                  className="w-16 h-16 mx-auto object-contain border border-slate-300 p-0.5"
                />
              )}
              <p className="font-bold text-[10px] text-blue-950">*** LUNAS / SAH TERVERIFIKASI ***</p>
              <p className="text-[9px] text-slate-500 font-mono tracking-wider">||||| {data.transaction.receipt_no} |||||</p>
              <p className="mt-1 text-[9px] text-slate-600">Terima kasih atas pembayaran Anda.</p>
              <p className="text-[9px] text-slate-600">Jazakumullahu Khairan Katsiran.</p>
            </div>
          </div>
        ) : (
          /* STANDARD A4 / A5 PREVIEW (BIRU NAVY RESMI) */
          <div id="kwitansi-printable-content" className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            {/* Header Kop */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-950 via-blue-900 to-indigo-800 flex items-center justify-center text-white font-bold text-xl shadow-md overflow-hidden shrink-0">
                  {data.school.logo_url ? (
                    <img src={data.school.logo_url} alt="Logo Sekolah" className="w-full h-full object-contain p-1 bg-white" />
                  ) : (
                    'IM'
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-black text-blue-950 leading-tight">
                    {data.school.name}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {data.school.address}
                  </p>
                  <p className="text-xs text-slate-500">
                    Telp: {data.school.phone} | WhatsApp: {data.school.whatsapp}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-950 text-xs font-black rounded-lg uppercase tracking-wider mb-1 text-center align-middle leading-tight">
                  Kwitansi Pembayaran
                </span>
                <p className="text-xs font-bold text-slate-800 font-mono">
                  {data.transaction.receipt_no}
                </p>
                <p className="text-[11px] text-slate-500">
                  Trx: {data.transaction.transaction_no}
                </p>
              </div>
            </div>

            {/* Student & Payment Metadata */}
            <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center">
                  <span className="w-28 text-slate-500">Nama Santri</span>
                  <span className="font-bold text-slate-900">: {data.transaction.student_name}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 text-slate-500">NIS / Kelas</span>
                  <span className="font-semibold text-slate-800">: {data.transaction.student_nis} / {data.transaction.student_class}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-28 text-slate-500">Metode Bayar</span>
                  <span className="font-semibold text-slate-800">: {data.transaction.payment_method}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center">
                  <span className="w-32 text-slate-500">Tanggal Bayar</span>
                  <span className="font-semibold text-slate-800">: {formatDateIndo(data.transaction.date)} ({data.transaction.time})</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500">Petugas Penerima</span>
                  <span className="font-semibold text-slate-800">
                    : {cashierDisplayName}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500">Catatan</span>
                  <span className="text-slate-600">: {data.transaction.notes || '-'}</span>
                </div>
              </div>
            </div>

            {/* Table (Biru Navy Header - Middle Aligned) */}
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse table-fixed">
                <thead className="bg-[#0f2744] text-white font-bold">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center align-middle font-bold text-white">
                      <span className="inline-block align-middle leading-none">No</span>
                    </th>
                    <th className="py-2.5 px-3 text-left align-middle font-bold text-white">
                      <span className="inline-block align-middle leading-none">Rincian Pembayaran</span>
                    </th>
                    <th className="py-2.5 px-3 text-left align-middle font-bold text-white w-28">
                      <span className="inline-block align-middle leading-none">Kategori</span>
                    </th>
                    <th className="py-2.5 px-3 text-center align-middle font-bold text-white w-24">
                      <span className="inline-block align-middle leading-none">Periode</span>
                    </th>
                    <th className="py-2.5 px-3 text-right align-middle font-bold text-white w-36">
                      <span className="inline-block align-middle leading-none">Nominal Bayar</span>
                    </th>
                    <th className="py-2.5 px-3 text-right align-middle font-bold text-white w-28">
                      <span className="inline-block align-middle leading-none">Sisa Tagihan</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 text-center align-middle font-medium text-slate-500">
                        <span className="inline-block align-middle leading-none">{idx + 1}</span>
                      </td>
                      <td className="py-2.5 px-3 text-left align-middle font-semibold text-slate-800">
                        <span className="inline-block align-middle leading-none">{it.bill_name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-left align-middle text-slate-600">
                        <span className="inline-block align-middle leading-none">{it.category}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center align-middle text-slate-600">
                        <span className="inline-block align-middle leading-none">{it.period_month || '-'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right align-middle font-black text-blue-950">
                        <span className="inline-block align-middle leading-none">{formatRupiah(it.amount_allocated)}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right align-middle">
                        {it.remaining_after === 0 ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 font-bold text-[10px] leading-tight text-center align-middle">
                            LUNAS
                          </span>
                        ) : (
                          <span className="inline-block align-middle text-slate-600 font-medium text-xs leading-none">
                            {formatRupiah(it.remaining_after)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary & Terbilang (Biru Navy - Middle Aligned) */}
            <div className="grid grid-cols-12 gap-4 mt-4">
              <div className="col-span-7 bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 leading-none">
                  Terbilang
                </p>
                <p className="text-xs font-bold italic text-blue-950 leading-snug">
                  "{terbilang(data.transaction.total_amount)}"
                </p>
              </div>

              <div className="col-span-5 bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1.5 text-xs flex flex-col justify-center">
                <div className="flex justify-between items-center text-slate-600 leading-tight">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatRupiah(data.transaction.subtotal)}</span>
                </div>
                {data.transaction.discount > 0 && (
                  <div className="flex justify-between items-center text-rose-600 leading-tight">
                    <span>Potongan Diskon:</span>
                    <span className="font-semibold">-{formatRupiah(data.transaction.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-black text-sm text-blue-950 pt-1.5 border-t border-slate-200 leading-tight">
                  <span>Total Pembayaran:</span>
                  <span className="text-base font-black text-blue-900">{formatRupiah(data.transaction.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Footer: Authentic Barcode & QR Code + Stamp + Signature */}
            <div className="grid grid-cols-12 items-center gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
              {/* Left Column: Authentic Barcode & QR Code Verification (Replacing Penyetor / Wali Santri) */}
              <div
                onClick={() => setIsVerificationOpen(true)}
                className="col-span-4 flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-50/60 dark:bg-slate-800/60 border border-blue-200/80 dark:border-blue-900/40 text-center max-w-[200px] shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
                title="Klik untuk melihat bukti verifikasi keaslian digital"
              >
                <div className="flex items-center gap-1 text-[10px] font-extrabold text-blue-950 dark:text-blue-200 uppercase tracking-wider mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                  <span>Verifikasi Keaslian</span>
                </div>

                <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm inline-block relative">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="Barcode Verifikasi Kwitansi"
                      className="w-20 h-20 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                      Memuat QR...
                    </div>
                  )}
                  <div className="absolute inset-0 bg-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <span className="text-[9px] bg-blue-900 text-white px-1.5 py-0.5 rounded font-semibold shadow">
                      Cek Validasi
                    </span>
                  </div>
                </div>

                {/* Visual Barcode Graphic representation */}
                <div className="w-full mt-1.5 px-2 py-1 bg-white border border-slate-200 rounded font-mono text-[9px] tracking-widest text-slate-800 flex items-center justify-center gap-1.5 min-h-[22px]">
                  <span className="font-extrabold text-[10px] tracking-normal font-sans text-blue-900 leading-none">|||||</span>
                  <span className="font-mono text-[8.5px] font-bold text-slate-700 leading-none">{data.transaction.receipt_no}</span>
                  <span className="font-extrabold text-[10px] tracking-normal font-sans text-blue-900 leading-none">|||||</span>
                </div>

                <p className="text-[8px] font-semibold text-slate-600 dark:text-slate-400 mt-1 leading-tight">
                  Scan untuk Bukti Verifikasi Resmi Sistem
                </p>
                <span className="text-[7.5px] font-bold text-blue-950 dark:text-blue-300 uppercase tracking-tight mt-0.5">
                  IMAM MUZANI BOARDING SCHOOL
                </span>
              </div>

              {/* Middle LUNAS Stamp (Biru Navy) - Sejajar dengan Barcode */}
              <div className="col-span-4 flex justify-center items-center">
                <div className="border-2 border-dashed border-blue-900 rounded-xl px-5 py-2.5 text-center text-blue-900 rotate-[-2deg] bg-blue-50/70 shadow-sm hover:rotate-0 transition-transform flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center gap-1.5 font-black text-sm text-blue-950 leading-tight">
                    <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0" />
                    <span className="leading-none">LUNAS / VALID</span>
                  </div>
                  <p className="text-[9px] font-bold text-blue-900 tracking-wider uppercase mt-1 leading-tight">
                    {data.school.name}
                  </p>
                </div>
              </div>

              {/* Right Signature (Pejabat Bendahara & Penandatangan Dokumen) - Sejajar dengan Barcode */}
              <div className="col-span-4 flex justify-end items-center">
                <div className="text-center w-56">
                  <p className="text-slate-500 text-xs">
                    {data.school.city || 'Bogor'}, {formatDateIndo(data.transaction.date)}
                  </p>
                  <p className="text-slate-700 font-semibold text-xs mt-0.5">Bendahara Sekolah,</p>
                  <div className="h-12 flex items-center justify-center text-slate-400 italic text-[11px]">
                    [ Tanda Tangan Sah ]
                  </div>
                  <p className="font-bold text-slate-900 underline text-xs">
                    {data.school.treasurer_name || 'Hasbi'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {data.school.treasurer_nip ? `NIP: ${data.school.treasurer_nip}` : 'Pejabat Penandatangan Dokumen'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Kwitansi Digital Authenticity Verification Modal */}
      <KwitansiVerificationModal
        isOpen={isVerificationOpen}
        onClose={() => setIsVerificationOpen(false)}
        data={data}
      />
    </>
  );
};
