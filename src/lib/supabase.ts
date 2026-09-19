/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Konfigurasi Koneksi Supabase JS SDK
// Otomatis membaca dari:
// 1. URL Query Parameter (?sb_url=...&sb_key=...) untuk kemudahan share antar-device
// 2. localStorage ('spp_supabase_url' & 'spp_supabase_anon_key')
// 3. Environment Variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY)
// ============================================================================

function resolveCredentials(): { url: string; key: string } {
  let url = '';
  let key = '';

  // 1. Cek Query Param (ketika link di-share ke HP / device lain dengan kredensial)
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const qUrl = params.get('sb_url');
      const qKey = params.get('sb_key');
      if (qUrl && qKey) {
        localStorage.setItem('spp_supabase_url', qUrl.trim());
        localStorage.setItem('spp_supabase_anon_key', qKey.trim());
        url = qUrl.trim();
        key = qKey.trim();
      }
    } catch (_) {}
  }

  // 2. Cek localStorage
  if (!url && typeof window !== 'undefined') {
    try {
      url = localStorage.getItem('spp_supabase_url') || '';
      key = localStorage.getItem('spp_supabase_anon_key') || '';
    } catch (_) {}
  }

  // 3. Cek Vite Environment Variables
  if (!url && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    url = (import.meta as any).env.VITE_SUPABASE_URL || '';
    key = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
  }

  // Default fallback placeholder
  url = url || 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co';
  key = key || 'YOUR_SUPABASE_ANON_KEY_HERE';

  return { url, key };
}

const creds = resolveCredentials();
export const SUPABASE_URL: string = creds.url;
export const SUPABASE_ANON_KEY: string = creds.key;

// Nama bucket Storage sesuai konfigurasi pengguna
export const STORAGE_BUCKET_NAME = 'ImamMuzaniPay';

// Inisialisasi Supabase Client Tunggal
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/**
 * Memeriksa apakah Supabase URL dan Anon Key sudah dikonfigurasi dengan kredensial riil
 */
export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('YOUR_SUPABASE_PROJECT_ID') &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY_HERE')
  );
}

/**
 * Simpan konfigurasi Supabase ke localStorage dan muat ulang halaman
 */
export function saveSupabaseConfig(url: string, key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('spp_supabase_url', url.trim());
    localStorage.setItem('spp_supabase_anon_key', key.trim());
    window.location.reload();
  }
}

/**
 * Hapus konfigurasi Supabase dari localStorage
 */
export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('spp_supabase_url');
    localStorage.removeItem('spp_supabase_anon_key');
    window.location.reload();
  }
}

/**
 * Dapatkan link share yang otomatis mengaktifkan database Supabase di perangkat lain
 */
export function getShareableSupabaseLink(): string {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return '';
  const base = window.location.origin + window.location.pathname;
  return `${base}?sb_url=${encodeURIComponent(SUPABASE_URL)}&sb_key=${encodeURIComponent(SUPABASE_ANON_KEY)}`;
}

/**
 * Mendapatkan Public URL untuk file gambar di bucket Storage ImamMuzaniPay
 */
export function getStoragePublicUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload file gambar ke bucket Storage ImamMuzaniPay
 */
export async function uploadToImamMuzaniPay(
  file: File,
  folder: 'proofs' | 'logos' | 'stamps' | 'signatures' | 'students' = 'proofs'
): Promise<{ success: boolean; url: string; error?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi dengan URL & Anon Key yang valid');
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const publicUrl = getStoragePublicUrl(fileName);
    return { success: true, url: publicUrl };
  } catch (err: any) {
    console.error('Gagal upload gambar ke bucket ImamMuzaniPay:', err);
    return {
      success: false,
      url: '',
      error: err?.message || 'Gagal mengunggah file ke Supabase Storage'
    };
  }
}
