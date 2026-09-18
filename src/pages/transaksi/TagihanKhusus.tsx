import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Filter,
  PlusCircle,
  CreditCard,
  Calendar,
  CheckCircle2,
  Trash2,
  Send,
  ArrowRight,
  PackageCheck,
  ShoppingBag,
  Tag,
  AlertCircle,
  Eye
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { Student } from '../../types';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { useNotification } from '../../context/NotificationContext';
import { PageView } from '../../components/layout/Sidebar';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';

interface TagihanKhususProps {
  onNavigate: (page: PageView) => void;
}

import { Plus } from 'lucide-react';

interface KhususItemForm {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  due_date: string;
  notes: string;
}

const getDefaultDueDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14); // 2 weeks default
  return d.toISOString().split('T')[0];
};

const createDefaultKhususItem = (): KhususItemForm => ({
  id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  item_name: '',
  category: 'Kebutuhan Asrama',
  quantity: 1,
  unit_price: 100000,
  due_date: getDefaultDueDate(),
  notes: ''
});

export const TagihanKhusus: React.FC<TagihanKhususProps> = ({ onNavigate }) => {
  const [bills, setBills] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<any>(null);
  const [selectedDetailGroup, setSelectedDetailGroup] = useState<any>(null);

  // Multi-item Form State
  const [formStudentId, setFormStudentId] = useState('');
  const [formItems, setFormItems] = useState<KhususItemForm[]>([createDefaultKhususItem()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WhatsApp Modal
  const [waModalProps, setWaModalProps] = useState<any>({ isOpen: false });

  const { success, error } = useNotification();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [billsData, stdData] = await Promise.all([
        api.billing.getKhususBills({
          search,
          class_name: classFilter,
          status: statusFilter
        }),
        api.students.getAll({ status: 'Aktif' })
      ]);
      setBills(billsData);
      setStudents(stdData);
      if (stdData.length > 0 && !formStudentId) {
        setFormStudentId(stdData[0].id);
      }
    } catch (err: any) {
      error(err.message || 'Gagal memuat data tagihan khusus');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Multi-item handlers
  const handleAddItem = () => {
    const lastDueDate = formItems[formItems.length - 1]?.due_date || getDefaultDueDate();
    const newItem = createDefaultKhususItem();
    newItem.due_date = lastDueDate;
    setFormItems(prev => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (formItems.length <= 1) return;
    setFormItems(prev => prev.filter(it => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof KhususItemForm, value: any) => {
    setFormItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      return { ...it, [field]: value };
    }));
  };

  // Submit create bills
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId) {
      error('Pilih santri terlebih dahulu');
      return;
    }

    // Validate all items
    for (let i = 0; i < formItems.length; i++) {
      const it = formItems[i];
      if (!it.item_name.trim()) {
        error(`Nama tagihan / kebutuhan pada Item #${i + 1} belum diisi`);
        return;
      }
      if (it.quantity <= 0 || isNaN(it.quantity)) {
        error(`Jumlah (Qty) pada Item #${i + 1} ("${it.item_name}") harus lebih dari 0`);
        return;
      }
      if (it.unit_price <= 0 || isNaN(it.unit_price)) {
        error(`Harga satuan pada Item #${i + 1} ("${it.item_name}") harus lebih dari Rp 0`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloadItems = formItems.map(it => ({
        item_name: it.item_name.trim(),
        category: it.category,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_amount: it.quantity * it.unit_price,
        due_date: it.due_date,
        notes: it.notes.trim()
      }));

      await api.billing.createKhususBill({
        student_id: formStudentId,
        items: payloadItems
      });

      success(`${formItems.length} item tagihan khusus berhasil diterbitkan untuk santri.`);
      setIsCreateModalOpen(false);
      setFormItems([createDefaultKhususItem()]);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal membuat tagihan khusus');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete bill or group of bills
  const handleDeleteConfirm = async () => {
    if (!billToDelete) return;
    try {
      if (billToDelete.isGroup && billToDelete.items) {
        await Promise.all(billToDelete.items.map((it: any) => api.billing.deleteBill(it.id)));
        success(`Seluruh tagihan khusus belum terbayar untuk ${billToDelete.student_name} berhasil dibatalkan dan dihapus.`);
      } else {
        await api.billing.deleteBill(billToDelete.id);
        success('Tagihan khusus berhasil dibatalkan dan dihapus.');
      }
      setIsDeleteModalOpen(false);
      setBillToDelete(null);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal menghapus tagihan');
    }
  };

  // Group bills by student (1 row per student)
  const groupedStudentBills = React.useMemo(() => {
    const map = new Map<string, any>();
    const todayStr = new Date().toISOString().split('T')[0];

    for (const b of bills) {
      if (!map.has(b.student_id)) {
        map.set(b.student_id, {
          student_id: b.student_id,
          student_name: b.student_name,
          student_nis: b.student_nis,
          class_name: b.class_name,
          parent_phone: b.parent_phone,
          father_name: b.father_name,
          items: [],
          total_amount: 0,
          total_paid: 0,
          total_remaining: 0,
          earliest_due_date: b.due_date,
          latest_due_date: b.due_date,
          overall_status: 'LUNAS'
        });
      }

      const sGroup = map.get(b.student_id)!;
      sGroup.items.push(b);
      sGroup.total_amount += (b.amount || 0);
      sGroup.total_paid += (b.paid_amount || 0);
      sGroup.total_remaining += (b.remaining_amount || 0);

      if (b.due_date) {
        if (!sGroup.earliest_due_date || b.due_date < sGroup.earliest_due_date) {
          sGroup.earliest_due_date = b.due_date;
        }
        if (!sGroup.latest_due_date || b.due_date > sGroup.latest_due_date) {
          sGroup.latest_due_date = b.due_date;
        }
      }
    }

    return Array.from(map.values()).map(sg => {
      let status = 'LUNAS';
      if (sg.total_remaining > 0) {
        if (sg.total_paid > 0) {
          status = 'SEBAGIAN';
        } else {
          const hasOverdue = sg.items.some((it: any) => it.due_date && it.due_date < todayStr && it.status !== 'LUNAS');
          status = hasOverdue ? 'TUNGGAKAN' : 'BELUM_BAYAR';
        }
      }
      return {
        ...sg,
        overall_status: status
      };
    });
  }, [bills]);

  // Open WhatsApp Reminder for grouped student bills
  const handleOpenWhatsAppGroup = (group: any) => {
    const itemLines = group.items.map((it: any, idx: number) => {
      return `${idx + 1}. *${it.bill_name}*: ${formatRupiah(it.amount)} (${it.status === 'LUNAS' ? 'Lunas' : `Sisa ${formatRupiah(it.remaining_amount)}`})`;
    }).join('\n');

    const dueStr = group.earliest_due_date === group.latest_due_date
      ? formatDateIndo(group.latest_due_date)
      : `${formatDateIndo(group.earliest_due_date)} s.d. ${formatDateIndo(group.latest_due_date)}`;

    const msg = `Assalamu'alaikum Yth. Orang Tua / Wali dari ${group.student_name} (Kelas ${group.class_name}).\nKami menginformasikan rincian tagihan kebutuhan santri:\n\n${itemLines}\n\n*Total Tagihan:* ${formatRupiah(group.total_amount)}\n*Telah Dibayar:* ${formatRupiah(group.total_paid)}\n*Sisa Pembayaran:* ${formatRupiah(group.total_remaining)}\n*Jatuh Tempo:* ${dueStr}\n\nPembayaran dapat dilakukan melalui kasir sekolah atau transfer bank resmi IMBS.\nJazakumullahu khairan.`;

    setWaModalProps({
      isOpen: true,
      studentId: group.student_id,
      studentName: group.student_name,
      recipientPhone: group.parent_phone || '081298765432',
      recipientName: group.father_name || 'Orang Tua / Wali',
      initialMessage: msg
    });
  };

  // Summary Metrics
  const totalBeban = bills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = bills.reduce((sum, b) => sum + b.paid_amount, 0);
  const totalRemaining = bills.reduce((sum, b) => sum + b.remaining_amount, 0);
  const lunasCount = bills.filter(b => b.status === 'LUNAS').length;
  const unpaidCount = bills.filter(b => b.status !== 'LUNAS').length;

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Tagihan Khusus Santri
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
              Kebutuhan Personal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola tagihan insidental santri: seragam baru, selimut asrama, peci, kitab/modul, perlengkapan kamar, dll.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-900/30 transition-all transform active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Buat Tagihan Khusus</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <GlassCard className="p-4 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Total Tagihan Khusus</span>
            <Tag className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {formatRupiah(totalBeban)}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{bills.length} tagihan diterbitkan</span>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-600">Telah Dilunasi</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black text-emerald-600 mt-1">
            {formatRupiah(totalPaid)}
          </p>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">{lunasCount} tagihan lunas</span>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-rose-600">Sisa Belum Lunas</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-lg font-black text-rose-600 mt-1">
            {formatRupiah(totalRemaining)}
          </p>
          <span className="text-[11px] text-rose-600/80 mt-0.5 block">{unpaidCount} tagihan belum lunas</span>
        </GlassCard>

        <GlassCard className="p-4 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-blue-600">Santri Terkait</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
            {new Set(bills.map(b => b.student_id)).size} Santri
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Menerima tagihan personal</span>
        </GlassCard>
      </div>

      {/* Filter Bar */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari santri, NIS, atau nama tagihan..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Filter Kelas */}
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Semua Kelas</option>
            <option value="7A">Kelas 7A</option>
            <option value="7B">Kelas 7B</option>
            <option value="8A">Kelas 8A</option>
            <option value="8B">Kelas 8B</option>
            <option value="9A">Kelas 9A</option>
            <option value="10 IPA">Kelas 10 IPA</option>
          </select>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-900 dark:focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="BELUM_BAYAR">Belum Bayar</option>
            <option value="SEBAGIAN">Sebagian</option>
            <option value="TUNGGAKAN">Tunggakan</option>
            <option value="LUNAS">Lunas</option>
          </select>
        </div>
      </GlassCard>

      {/* Table List of Special Bills */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-3 px-3.5 text-center w-12 whitespace-nowrap">No</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Santri / Siswa</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Nama Tagihan & Kebutuhan</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Nominal Tagihan</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Dibayar</th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Sisa Tagihan</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Jatuh Tempo</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Memuat daftar tagihan khusus santri...
                  </td>
                </tr>
              ) : groupedStudentBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Belum ada tagihan khusus yang terdaftar. Klik "+ Buat Tagihan Khusus" untuk menambahkan kebutuhan santri.
                  </td>
                </tr>
              ) : (
                groupedStudentBills.map((group, idx) => (
                  <tr key={group.student_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3.5 text-center font-medium text-slate-400 text-xs whitespace-nowrap">{idx + 1}</td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">{group.student_name}</div>
                      <div className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                        NIS: {group.student_nis} • Kelas {group.class_name}
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailGroup(group)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200/70 dark:border-indigo-800/70 transition-colors cursor-pointer group/btn whitespace-nowrap"
                          title="Klik untuk melihat rincian detail seluruh tagihan"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 group-hover/btn:scale-110 transition-transform shrink-0" />
                          <span>{group.items.length} Pos Kebutuhan</span>
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px] whitespace-nowrap" title={group.items.map((it: any) => it.bill_name).join(', ')}>
                          {group.items[0]?.bill_name.split(' [')[0]}
                          {group.items.length > 1 && ` (+${group.items.length - 1} lainnya)`}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                      {formatRupiah(group.total_amount)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap">
                      {formatRupiah(group.total_paid)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-rose-600 dark:text-rose-400 text-xs whitespace-nowrap">
                      {formatRupiah(group.total_remaining)}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500 font-medium text-xs whitespace-nowrap">
                      {group.earliest_due_date === group.latest_due_date
                        ? formatDateIndo(group.latest_due_date)
                        : `${formatDateIndo(group.earliest_due_date)} - ${formatDateIndo(group.latest_due_date)}`}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <Badge status={group.overall_status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        {/* Detail / View */}
                        <button
                          type="button"
                          onClick={() => setSelectedDetailGroup(group)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-bold transition-all border border-blue-200 dark:border-blue-800 cursor-pointer shadow-sm"
                          title="Lihat Detail & Kelola"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>

                        {/* Bayar Kasir */}
                        {group.overall_status !== 'LUNAS' && (
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem('selected_payment_student_id', group.student_id);
                              onNavigate('transaksi_input');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-bold transition-all border border-emerald-300/40 cursor-pointer"
                            title="Buka Kasir Input Pembayaran untuk santri ini"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Bayar</span>
                          </button>
                        )}

                        {/* WhatsApp */}
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppGroup(group)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Kirim Notifikasi WA Rincian Seluruh Tagihan ke Orang Tua"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        {/* Hapus if any unpaid item */}
                        {group.items.some((it: any) => it.paid_amount === 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setBillToDelete({
                                isGroup: true,
                                student_name: group.student_name,
                                items: group.items.filter((it: any) => it.paid_amount === 0)
                              });
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Semua Tagihan Khusus Belum Terbayar Santri Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* MODAL BUAT TAGIHAN KHUSUS SANTRI */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Buat Tagihan Khusus Kebutuhan Santri"
        subtitle="Terbitkan satu atau beberapa tagihan kebutuhan khusus untuk santri sekaligus"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {/* Target Santri */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
              Pilih Santri Penerima Tagihan Khusus:
            </label>
            <select
              value={formStudentId}
              onChange={e => setFormStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-900 focus:outline-none cursor-pointer"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.nis}) — Kelas {s.class_name} ({s.level})
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Multi-Item List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Rincian Item Kebutuhan Santri ({formItems.length} Item):
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Tagihan Lainnya</span>
              </button>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {formItems.map((item, idx) => {
                const subtotal = item.quantity * item.unit_price;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/70 shadow-sm space-y-3 relative group"
                  >
                    {/* Item Card Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-900 text-white font-black text-[10px]">
                          Item #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                          {item.item_name || 'Tagihan Baru'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-medium">Subtotal:</span>
                        <span className="font-mono font-black text-blue-900 dark:text-blue-300 text-xs">
                          {formatRupiah(subtotal)}
                        </span>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors ml-1 cursor-pointer"
                            title="Hapus item ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Item Form Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Nama Tagihan / Kebutuhan *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.item_name}
                          onChange={e => handleUpdateItem(item.id, 'item_name', e.target.value)}
                          placeholder="Contoh: Seragam Putih Biru, Kitab Bulughul Maram, Kasur..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Kategori Pos
                        </label>
                        <select
                          value={item.category}
                          onChange={e => handleUpdateItem(item.id, 'category', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-900 focus:outline-none cursor-pointer"
                        >
                          <option value="Kebutuhan Asrama">Kebutuhan Asrama</option>
                          <option value="Seragam & Busana">Seragam & Busana</option>
                          <option value="Kitab & Buku">Kitab & Buku</option>
                          <option value="Perlengkapan Kamar">Perlengkapan Kamar</option>
                          <option value="Laundry & Sanitasi">Laundry & Sanitasi</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Jumlah (Qty) *
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={item.quantity}
                          onChange={e => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center font-bold focus:ring-2 focus:ring-blue-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Harga Satuan (Rp) *
                        </label>
                        <input
                          type="number"
                          min={1000}
                          step={1000}
                          required
                          value={item.unit_price}
                          onChange={e => handleUpdateItem(item.id, 'unit_price', Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold focus:ring-2 focus:ring-blue-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Jatuh Tempo Pembayaran
                        </label>
                        <input
                          type="date"
                          required
                          value={item.due_date}
                          onChange={e => handleUpdateItem(item.id, 'due_date', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Catatan / Alasan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={e => handleUpdateItem(item.id, 'notes', e.target.value)}
                        placeholder="Misal: Ukuran XL, perlengkapan awal masuk asrama, pengganti rusak..."
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-900 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Add Item Button */}
            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-800/80 hover:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300 hover:bg-blue-100/50 font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Tagihan / Kebutuhan Lainnya</span>
            </button>
          </div>

          {/* Summary Accumulation Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border border-blue-900/50 shadow-md">
            <div>
              <span className="text-[11px] text-blue-300 block">Total Akumulasi Tagihan Khusus:</span>
              <span className="text-xs text-slate-300 font-semibold">{formItems.length} item kebutuhan santri</span>
            </div>
            <div className="text-right">
              <span className="text-base sm:text-lg font-black text-amber-300 block">
                {formatRupiah(formItems.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0))}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md shadow-blue-900/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : `Terbitkan ${formItems.length} Tagihan Khusus`}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={billToDelete?.isGroup ? 'Hapus Semua Tagihan Khusus Santri?' : 'Hapus Tagihan Khusus?'}
        message={billToDelete?.isGroup
          ? `Apakah Anda yakin ingin membatalkan dan menghapus ${billToDelete.items?.length} tagihan khusus belum bayar untuk santri ${billToDelete.student_name}? Tindakan ini tidak dapat dibatalkan.`
          : `Apakah Anda yakin ingin membatalkan dan menghapus tagihan "${billToDelete?.bill_name}" sebesar ${formatRupiah(billToDelete?.amount || 0)} untuk santri ${billToDelete?.student_name}?`}
        confirmText={billToDelete?.isGroup ? 'Hapus Semua Tagihan' : 'Hapus Tagihan'}
        danger
      />

      {/* DETAIL MODAL UNTUK MELIHAT & MENGELOLA TAGIHAN KHUSUS SANTRI */}
      {selectedDetailGroup && (
        <Modal
          isOpen={!!selectedDetailGroup}
          onClose={() => setSelectedDetailGroup(null)}
          title="Rincian & Kelola Tagihan Khusus Santri"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Santri Profile Header */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedDetailGroup.student_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  NIS: {selectedDetailGroup.student_nis} • Kelas: {selectedDetailGroup.class_name} • Wali: {selectedDetailGroup.father_name || 'Orang Tua / Wali'} ({selectedDetailGroup.parent_phone || '-'})
                </p>
              </div>
              <Badge status={selectedDetailGroup.overall_status} size="md" />
            </div>

            {/* Financial Stats */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 font-medium">Total Tagihan</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatRupiah(selectedDetailGroup.total_amount)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">Telah Terbayar</span>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {formatRupiah(selectedDetailGroup.total_paid)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-rose-700 dark:text-rose-300 font-medium">Sisa Belum Lunas</span>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                  {formatRupiah(selectedDetailGroup.total_remaining)}
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">No</th>
                    <th className="py-2.5 px-3">Nama Tagihan / Kebutuhan</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3 text-right">Dibayar</th>
                    <th className="py-2.5 px-3 text-right">Sisa</th>
                    <th className="py-2.5 px-3 text-center">Jatuh Tempo</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center w-12">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedDetailGroup.items.map((it: any, idx: number) => (
                    <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        <div>{it.bill_name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatRupiah(it.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatRupiah(it.paid_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatRupiah(it.remaining_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                        {it.due_date ? formatDateIndo(it.due_date) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge status={it.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {it.paid_amount === 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setBillToDelete(it);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title={`Hapus tagihan "${it.bill_name}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedDetailGroup(null);
                  setFormStudentId(selectedDetailGroup.student_id);
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <span>+ Tambah Tagihan untuk Santri Ini</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenWhatsAppGroup(selectedDetailGroup);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </button>

                {selectedDetailGroup.overall_status !== 'LUNAS' && (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('selected_payment_student_id', selectedDetailGroup.student_id);
                      setSelectedDetailGroup(null);
                      onNavigate('transaksi_input');
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-blue-900/20"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Bayar di Kasir</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDetailGroup(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* WHATSAPP MODAL */}
      <WhatsAppModal
        {...waModalProps}
        onClose={() => setWaModalProps({ isOpen: false })}
      />
    </div>
  );
};
