import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  Share2,
  Copy,
  Check,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Laptop,
  Zap,
  ExternalLink,
  Lock,
  KeyRound,
  Globe
} from 'lucide-react';
import { Modal } from './Modal';
import {
  isSupabaseConfigured,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STORAGE_BUCKET_NAME,
  saveSupabaseConfig,
  clearSupabaseConfig,
  getShareableSupabaseLink,
  supabase
} from '../../lib/supabase';
import { supabaseService } from '../../services/supabaseService';
import { useNotification } from '../../context/NotificationContext';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const { success, error, info } = useNotification();
  const configured = isSupabaseConfigured();

  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrlInput(configured ? SUPABASE_URL : (localStorage.getItem('spp_supabase_url') || ''));
      setKeyInput(configured ? SUPABASE_ANON_KEY : (localStorage.getItem('spp_supabase_anon_key') || ''));
      setTestResult(null);
    }
  }, [isOpen, configured]);

  const shareableLink = getShareableSupabaseLink();

  const handleCopyShareLink = async () => {
    if (!shareableLink) {
      error('Konfigurasikan Supabase URL & Anon Key terlebih dahulu sebelum membagikan link sinkronisasi.');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopiedLink(true);
      success('Link sinkronisasi berhasil disalin! Buka link ini di browser HP atau perangkat lain untuk langsung terhubung ke database yang sama.');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (_) {
      error('Gagal menyalin link secara otomatis.');
    }
  };

  const handleTestConnection = async () => {
    const testUrl = urlInput.trim();
    const testKey = keyInput.trim();

    if (!testUrl || !testKey) {
      error('Mohon isi Supabase URL dan Anon Key terlebih dahulu');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(`${testUrl}/rest/v1/school_settings?select=id&limit=1`, {
        headers: {
          apikey: testKey,
          Authorization: `Bearer ${testKey}`
        }
      });

      if (res.ok) {
        setTestResult({ ok: true, message: 'Koneksi ke Supabase berhasil! Database cloud aktif dan siap sinkronisasi.' });
        success('Tes koneksi Supabase berhasil!');
      } else {
        const text = await res.text();
        setTestResult({
          ok: false,
          message: `Gagal terhubung (${res.status}): Pastikan tabel Supabase sudah dibuat sesuai SQL Blueprint.`
        });
        error(`Gagal menghubungkan ke Supabase: ${res.statusText}`);
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: `Terjadi kendala jaringan: ${err.message || 'URL Supabase tidak valid atau tidak dapat dijangkau.'}`
      });
      error('Koneksi gagal: ' + (err.message || 'Periksa kembali URL Supabase'));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = () => {
    const u = urlInput.trim();
    const k = keyInput.trim();
    if (!u || !k) {
      error('Supabase URL dan Anon Key wajib diisi');
      return;
    }
    saveSupabaseConfig(u, k);
  };

  const handleClearConfig = () => {
    if (confirm('Apakah Anda yakin ingin memutus koneksi Supabase di perangkat ini? Aplikasi akan kembali ke mode database lokal.')) {
      clearSupabaseConfig();
    }
  };

  const handleUploadLocalDataToSupabase = async () => {
    if (!configured) {
      error('Hubungkan Supabase terlebih dahulu sebelum mengunggah data lokal.');
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Fetch local school settings
      const schoolRes = await fetch('/api/school').then(r => r.ok ? r.json() : null).catch(() => null);
      if (schoolRes) {
        await supabaseService.school.updateSettings(schoolRes);
      }

      // 2. Fetch local spp types
      const sppRes = await fetch('/api/spp-types').then(r => r.ok ? r.json() : []).catch(() => []);
      for (const s of sppRes) {
        await supabaseService.master.createSppType(s);
      }

      // 3. Fetch local eskul
      const eskulRes = await fetch('/api/eskul').then(r => r.ok ? r.json() : []).catch(() => []);
      for (const e of eskulRes) {
        await supabaseService.master.createEskulType(e);
      }

      // 4. Fetch local annual bills
      const annRes = await fetch('/api/annual-bills').then(r => r.ok ? r.json() : { types: [] }).catch(() => ({ types: [] }));
      const annTypes = annRes.types || [];
      for (const a of annTypes) {
        await supabaseService.master.createAnnualBillType(a);
      }

      // 5. Fetch local students
      const stdRes = await fetch('/api/students').then(r => r.ok ? r.json() : []).catch(() => []);
      for (const st of stdRes) {
        await supabaseService.students.create(st);
      }

      success(`Sinkronisasi selesai! Berhasil mengunggah ${stdRes.length} santri, ${sppRes.length} jenis SPP, ${eskulRes.length} eskul, dan ${annTypes.length} tagihan ke cloud Supabase.`);
      window.dispatchEvent(new CustomEvent('supabase-data-changed', { detail: { type: 'initial_sync' } }));
    } catch (err: any) {
      error('Gagal mengunggah data ke Supabase: ' + (err.message || ''));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sinkronisasi Cloud Realtime & Multi-Device"
      maxWidth="2xl"
    >
      <div className="space-y-6 text-slate-800 dark:text-slate-100">
        {/* Status Header Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            configured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                configured ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-amber-500 text-white'
              }`}
            >
              {configured ? <Cloud className="w-6 h-6 animate-pulse" /> : <CloudOff className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm sm:text-base">
                  {configured ? 'Database Cloud Supabase Terhubung' : 'Mode Database Lokal (Belum Terkoneksi Cloud)'}
                </h4>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    configured ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                  }`}
                >
                  {configured ? 'ONLINE REALTIME' : 'LOKAL / STANDBY'}
                </span>
              </div>
              <p className="text-xs opacity-90 mt-0.5">
                {configured
                  ? 'Setiap penambahan, pengubahan, atau penghapusan data tersinkronisasi otomatis ke semua device (Desktop & HP).'
                  : 'Data saat ini tersimpan secara lokal. Hubungkan ke Supabase agar tersinkronisasi antar perangkat dan tidak hilang saat di-refresh.'}
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Device Link Sharing Feature */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-indigo-950/40 border border-blue-200/80 dark:border-indigo-800/50 space-y-3">
          <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-300">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h5 className="font-bold text-sm">Bagikan Tautan Sinkronisasi ke HP & Perangkat Lain</h5>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Kirim tautan ini via WhatsApp ke smartphone atau laptop staf/wali santri. Begitu link dibuka di HP, perangkat tersebut <strong className="text-blue-900 dark:text-blue-200">langsung otomatis tersambung ke database yang sama</strong> tanpa perlu konfigurasi ulang!
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono truncate text-slate-600 dark:text-slate-400 select-all">
              {shareableLink || 'Supabase belum terkonfigurasi'}
            </div>
            <button
              type="button"
              onClick={handleCopyShareLink}
              disabled={!configured}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link HP'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Inputs */}
        <div className="space-y-4 pt-2">
          <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>Kredensial Proyek Supabase</span>
          </h5>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Project URL (SUPABASE_URL)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Anon Public Key (SUPABASE_ANON_KEY)
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showKey ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-xs border border-slate-200 dark:border-slate-700">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Nama Storage Bucket Bukti & Berkas:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-800">
              {STORAGE_BUCKET_NAME}
            </span>
          </div>

          {/* Test connection alert */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                testResult.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{testResult.message}</div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !urlInput || !keyInput}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Menguji...' : 'Uji Koneksi'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all ml-auto"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simpan & Aktifkan</span>
            </button>

            {configured && (
              <button
                type="button"
                onClick={handleClearConfig}
                className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold transition-colors"
              >
                Putuskan Sambungan
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Sync Local Data */}
        {configured && (
          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h6 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Migrasi 1-Klik: Unggah Data Master Lokal ke Supabase
                </h6>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Jika Anda baru saja menghubungkan Supabase baru, klik ini untuk langsung mengisi data santri, jenis SPP, dan pengaturan sekolah yang sudah ada ke cloud.
                </p>
              </div>
              <button
                type="button"
                onClick={handleUploadLocalDataToSupabase}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 disabled:opacity-50"
              >
                <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>{isSyncing ? 'Mengunggah...' : 'Unggah Data Lokal'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
