/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Konfigurasi Koneksi Supabase JS SDK
// Ganti nilai placeholder ini atau atur di file .env / Vercel Environment Variables:
// VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
// ============================================================================

export const SUPABASE_URL: string = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || 
  'https://YOUR_SUPABASE_PROJECT_ID.supabase.co';

export const SUPABASE_ANON_KEY: string = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || 
  'YOUR_SUPABASE_ANON_KEY_HERE';

// Nama bucket Storage sesuai konfigurasi pengguna
export const STORAGE_BUCKET_NAME = 'ImamMuzaniPay';

// Inisialisasi Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
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
 * Mendapatkan Public URL untuk file gambar di bucket Storage ImamMuzaniPay
 * @param path Nama file atau path di dalam bucket (misal: 'school/logo.png' atau 'proofs/kwt_123.jpg')
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
 * @param file File binary dari input file
 * @param folder Direktori di dalam bucket (misal: 'proofs', 'logos', 'signatures')
 * @returns Public URL gambar yang berhasil di-upload
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
