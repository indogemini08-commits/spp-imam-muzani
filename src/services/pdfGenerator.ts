import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { terbilang, formatRupiah, formatDateIndo } from './terbilang';

export interface KwitansiData {
  school: {
    name: string;
    address: string;
    phone: string;
    whatsapp: string;
    treasurer_name: string;
    treasurer_nip: string;
    logo_url?: string;
  };
  transaction: {
    id: string;
    transaction_no: string;
    receipt_no: string;
    date: string;
    time: string;
    student_name: string;
    student_nis: string;
    student_class: string;
    payment_method: string;
    subtotal: number;
    discount: number;
    total_amount: number;
    cash_received?: number;
    change_returned?: number;
    cashier_name: string;
    notes?: string;
  };
  items: Array<{
    bill_name: string;
    category: string;
    period_month?: string;
    amount_allocated: number;
    remaining_after: number;
  }>;
}

export async function generateKwitansiPDF(data: KwitansiData, format: 'A4' | 'A5' = 'A5'): Promise<jsPDF> {
  const isA5 = format === 'A5';
  const doc = new jsPDF({
    orientation: isA5 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: format.toLowerCase() as any
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Primary Brand Color: Biru Navy (#0f2744)
  const primaryNavy = [15, 39, 68];
  const accentNavy = [30, 58, 138];
  const darkTextColor = [15, 23, 42]; // Slate-900
  const grayText = [71, 85, 105]; // Slate-600
  const borderGray = [226, 232, 240]; // Slate-200
  const lightBg = [248, 250, 252]; // Slate-50

  const itemsCount = data.items.length;
  const isCompact = isA5 && itemsCount > 4;

  // 1. Header (School Info & Kop)
  const headerTopY = isA5 ? 8 : 12;
  const barHeight = isA5 ? 15 : 18;
  const marginX = isA5 ? 10 : 12;

  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.rect(marginX, headerTopY, isA5 ? 3.5 : 4, barHeight, 'F'); // Navy bar accent

  const textStartX = marginX + (isA5 ? 5.5 : 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isA5 ? 13 : 15);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text(data.school.name || 'IMAM MUZANI BOARDING SCHOOL', textStartX, headerTopY + (isA5 ? 5 : 5.5));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isA5 ? 7.5 : 8.5);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text(data.school.address || 'Jl. Pendidikan Islam No. 45, Bogor', textStartX, headerTopY + (isA5 ? 9.5 : 10.5));
  doc.text(
    `Telp: ${data.school.phone || '-'} | WhatsApp: ${data.school.whatsapp || '-'}`,
    textStartX,
    headerTopY + (isA5 ? 13.5 : 15)
  );

  // Document Title Badge on Top Right
  const badgeWidth = isA5 ? 56 : 60;
  const badgeHeight = isA5 ? 15 : 17;
  const badgeX = pageWidth - marginX - badgeWidth;

  doc.setFillColor(240, 244, 250); // Light navy tint
  doc.roundedRect(badgeX, headerTopY, badgeWidth, badgeHeight, 2, 2, 'F');
  doc.setDrawColor(accentNavy[0], accentNavy[1], accentNavy[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, headerTopY, badgeWidth, badgeHeight, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isA5 ? 8.5 : 9.5);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('KWITANSI PEMBAYARAN', badgeX + badgeWidth / 2, headerTopY + (isA5 ? 5.5 : 6), { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isA5 ? 7.5 : 8);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(data.transaction.receipt_no, badgeX + badgeWidth / 2, headerTopY + (isA5 ? 10.5 : 11.5), { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isA5 ? 6.5 : 7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Trx: ${data.transaction.transaction_no}`, badgeX + badgeWidth / 2, headerTopY + (isA5 ? 14 : 15.5), { align: 'center' });

  // Divider Line
  const dividerY = headerTopY + barHeight + (isA5 ? 2.5 : 3);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);
  doc.line(marginX, dividerY, pageWidth - marginX, dividerY);

  // 2. Metadata Section (2 Columns)
  const metaY = dividerY + (isA5 ? 3.5 : 4.5);
  const lineSpacing = isA5 ? 4.5 : 5.5;
  doc.setFontSize(isA5 ? 7.8 : 8.5);

  // Left Column
  const leftLabelX = marginX + 2;
  const leftValX = leftLabelX + (isA5 ? 28 : 34);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('Nama Santri', leftLabelX, metaY);
  doc.text('NIS / Kelas', leftLabelX, metaY + lineSpacing);
  doc.text('Metode Pembayaran', leftLabelX, metaY + lineSpacing * 2);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`:  ${data.transaction.student_name}`, leftValX, metaY);
  doc.text(`:  ${data.transaction.student_nis}  /  Kelas ${data.transaction.student_class}`, leftValX, metaY + lineSpacing);
  doc.text(`:  ${data.transaction.payment_method}`, leftValX, metaY + lineSpacing * 2);

  // Right Column
  const rightColX = pageWidth / 2 + (isA5 ? 6 : 8);
  const rightValX = rightColX + (isA5 ? 30 : 34);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('No. Transaksi', rightColX, metaY);
  doc.text('Tanggal Pembayaran', rightColX, metaY + lineSpacing);
  doc.text('Petugas Penerima', rightColX, metaY + lineSpacing * 2);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(`:  ${data.transaction.transaction_no}`, rightValX, metaY);
  doc.text(`:  ${formatDateIndo(data.transaction.date)} (${data.transaction.time || 'WIB'})`, rightValX, metaY + lineSpacing);
  doc.text(`:  ${data.transaction.cashier_name || 'Petugas Keuangan'}`, rightValX, metaY + lineSpacing * 2);

  // 3. Table of Payment Items
  const tableStartY = metaY + lineSpacing * 2 + (isA5 ? 3.5 : 4.5);
  const tableRows = data.items.map((item, idx) => [
    idx + 1,
    item.bill_name,
    item.category,
    item.period_month || '-',
    formatRupiah(item.amount_allocated),
    item.remaining_after === 0 ? 'LUNAS' : formatRupiah(item.remaining_after)
  ]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    head: [['No', 'Rincian Pembayaran', 'Kategori', 'Periode', 'Nominal Bayar', 'Sisa Tagihan']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: isCompact ? 7 : 7.8,
      cellPadding: isCompact ? 1.3 : (isA5 ? 1.8 : 2.2),
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      valign: 'middle'
    },
    headStyles: {
      fillColor: [15, 39, 68], // Biru Navy
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: isCompact ? 7.2 : 8,
      halign: 'left',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: isA5 ? 8 : 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: isA5 ? 24 : 26 },
      3: { cellWidth: isA5 ? 20 : 24, halign: 'center' },
      4: { cellWidth: isA5 ? 30 : 34, halign: 'right', fontStyle: 'bold', textColor: [15, 39, 68] },
      5: { cellWidth: isA5 ? 26 : 30, halign: 'right', fontStyle: 'bold' }
    }
  });

  const tableFinalY = (doc as any).lastAutoTable.finalY + 3;

  // 4. Totals & Terbilang Box
  const summaryHeight = isCompact ? 14 : (isA5 ? 16 : 18);
  const totalBoxWidth = isA5 ? 74 : 78;
  const totalBoxX = pageWidth - marginX - totalBoxWidth;
  const terbilangWidth = totalBoxX - marginX - 3.5;

  let currentY = tableFinalY;

  // Check if summary + footer fits on current page
  const requiredBottomSpace = summaryHeight + (isA5 ? 26 : 32) + (isA5 ? 6 : 8);
  if (currentY + requiredBottomSpace > pageHeight) {
    doc.addPage();
    // Add brief continuation header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text(`KWITANSI PEMBAYARAN - ${data.transaction.receipt_no} (Lanjutan)`, marginX, isA5 ? 10 : 14);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, isA5 ? 12 : 16, pageWidth - marginX, isA5 ? 12 : 16);
    currentY = isA5 ? 15 : 20;
  }

  // Summary: Left Box (Terbilang)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(marginX, currentY, terbilangWidth, summaryHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, terbilangWidth, summaryHeight, 1.5, 1.5, 'D');

  doc.setFontSize(isA5 ? 6.5 : 7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('TERBILANG:', marginX + 3, currentY + (isA5 ? 4 : 5));

  const terbilangStr = terbilang(data.transaction.total_amount);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(isA5 ? 7.2 : 8.2);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  const splitTerbilang = doc.splitTextToSize(`"${terbilangStr}"`, terbilangWidth - 6);
  doc.text(splitTerbilang, marginX + 3, currentY + (isA5 ? 8.5 : 10));

  // Summary: Right Box (Subtotal, Diskon, Total)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(totalBoxX, currentY, totalBoxWidth, summaryHeight, 1.5, 1.5, 'F');
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalBoxX, currentY, totalBoxWidth, summaryHeight, 1.5, 1.5, 'D');

  doc.setFontSize(isA5 ? 7 : 7.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  doc.text('Subtotal:', totalBoxX + 3, currentY + (isA5 ? 4.5 : 5));
  doc.text(formatRupiah(data.transaction.subtotal), totalBoxX + totalBoxWidth - 3, currentY + (isA5 ? 4.5 : 5), { align: 'right' });

  if (data.transaction.discount > 0) {
    doc.setTextColor(225, 29, 72); // Rose-600
    doc.text('Diskon:', totalBoxX + 3, currentY + (isA5 ? 8 : 9));
    doc.text(`-${formatRupiah(data.transaction.discount)}`, totalBoxX + totalBoxWidth - 3, currentY + (isA5 ? 8 : 9), { align: 'right' });
  }

  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.line(totalBoxX + 3, currentY + (isA5 ? 9.5 : 11), totalBoxX + totalBoxWidth - 3, currentY + (isA5 ? 9.5 : 11));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isA5 ? 8 : 9);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('TOTAL BAYAR:', totalBoxX + 3, currentY + (isA5 ? 13 : 15));
  doc.text(formatRupiah(data.transaction.total_amount), totalBoxX + totalBoxWidth - 3, currentY + (isA5 ? 13 : 15), { align: 'right' });

  // 5. Signatures, Stamp & QR Code Verification (3 Columns)
  let footerY = currentY + summaryHeight + (isA5 ? 3 : 4);
  const footerBoxHeight = isA5 ? 22 : 26;

  // Overflow protection for footer
  if (footerY + footerBoxHeight > pageHeight - (isA5 ? 5 : 8)) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text(`KWITANSI PEMBAYARAN - ${data.transaction.receipt_no} (Pengesahan Dokumen)`, marginX, isA5 ? 10 : 14);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, isA5 ? 12 : 16, pageWidth - marginX, isA5 ? 12 : 16);
    footerY = isA5 ? 16 : 22;
  }

  // Column 1: Verification Box on Left (QR Code + Barcode text)
  const verifyBoxWidth = isA5 ? 65 : 68;
  const qrSize = isA5 ? 16 : 18;

  const verifyText = `http://localhost:5173/?verify_receipt=${encodeURIComponent(data.transaction.receipt_no)}&nis=${encodeURIComponent(data.transaction.student_nis)}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyText, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 160,
      color: {
        dark: '#0f2744',
        light: '#ffffff'
      }
    });

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.roundedRect(marginX, footerY, verifyBoxWidth, footerBoxHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, footerY, verifyBoxWidth, footerBoxHeight, 1.5, 1.5, 'D');

    const qrY = footerY + (footerBoxHeight - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', marginX + 2, qrY, qrSize, qrSize);

    const qrTextX = marginX + qrSize + 4.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isA5 ? 6.8 : 7.5);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text('VERIFIKASI KEASLIAN', qrTextX, footerY + (isA5 ? 4.5 : 5.5));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isA5 ? 5.5 : 6.2);
    doc.setTextColor(grayText[0], grayText[1], grayText[2]);
    doc.text('Scan QR untuk validasi sistem', qrTextX, footerY + (isA5 ? 8 : 9.5));
    doc.text('Tercatat di pembukuan resmi', qrTextX, footerY + (isA5 ? 11.5 : 13.5));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isA5 ? 6 : 6.8);
    doc.setTextColor(accentNavy[0], accentNavy[1], accentNavy[2]);
    doc.text(`KWT: ${data.transaction.receipt_no}`, qrTextX, footerY + (isA5 ? 15.5 : 17.5));

    doc.setFont('courier', 'normal');
    doc.setFontSize(isA5 ? 6.5 : 7.2);
    doc.setTextColor(148, 163, 184);
    doc.text('||||| ||||| |||||', qrTextX, footerY + (isA5 ? 19.5 : 22));
  } catch (err) {
    console.error('Error generating QR for PDF:', err);
  }

  // Column 2: Stamp LUNAS / VALID (Middle)
  const stampWidth = isA5 ? 46 : 50;
  const stampHeight = isA5 ? 17 : 20;
  const stampX = pageWidth / 2 - stampWidth / 2;
  const stampY = footerY + (footerBoxHeight - stampHeight) / 2;

  doc.setDrawColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(stampX, stampY, stampWidth, stampHeight, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isA5 ? 9.5 : 11);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text('LUNAS / VALID', pageWidth / 2, stampY + (isA5 ? 7.5 : 9), { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isA5 ? 5.8 : 6.5);
  doc.text(data.school.name || 'IMAM MUZANI BOARDING SCHOOL', pageWidth / 2, stampY + (isA5 ? 12.5 : 14.5), { align: 'center' });

  // Column 3: Signature & Approval (Right) - Pejabat Bendahara Data Sekolah
  const signColX = pageWidth - marginX - (isA5 ? 24 : 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isA5 ? 7 : 7.8);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  const city = (data.school as any).city || 'Bogor';
  doc.text(`${city}, ${formatDateIndo(data.transaction.date)}`, signColX, footerY + (isA5 ? 3.5 : 4.5), { align: 'center' });
  doc.text('Bendahara Sekolah,', signColX, footerY + (isA5 ? 7.5 : 9), { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(isA5 ? 6 : 6.8);
  doc.setTextColor(148, 163, 184);
  doc.text('[ Tanda Tangan Sah ]', signColX, footerY + (isA5 ? 13 : 15.5), { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isA5 ? 7.5 : 8.2);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  const treasurerName = data.school.treasurer_name || 'Hasbi';
  doc.text(treasurerName, signColX, footerY + (isA5 ? 18 : 21.5), { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isA5 ? 6.5 : 7.2);
  doc.setTextColor(grayText[0], grayText[1], grayText[2]);
  const treasurerNip = data.school.treasurer_nip ? `NIP: ${data.school.treasurer_nip}` : 'Pejabat Penandatangan Dokumen';
  doc.text(treasurerNip, signColX, footerY + (isA5 ? 21.5 : 25), { align: 'center' });

  // Bottom Notice
  doc.setFontSize(isA5 ? 5.8 : 6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Catatan: Bukti pembayaran sah yang diterbitkan oleh sistem keuangan Imam Muzani Boarding School. Dilindungi enkripsi barcode verifikasi.',
    marginX,
    pageHeight - (isA5 ? 3 : 4)
  );

  return doc;
}

export async function downloadKwitansiFromDOM(
  element: HTMLElement,
  format: 'A4' | 'A5' | 'Thermal' = 'A5',
  studentName: string = 'Santri',
  receiptNo: string = 'KWT'
): Promise<void> {
  const isThermal = format === 'Thermal';
  const targetWidth = isThermal ? 340 : 820;

  // 1. Create an off-screen fixed container to isolate from modal scroll offset and prevent header clipping
  const stagingContainer = document.createElement('div');
  stagingContainer.style.position = 'fixed';
  stagingContainer.style.top = '0';
  stagingContainer.style.left = '-9999px';
  stagingContainer.style.width = `${targetWidth}px`;
  stagingContainer.style.backgroundColor = '#ffffff';
  stagingContainer.style.zIndex = '-9999';
  stagingContainer.style.margin = '0';
  stagingContainer.style.padding = '0';
  stagingContainer.style.boxSizing = 'border-box';

  // 2. Clone the element
  const clone = element.cloneNode(true) as HTMLElement;
  clone.id = 'kwitansi-clone-render';
  clone.style.width = `${targetWidth}px`;
  clone.style.maxWidth = `${targetWidth}px`;
  clone.style.margin = '0';
  clone.style.padding = isThermal ? '16px' : '28px';
  clone.style.borderRadius = '0';
  clone.style.boxShadow = 'none';
  clone.style.border = 'none';
  clone.style.backgroundColor = '#ffffff';
  clone.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  clone.style.boxSizing = 'border-box';

  // 3. Force Inter font family on ALL descendants and ensure inline-flex is converted to inline-block
  const allElements = clone.querySelectorAll('*');
  allElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    if (htmlEl.classList.contains('inline-flex')) {
      htmlEl.style.display = 'inline-block';
      htmlEl.style.textAlign = 'center';
      htmlEl.style.verticalAlign = 'middle';
    }
  });

  const tables = clone.querySelectorAll('table');
  tables.forEach(table => {
    (table as HTMLElement).style.width = '100%';
    (table as HTMLElement).style.borderCollapse = 'collapse';
    (table as HTMLElement).style.tableLayout = 'fixed';
  });

  const cells = clone.querySelectorAll('th, td');
  cells.forEach(cell => {
    const el = cell as HTMLElement;
    el.style.verticalAlign = 'middle';
    el.style.boxSizing = 'border-box';
    el.style.padding = '8px 12px';
  });

  stagingContainer.appendChild(clone);
  document.body.appendChild(stagingContainer);

  let canvas: HTMLCanvasElement;
  try {
    // High-DPI canvas capture without scroll offset
    canvas = await html2canvas(clone, {
      scale: 3, // Sharp high resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: targetWidth
    });
  } finally {
    // Always clean up staging DOM
    if (document.body.contains(stagingContainer)) {
      document.body.removeChild(stagingContainer);
    }
  }

  const imgData = canvas.toDataURL('image/png');
  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;
  const imgRatio = imgHeightPx / imgWidthPx;

  let doc: jsPDF;
  if (format === 'A5') {
    // A5 Landscape: 210mm x 148mm
    doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5'
    });
    const pageWidth = 210;
    const pageHeight = 148;
    const margin = 8;
    const availWidth = pageWidth - margin * 2;
    const availHeight = pageHeight - margin * 2;

    let printWidth = availWidth;
    let printHeight = printWidth * imgRatio;

    if (printHeight > availHeight) {
      printHeight = availHeight;
      printWidth = printHeight / imgRatio;
    }

    const posX = (pageWidth - printWidth) / 2;
    const posY = (pageHeight - printHeight) / 2;

    doc.addImage(imgData, 'PNG', posX, posY, printWidth, printHeight, undefined, 'FAST');
  } else if (format === 'Thermal') {
    // 80mm roll
    const pageWidth = 80;
    const pageHeight = Math.max(100, 80 * imgRatio + 10);
    doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight]
    });
    doc.addImage(imgData, 'PNG', 2, 5, 76, 76 * imgRatio, undefined, 'FAST');
  } else {
    // A4 Portrait: 210mm x 297mm
    doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const availWidth = pageWidth - margin * 2;
    const availHeight = pageHeight - margin * 2;

    let printWidth = availWidth;
    let printHeight = printWidth * imgRatio;

    if (printHeight > availHeight) {
      printHeight = availHeight;
      printWidth = printHeight / imgRatio;
    }

    const posX = (pageWidth - printWidth) / 2;
    const posY = 15;

    doc.addImage(imgData, 'PNG', posX, posY, printWidth, printHeight, undefined, 'FAST');
  }

  const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanReceipt = receiptNo.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`KWITANSI_${cleanReceipt}_${cleanName}.pdf`);
}

export async function downloadKwitansiPDF(data: KwitansiData, format: 'A4' | 'A5' = 'A5') {
  const doc = await generateKwitansiPDF(data, format);
  const cleanName = data.transaction.student_name.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanTrx = data.transaction.transaction_no.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`KWITANSI_${cleanName}_${cleanTrx}.pdf`);
}

export function exportTableToExcel(fileName: string, sheetName: string, headers: string[], rows: any[][]) {
  const worksheetData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
