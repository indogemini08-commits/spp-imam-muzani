import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SchoolSettings } from '../types';
import { api } from '../services/api';

interface SchoolContextType {
  settings: SchoolSettings | null;
  isLoading: boolean;
  reloadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<SchoolSettings>) => Promise<void>;
}

const defaultSettings: SchoolSettings = {
  id: 'school_main',
  name: 'IMAM MUZANI BOARDING SCHOOL',
  address: 'Jl. Pendidikan Islam No. 45, Kompleks Islamic Center',
  city: 'Bogor, Jawa Barat',
  email: 'keuangan@imbs.sch.id',
  phone: '(0251) 8345678',
  whatsapp: '081298765432',
  active_academic_year_id: 'ta_2026_2027',
  treasurer_name: 'Ustadz Fakhrur Rodhi Al-Hanafi, S.E.',
  treasurer_nip: '198805122014021003',
  logo_url: '',
  app_logo_url: '',
  stamp_url: '',
  signature_url: '',
  trx_prefix: 'TRX',
  receipt_prefix: 'KWT',
  next_trx_seq: 1,
  next_receipt_seq: 1,
  wa_provider: 'direct_link',
  wa_sender_number: '081298765432',
  wa_sender_name: 'Bendahara IMBS',
  wa_footer: 'Pesan otomatis sistem administrasi keuangan Imam Muzani Boarding School',
  yayasan_name: 'YAYASAN PENDIDIKAN ISLAM IMAM MUZANI',
  headmaster_title: 'Kepala Sekolah / Mudir Pesantren',
  headmaster_name: "KH. Abdullah Syafi'i, Lc., M.Pd.I.",
  headmaster_nip: 'NIY: 197804152005011002',
  bank_accounts: [
    { id: 'bank_1', bank_name: 'Bank Syariah Indonesia (BSI)', bank_code: '451', account_number: '7123-456-789', account_name: 'IMBS Keuangan SPP', is_active: true },
    { id: 'bank_2', bank_name: 'Bank Central Asia (BCA)', bank_code: '014', account_number: '800-123-4567', account_name: 'Yayasan Imam Muzani Boarding School', is_active: true },
    { id: 'bank_3', bank_name: 'Bank Muamalat', bank_code: '147', account_number: '102-000-8899', account_name: 'SPP Imam Muzani', is_active: true }
  ],
  available_classes: ['VII', 'VIII', 'IX', 'X', 'XI', 'XII']
};

export const DEFAULT_AVAILABLE_CLASSES = ['VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const SchoolProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SchoolSettings | null>(() => {
    try {
      const cached = localStorage.getItem('spp_school_settings');
      return cached ? JSON.parse(cached) : defaultSettings;
    } catch (_) {
      return defaultSettings;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const reloadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.school.getSettings();
      if (data) {
        setSettings(data);
        localStorage.setItem('spp_school_settings', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Gagal memuat pengaturan sekolah dari API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SchoolSettings>) => {
    if (!settings) return;
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    localStorage.setItem('spp_school_settings', JSON.stringify(merged));
    await api.school.updateSettings(merged);
  };

  useEffect(() => {
    reloadSettings();
  }, []);

  return (
    <SchoolContext.Provider value={{ settings, isLoading, reloadSettings, updateSettings }}>
      {children}
    </SchoolContext.Provider>
  );
};

export const useSchool = (): SchoolContextType => {
  const ctx = useContext(SchoolContext);
  if (!ctx) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return ctx;
};

export const useAvailableClasses = (): string[] => {
  const { settings } = useSchool();
  if (settings?.available_classes && Array.isArray(settings.available_classes) && settings.available_classes.length > 0) {
    return settings.available_classes;
  }
  return DEFAULT_AVAILABLE_CLASSES;
};
