import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Receipt,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';

interface LoginProps {
  onOpenParentPortal: () => void;
}

export const Login: React.FC<LoginProps> = ({ onOpenParentPortal }) => {
  const { login } = useAuth();
  const { settings } = useSchool();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMessage('Silakan masukkan nama pengguna dan kata sandi');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    const res = await login(username, password, rememberMe);
    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Login gagal. Periksa kembali akun Anda.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden selection:bg-brand-500 selection:text-white">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Side: Brand Identity & Highlights */}
        <div className="lg:col-span-6 space-y-6">
          {/* Logo & Institution Header */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-900 via-indigo-700 to-blue-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-blue-950/40 border border-blue-400/30 overflow-hidden shrink-0">
              {settings?.app_logo_url ? (
                <img src={settings.app_logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                'IM'
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-semibold mb-1">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>Sistem Informasi Keuangan Terpadu</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                APLIKASI SPP SEKOLAH
              </h1>
              <p className="text-sm text-slate-300 font-medium">
                {settings?.name || 'Imam Muzani Boarding School'}
              </p>
            </div>
          </div>

          {/* School Motto / Hadith Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-blue-200/90 font-serif italic leading-relaxed">
                  "Barangsiapa yang menempuh suatu jalan untuk menuntut ilmu, maka Allah akan memudahkan jalannya menuju surga."
                </p>
                <p className="text-[10px] text-slate-400 mt-1">HR. Muslim no. 2699</p>
              </div>
            </div>
          </div>

          {/* 3 Feature Highlights */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <Receipt className="w-5 h-5 text-blue-400 mb-1.5" />
              <h4 className="text-xs font-bold text-white leading-tight">Billing Engine</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Multi SPP, Eskul & Daftar Ulang</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 mb-1.5" />
              <h4 className="text-xs font-bold text-white leading-tight">Kwitansi & WA</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">PDF A4, A5, Thermal & WA Otomatis</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <Clock className="w-5 h-5 text-sky-400 mb-1.5" />
              <h4 className="text-xs font-bold text-white leading-tight">Laporan Realtime</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Penerimaan kas, pelunasan & tunggakan</p>
            </div>
          </div>

          {/* Parent Self-Check Portal Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-500/30 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-blue-300">
                Akses Mandiri Orang Tua / Wali Santri
              </h4>
              <p className="text-[11px] text-blue-200/70 truncate">
                Cek tagihan SPP, riwayat kwitansi & konfirmasi transfer cukup masukkan NIS
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenParentPortal}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
            >
              <span>Cek NIS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Side: Floating Glass Login Card */}
        <div className="lg:col-span-6">
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/70 relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-semibold mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Portal Petugas & Bendahara</span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  Masuk ke Sistem Keuangan
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Silakan masukkan nama pengguna dan kata sandi akun Anda.
                </p>
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Nama Pengguna / Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Contoh: admin atau bendahara"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checkbox Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800"
                  />
                  <span>Ingat saya di perangkat ini</span>
                </label>

                <button
                  type="button"
                  onClick={onOpenParentPortal}
                  className="text-blue-400 hover:text-blue-300 transition-colors font-semibold flex items-center gap-1"
                >
                  <span>Portal Orang Tua</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-800 hover:from-blue-950 hover:to-indigo-900 text-white font-bold text-sm shadow-lg shadow-blue-950/40 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50 mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Memverifikasi Akun...' : 'Masuk Aplikasi'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
