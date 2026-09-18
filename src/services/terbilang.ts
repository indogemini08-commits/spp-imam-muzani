// Terbilang Rupiah Helper and Indonesian Formatting Utilities

export function terbilang(nominal: number): string {
  if (isNaN(nominal) || nominal === null || nominal === undefined) return 'Nol Rupiah';
  
  const satuan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  function bilang(n: number): string {
    n = Math.floor(Math.abs(n));
    if (n < 12) {
      return ' ' + satuan[n];
    } else if (n < 20) {
      return bilang(n - 10) + ' Belas';
    } else if (n < 100) {
      return bilang(Math.floor(n / 10)) + ' Puluh' + bilang(n % 10);
    } else if (n < 200) {
      return ' Seratus' + bilang(n - 100);
    } else if (n < 1000) {
      return bilang(Math.floor(n / 100)) + ' Ratus' + bilang(n % 100);
    } else if (n < 2000) {
      return ' Seribu' + bilang(n - 1000);
    } else if (n < 1000000) {
      return bilang(Math.floor(n / 1000)) + ' Ribu' + bilang(n % 1000);
    } else if (n < 1000000000) {
      return bilang(Math.floor(n / 1000000)) + ' Juta' + bilang(n % 1000000);
    } else if (n < 1000000000000) {
      return bilang(Math.floor(n / 1000000000)) + ' Miliar' + bilang(n % 1000000000);
    } else {
      return bilang(Math.floor(n / 1000000000000)) + ' Triliun' + bilang(n % 1000000000000);
    }
  }

  if (nominal === 0) return 'Nol Rupiah';
  return bilang(nominal).trim() + ' Rupiah';
}

export function formatRupiah(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return 'Rp 0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

export function formatDateIndo(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  
  const bulanIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const tgl = d.getDate();
  const bln = bulanIndo[d.getMonth()];
  const thn = d.getFullYear();
  return `${tgl} ${bln} ${thn}`;
}

export function formatDateTimeIndo(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  
  const dateFormatted = formatDateIndo(d);
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${dateFormatted} pukul ${jam}:${menit} WIB`;
}
