import React, { useState, useEffect } from 'react';
import { Send, ExternalLink, MessageCircle, Phone, User, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  recipientPhone: string;
  recipientName?: string;
  initialMessage?: string;
  onSuccess?: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  recipientPhone: defaultPhone,
  recipientName: defaultName,
  initialMessage: defaultMsg,
  onSuccess
}) => {
  const [phone, setPhone] = useState(defaultPhone || '');
  const [name, setName] = useState(defaultName || 'Orang Tua / Wali');
  const [message, setMessage] = useState(defaultMsg || '');
  const [isSending, setIsSending] = useState(false);
  const { success, error } = useNotification();

  useEffect(() => {
    setPhone(defaultPhone || '');
    setName(defaultName || 'Orang Tua / Wali');
    setMessage(defaultMsg || '');
  }, [defaultPhone, defaultName, defaultMsg, isOpen]);

  if (!isOpen) return null;

  const handleOpenDirectWa = async () => {
    if (!phone) {
      error('Nomor WhatsApp tujuan wajib diisi');
      return;
    }

    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
    else if (!cleaned.startsWith('62')) cleaned = '62' + cleaned;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleaned}?text=${encoded}`;

    // Record log in backend
    try {
      await api.whatsapp.sendSingle({
        student_id: studentId,
        recipient_phone: phone,
        recipient_name: name,
        message,
        channel: 'Direct wa.me'
      });
    } catch {}

    window.open(url, '_blank');
    success('Membuka WhatsApp Web / Aplikasi dan mencatat ke log');
    if (onSuccess) onSuccess();
    onClose();
  };

  const handleSimulateApiSend = async () => {
    if (!phone || !message) {
      error('Nomor tujuan dan pesan wajib diisi');
      return;
    }

    setIsSending(true);
    try {
      await api.whatsapp.sendSingle({
        student_id: studentId,
        recipient_phone: phone,
        recipient_name: name,
        message,
        channel: 'Gateway API'
      });

      success(`Pesan pengingat berhasil dikirim ke ${phone}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      error(err.message || 'Gagal mengirim pengingat WhatsApp');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kirim Pengingat WhatsApp"
      subtitle={`Penerima: Orang Tua / Wali dari ${studentName}`}
      maxWidth="3xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="md:col-span-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nomor WhatsApp Tujuan
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0812xxxxxxxx"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Dapat menggunakan format 08xx atau 62xx
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Penerima
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nama Wali Santri"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Isi Pesan WhatsApp (Dapat Diedit)
            </label>
            <textarea
              rows={8}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleOpenDirectWa}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka WhatsApp Web / App (wa.me)</span>
            </button>

            <button
              type="button"
              onClick={handleSimulateApiSend}
              disabled={isSending}
              className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-brand-600/15 hover:bg-brand-600/25 text-brand-700 dark:text-brand-300 border border-brand-500/30 rounded-xl text-xs font-semibold transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Mengirim...' : 'Simulasi Kirim via Gateway API'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live WhatsApp Bubble Preview */}
        <div className="md:col-span-6 flex flex-col">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Pratinjau Bubble Chat WhatsApp
          </label>
          <div className="flex-1 bg-[#efeae2] dark:bg-[#0b141a] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-end shadow-inner relative overflow-hidden min-h-[320px]">
            {/* Header chat mockup */}
            <div className="absolute top-0 left-0 right-0 bg-[#008069] text-white px-3.5 py-2.5 flex items-center gap-2.5 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-tight truncate">{name}</p>
                <p className="text-[10px] text-emerald-100">{phone}</p>
              </div>
            </div>

            {/* Chat message bubble */}
            <div className="mt-12 bg-white dark:bg-[#1f2c34] p-3.5 rounded-xl rounded-tl-none shadow-sm max-w-[92%] self-start border border-black/5">
              <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed font-sans">
                {message || 'Pesan belum diisi...'}
              </p>
              <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-slate-400">
                <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                <CheckCircle2 className="w-3 h-3 text-sky-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
