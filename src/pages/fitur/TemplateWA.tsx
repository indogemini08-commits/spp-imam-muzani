import React, { useState, useEffect } from 'react';
import { FileText, Save, Check, Plus, MessageCircle, Info, Sparkles } from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { WhatsAppTemplate } from '../../types';

export const TemplateWA: React.FC = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [isActive, setIsActive] = useState(true);

  const { success, error } = useNotification();

  const loadTemplates = async () => {
    try {
      const data = await api.whatsapp.getTemplates();
      setTemplates(data || []);
      if (data && data.length > 0 && !activeTemplate) {
        selectTemplate(data[0]);
      }
    } catch (err: any) {
      error(err.message || 'Gagal memuat template WhatsApp');
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const selectTemplate = (tpl: WhatsAppTemplate) => {
    setActiveTemplate(tpl);
    setTemplateName(tpl.name);
    setTemplateContent(tpl.content);
    setIsActive(Boolean(tpl.is_active));
  };

  const handleInsertVariable = (variableKey: string) => {
    setTemplateContent(prev => prev + ` {${variableKey}} `);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;

    setIsSaving(true);
    try {
      await api.whatsapp.updateTemplate(activeTemplate.id, {
        name: templateName,
        content: templateContent,
        is_active: isActive
      });
      success('Template pesan WhatsApp berhasil diperbarui');
      await loadTemplates();
    } catch (err: any) {
      error(err.message || 'Gagal menyimpan template');
    } finally {
      setIsSaving(false);
    }
  };

  // Mock variables for live preview
  const previewVariables: Record<string, string> = {
    nama: 'Muhammad Al-Fatih Pratama',
    nis: '202607001',
    kelas: '7A',
    sekolah: 'IMAM MUZANI BOARDING SCHOOL',
    tahun_pelajaran: '2026/2027',
    rincian: '• SPP September 2026: Rp 1.500.000\n• Eskul Tahfidz: Rp 150.000',
    total: 'Rp 1.650.000',
    tanggal_jatuh_tempo: '10 September 2026',
    nomor_transaksi: 'TRX-202609-001',
    link_tagihan: 'https://imbs.sch.id/portal?nis=202607001'
  };

  const renderLivePreview = () => {
    let text = templateContent;
    for (const [k, v] of Object.entries(previewVariables)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return text;
  };

  const availableVariables = [
    { key: 'nama', label: 'Nama Santri' },
    { key: 'nis', label: 'NIS Santri' },
    { key: 'kelas', label: 'Kelas' },
    { key: 'sekolah', label: 'Nama Sekolah' },
    { key: 'rincian', label: 'Rincian Tagihan' },
    { key: 'total', label: 'Total Tagihan' },
    { key: 'tanggal_jatuh_tempo', label: 'Jatuh Tempo' },
    { key: 'nomor_transaksi', label: 'No Transaksi / Kwitansi' },
    { key: 'link_tagihan', label: 'Link Portal Santri' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-600" />
          <span>Pengaturan Template Pesan WhatsApp</span>
        </h2>
        <p className="text-xs text-slate-500">
          Kustomisasi format pesan WhatsApp pengingat tagihan, kwitansi pembayaran, dan informasi sekolah
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Template Selector List */}
        <div className="lg:col-span-4 space-y-3">
          <GlassCard className="p-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 px-2">
              Daftar Template
            </h3>
            <div className="space-y-1.5">
              {templates.map((tpl) => {
                const isSelected = activeTemplate?.id === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => selectTemplate(tpl)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 border ${
                      isSelected
                        ? 'bg-brand-50/80 dark:bg-brand-950/30 border-brand-500/40 text-brand-700 dark:text-brand-300 shadow-sm'
                        : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs">{tpl.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          tpl.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      ></span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">
                      {tpl.trigger_type}
                    </span>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Quick Help Card */}
          <GlassCard className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">Variabel Dinamis</h4>
                <p className="text-[11px] text-blue-700/80 dark:text-blue-300/70 mt-1 leading-relaxed">
                  Gunakan tombol variabel di sebelah kanan untuk menyisipkan data santri secara otomatis ketika pesan dikirim.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Center & Right: Editor & Live Preview */}
        <div className="lg:col-span-8 space-y-6">
          {activeTemplate ? (
            <form onSubmit={handleSave} className="space-y-6">
              <GlassCard className="p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Editor Template
                    </h3>
                    <p className="text-xs text-slate-400">Kode Trigger: {activeTemplate.trigger_type}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>Template Aktif</span>
                    </label>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Template
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Isi Pesan WhatsApp
                    </label>
                    <span className="text-[11px] text-slate-400">Gunakan *tebal*, _miring_ untuk format teks</span>
                  </div>

                  {/* Variable insertion buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Klik Variabel:</span>
                    {availableVariables.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => handleInsertVariable(v.key)}
                        className="px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-brand-50 dark:hover:bg-brand-950/50 hover:text-brand-600 dark:hover:text-brand-300 border border-slate-200 dark:border-slate-600 rounded-md text-[10px] font-mono font-medium transition-colors"
                      >
                        {`{${v.key}}`}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={8}
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    required
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
                  />
                </div>
              </GlassCard>

              {/* Live Preview Card */}
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-500" />
                    <span>Pratinjau Tampilan Pesan WhatsApp (Simulasi Live)</span>
                  </h3>
                  <span className="text-[10px] text-slate-400">Contoh data santri aktif</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#0b141a] text-slate-100 shadow-inner flex justify-end">
                  <div className="max-w-md bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-xs p-3 shadow-md text-xs font-sans leading-relaxed whitespace-pre-wrap relative">
                    {renderLivePreview()}
                    <div className="flex justify-end items-center gap-1 mt-1 text-[9px] text-emerald-200/60">
                      <span>14:30</span>
                      <Check className="w-3 h-3 text-emerald-300" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </form>
          ) : (
            <GlassCard className="p-12 text-center text-slate-400">
              Pilih template di sebelah kiri untuk mulai mengedit.
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};
