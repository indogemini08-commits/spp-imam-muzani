import React, { useState, useEffect } from 'react';
import {
  MessageCircle, Send, CheckSquare, Square, RefreshCw,
  ExternalLink, Search, Filter, Phone, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';
import { api } from '../../services/api';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { useNotification } from '../../context/NotificationContext';

export const PengingatWA: React.FC = () => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [search, setSearch] = useState('');

  // Single WhatsApp Modal
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<any>(null);

  // Preview Message Modal
  const [previewItem, setPreviewItem] = useState<any>(null);

  const { success, error, info } = useNotification();

  const loadReminders = async () => {
    setIsLoading(true);
    try {
      const data = await api.whatsapp.getReminders();
      setReminders(data || []);
      setSelectedIds([]);
    } catch (err: any) {
      error(err.message || 'Gagal memuat data pengingat WhatsApp');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, []);

  // Filtered recipients
  const filtered = reminders.filter((item) => {
    const matchClass = !selectedClass || item.student.class_name === selectedClass;
    const matchSearch =
      !search ||
      item.student.name.toLowerCase().includes(search.toLowerCase()) ||
      item.student.nis.includes(search) ||
      (item.student.parent_phone && item.student.parent_phone.includes(search));
    return matchClass && matchSearch;
  });

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(f => f.student.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkSend = async () => {
    if (selectedIds.length === 0) {
      info('Pilih santri yang akan dikirimkan pengingat');
      return;
    }

    const itemsToSend = reminders
      .filter(r => selectedIds.includes(r.student.id))
      .map(r => ({
        student_id: r.student.id,
        recipient_phone: r.student.parent_phone,
        recipient_name: r.student.parent_name || 'Orang Tua / Wali',
        message: r.generatedMessage
      }));

    setIsBulkSending(true);
    setBulkProgress(10);

    try {
      const step = 90 / itemsToSend.length;
      for (let i = 0; i < itemsToSend.length; i++) {
        setBulkProgress(Math.min(95, 10 + Math.round((i + 1) * step)));
      }

      await api.whatsapp.sendBulk(itemsToSend);
      setBulkProgress(100);
      success(`Berhasil memproses pengiriman ${itemsToSend.length} pesan pengingat WhatsApp`);
      setSelectedIds([]);
      await loadReminders();
    } catch (err: any) {
      error(err.message || 'Gagal mengirim pengingat massal');
    } finally {
      setIsBulkSending(false);
      setBulkProgress(0);
    }
  };

  const totalArrearsFiltered = filtered.reduce((acc, r) => acc + (r.totalArrears || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <span>Kirim Pengingat Tagihan WhatsApp</span>
          </h2>
          <p className="text-xs text-slate-500">
            Kirimkan notifikasi tagihan jatuh tempo secara langsung via WhatsApp Web atau Broadcast Massal
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadReminders}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Pindai Ulang</span>
          </button>

          <button
            type="button"
            onClick={handleBulkSend}
            disabled={isBulkSending || selectedIds.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              selectedIds.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Massal ({selectedIds.length})</span>
          </button>
        </div>
      </div>

      {/* Progress Bar if Bulk Sending */}
      {isBulkSending && (
        <GlassCard className="p-4 bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Mengirim Notifikasi WhatsApp Massal...
            </span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{bulkProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 transition-all duration-300 rounded-full"
              style={{ width: `${bulkProgress}%` }}
            ></div>
          </div>
        </GlassCard>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <GlassCard className="p-3.5 border-l-4 border-l-emerald-500">
          <p className="text-[11px] font-medium text-slate-500">Santri Siap Diingatkan</p>
          <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {filtered.length} <span className="text-xs font-normal text-slate-400">santri</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Memiliki tagihan aktif / jatuh tempo</p>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-amber-500">
          <p className="text-[11px] font-medium text-slate-500">Total Nominal Tertagih</p>
          <h3 className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1 truncate">
            {formatRupiah(totalArrearsFiltered)}
          </h3>
          <p className="text-[10px] text-amber-500/80 mt-0.5">Akumulasi sisa kewajiban</p>
        </GlassCard>

        <GlassCard className="p-3.5 border-l-4 border-l-blue-500">
          <p className="text-[11px] font-medium text-slate-500">Santri Terpilih</p>
          <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {selectedIds.length} <span className="text-xs font-normal text-slate-400">dari {filtered.length}</span>
          </h3>
          <p className="text-[10px] text-blue-500/80 mt-0.5">Siap dikirimkan notifikasi massal</p>
        </GlassCard>
      </div>

      {/* Filters & Actions */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all"
            >
              {selectedIds.length === filtered.length && filtered.length > 0 ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-brand-600" />
                  <span>Batal Pilih Semua</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Pilih Semua Santri</span>
                </>
              )}
            </button>

            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Semua Kelas</option>
              <option value="7A">Kelas 7A</option>
              <option value="7B">Kelas 7B</option>
              <option value="8A">Kelas 8A</option>
              <option value="8B">Kelas 8B</option>
              <option value="9A">Kelas 9A</option>
              <option value="10 IPA">Kelas 10 IPA</option>
            </select>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, atau no HP..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </GlassCard>

      {/* Recipient Table */}
      <GlassCard className="overflow-hidden border border-slate-200/80 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-3 px-3 font-semibold w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                <th className="py-3 px-3 font-semibold">Santri & Kelas</th>
                <th className="py-3 px-3 font-semibold">Wali & Kontak WhatsApp</th>
                <th className="py-3 px-3 font-semibold">Pos Tagihan Belum Lunas</th>
                <th className="py-3 px-3 font-semibold text-right">Total Tunggakan</th>
                <th className="py-3 px-3 font-semibold text-center">Pengingat Terakhir</th>
                <th className="py-3 px-3 font-semibold text-center">Aksi Langsung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memindai santri yang memiliki tunggakan tagihan...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                    Tidak ada tunggakan yang perlu diingatkan saat ini.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isChecked = selectedIds.includes(item.student.id);
                  return (
                    <tr
                      key={item.student.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                        isChecked ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(item.student.id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{item.student.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-400">{item.student.nis}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                            {item.student.class_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {item.student.parent_name || 'Wali Santri'}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          <span>{item.student.parent_phone || 'Belum diisi'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate" title={item.rincianText}>
                          {item.bills.map((b: any) => b.bill_name).join(', ')}
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {item.bills.length} item tagihan tertunda
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatRupiah(item.totalArrears)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.lastReminderDate ? (
                          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatDateIndo(item.lastReminderDate)}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Belum pernah</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-medium transition-all"
                            title="Lihat draf pesan"
                          >
                            Preview
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveStudent({
                                id: item.student.id,
                                name: item.student.name,
                                phone: item.student.parent_phone,
                                message: item.generatedMessage
                              });
                              setWaModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-sm transition-all"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>Kirim WA</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* WhatsApp Modal Single */}
      {activeStudent && (
        <WhatsAppModal
          isOpen={waModalOpen}
          onClose={() => {
            setWaModalOpen(false);
            setActiveStudent(null);
          }}
          studentId={activeStudent.id}
          studentName={activeStudent.name}
          recipientPhone={activeStudent.phone}
          initialMessage={activeStudent.message}
          onSuccess={() => {
            loadReminders();
          }}
        />
      )}

      {/* Preview Message Modal */}
      {previewItem && (
        <Modal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          title={`Pratinjau Pesan WA - ${previewItem.student.name}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 font-sans text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {previewItem.generatedMessage}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Nomor Tujuan: <strong>{previewItem.student.parent_phone}</strong></span>
              <span>Total: <strong>{formatRupiah(previewItem.totalArrears)}</strong></span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() => {
                  const item = previewItem;
                  setPreviewItem(null);
                  setActiveStudent({
                    id: item.student.id,
                    name: item.student.name,
                    phone: item.student.parent_phone,
                    message: item.generatedMessage
                  });
                  setWaModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Buka di WhatsApp</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
