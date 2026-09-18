import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  PlusCircle,
  Download,
  Upload,
  Eye,
  Edit2,
  Trash2,
  Phone,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  CreditCard,
  Send,
  Printer,
  ChevronRight,
  ShieldCheck,
  Receipt,
  RefreshCw,
  Plus
} from 'lucide-react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { Student, SPPType, EskulType } from '../../types';
import { formatRupiah, formatDateIndo } from '../../services/terbilang';
import { exportTableToExcel } from '../../services/pdfGenerator';
import { useNotification } from '../../context/NotificationContext';
import { KwitansiModal } from '../../components/kwitansi/KwitansiModal';
import { WhatsAppModal } from '../../components/whatsapp/WhatsAppModal';
import { useAvailableClasses } from '../../context/SchoolContext';
import * as XLSX from 'xlsx';

export const DataSantri: React.FC = () => {
  const availableClasses = useAvailableClasses();
  const [students, setStudents] = useState<any[]>([]);
  const [sppTypes, setSppTypes] = useState<SPPType[]>([]);
  const [eskulTypes, setEskulTypes] = useState<EskulType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSpp, setSelectedSpp] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Aktif');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Import Excel States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Manual & Bulk Selection States
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Detail & Form States
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'profil' | 'tagihan' | 'riwayat' | 'spp_matrix' | 'eskul' | 'daftar_ulang' | 'wa_logs'>('profil');
  const [formData, setFormData] = useState<Partial<Student>>({
    gender: 'L',
    level: 'SMP',
    class_name: availableClasses[0] || 'VII',
    status: 'Aktif',
    access_pin: '1234',
    previous_arrears: 0,
    previous_arrears_note: '',
    eskul_ids: []
  });
  const [arrearsList, setArrearsList] = useState<Array<{ id: string; amount: number; note: string }>>([
    { id: 'arr_1', amount: 0, note: '' }
  ]);
  const [studentToDelete, setStudentToDelete] = useState<any>(null);

  // Receipt & WhatsApp Modals
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [waModalProps, setWaModalProps] = useState<any>({ isOpen: false });

  const { success, error } = useNotification();

  // Memoized filter options combining availableClasses and any class on student records
  const filterClassOptions = React.useMemo(() => {
    const list = [...availableClasses];
    students.forEach(s => {
      if (s.class_name && !list.includes(s.class_name)) {
        list.push(s.class_name);
      }
    });
    return list;
  }, [availableClasses, students]);

  // Form class options ensuring current student's class is always selectable
  const formClassOptions = React.useMemo(() => {
    const list = [...availableClasses];
    if (formData.class_name && !list.includes(formData.class_name)) {
      list.push(formData.class_name);
    }
    return list;
  }, [availableClasses, formData.class_name]);

  // Detect students with classes not in availableClasses
  const unsyncedStudents = React.useMemo(() => {
    return students.filter(s => s.class_name && !availableClasses.includes(s.class_name));
  }, [students, availableClasses]);

  const handleSyncClasses = async () => {
    try {
      await api.school.syncStudentClasses();
      success('Data kelas seluruh santri berhasil disinkronkan ke daftar kelas aktif sekolah.');
      await loadData();
    } catch (err: any) {
      error('Gagal menyinkronkan data santri: ' + (err.message || ''));
    }
  };

  const handleToggleSelectAll = () => {
    if (students.length === 0) return;
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.students.bulkDelete(selectedStudentIds);
      success(`${selectedStudentIds.length} data santri berhasil dihapus secara massal.`);
      setSelectedStudentIds([]);
      setIsBulkDeleteModalOpen(false);
      await loadData();
    } catch (err: any) {
      error('Gagal menghapus data massal: ' + (err.message || ''));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [stdData, sppData, eskulData] = await Promise.all([
        api.students.getAll({
          search,
          class_name: selectedClass,
          spp_type_id: selectedSpp,
          status: selectedStatus
        }),
        api.sppTypes.getAll(),
        api.eskul.getAll()
      ]);
      setStudents(stdData);
      setSppTypes(sppData);
      setEskulTypes(eskulData);
    } catch (err: any) {
      error(err.message || 'Gagal memuat data santri');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClass, selectedSpp, selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Open Add Modal
  const handleOpenAdd = () => {
    const defaultCls = availableClasses[0] || 'VII';
    const isSma = ['10', '11', '12', 'X', 'XI', 'XII'].some(p => defaultCls.toUpperCase().startsWith(p));
    setFormData({
      nis: '',
      nisn: '',
      name: '',
      gender: 'L',
      birth_place: 'Bogor',
      birth_date: '2012-05-10',
      level: isSma ? 'SMA' : 'SMP',
      class_name: defaultCls,
      status: 'Aktif',
      spp_type_id: sppTypes[0]?.id || 'spp_boarding',
      parent_phone: '0812',
      father_name: '',
      father_phone: '',
      mother_name: '',
      mother_phone: '',
      address: 'Bogor',
      access_pin: '1234',
      previous_arrears: 0,
      previous_arrears_note: '',
      eskul_ids: []
    });
    setArrearsList([{ id: `arr_${Date.now()}`, amount: 0, note: '' }]);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (s: any) => {
    let list: Array<{ id: string; amount: number; note: string }> = [];
    try {
      if (Array.isArray(s.additional_arrears) && s.additional_arrears.length > 0) {
        list = s.additional_arrears.map((item: any, idx: number) => ({
          id: item.id || `arr_${idx}_${Date.now()}`,
          amount: Number(item.amount || 0),
          note: item.note || ''
        }));
      } else if (typeof s.additional_arrears === 'string' && s.additional_arrears.trim() !== '') {
        const parsed = JSON.parse(s.additional_arrears);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.map((item: any, idx: number) => ({
            id: item.id || `arr_${idx}_${Date.now()}`,
            amount: Number(item.amount || 0),
            note: item.note || ''
          }));
        }
      }
    } catch (e) {
      console.error('Error parsing student arrears:', e);
    }

    if (list.length === 0) {
      if (s.previous_arrears && s.previous_arrears > 0) {
        list = [{
          id: `arr_${Date.now()}`,
          amount: Number(s.previous_arrears),
          note: s.previous_arrears_note || ''
        }];
      } else {
        list = [{ id: `arr_${Date.now()}`, amount: 0, note: '' }];
      }
    }

    setArrearsList(list);
    setFormData({
      ...s,
      previous_arrears: s.previous_arrears || 0,
      previous_arrears_note: s.previous_arrears_note || '',
      eskul_ids: s.eskul_ids || []
    });
    setIsFormModalOpen(true);
  };

  // Arrears Row Handlers
  const handleAddArrearRow = () => {
    setArrearsList(prev => [
      ...prev,
      { id: `arr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, amount: 0, note: '' }
    ]);
  };

  const handleRemoveArrearRow = (index: number) => {
    setArrearsList(prev => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ id: `arr_${Date.now()}`, amount: 0, note: '' }];
    });
  };

  const handleUpdateArrearRow = (index: number, field: 'amount' | 'note', value: any) => {
    setArrearsList(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Open Detail Modal
  const handleOpenDetail = async (id: string) => {
    try {
      const detail = await api.students.getDetail(id);
      setSelectedStudentDetail(detail);
      setDetailTab('profil');
      setIsDetailModalOpen(true);
    } catch (err: any) {
      error(err.message || 'Gagal memuat rincian santri');
    }
  };

  // Save Add/Edit
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nis || !formData.spp_type_id) {
      error('Nama, NIS, dan Jenis SPP wajib diisi');
      return;
    }

    const activeArrears = arrearsList.filter(
      item => (Number(item.amount) > 0) || (item.note && item.note.trim() !== '')
    );
    const totalArrears = activeArrears.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const combinedNotes = activeArrears.length === 1
      ? (activeArrears[0].note || '').trim()
      : activeArrears
          .map(item => item.note ? `${item.note.trim()}${item.amount > 0 ? ` (Rp ${Number(item.amount).toLocaleString('id-ID')})` : ''}` : `Rp ${Number(item.amount).toLocaleString('id-ID')}`)
          .join('; ');

    const payload = {
      ...formData,
      previous_arrears: totalArrears,
      previous_arrears_note: combinedNotes || '',
      additional_arrears: activeArrears
    };

    try {
      if (formData.id) {
        await api.students.update(formData.id, payload);
        success(`Data santri ${formData.name} berhasil diperbarui`);
      } else {
        await api.students.create(payload);
        success(`Santri baru ${formData.name} (${formData.nis}) berhasil ditambahkan`);
      }
      setIsFormModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal menyimpan data santri');
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!studentToDelete) return;
    try {
      await api.students.delete(studentToDelete.id);
      success(`Santri ${studentToDelete.name} berhasil dihapus`);
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
      loadData();
    } catch (err: any) {
      error(err.message || 'Gagal menghapus santri');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const headers = ['No', 'NIS', 'NISN', 'Nama Lengkap', 'Gender', 'Kelas', 'Jenjang', 'Jenis SPP', 'Tarif SPP', 'Tunggakan T.A. Lalu', 'Catatan Tunggakan', 'No WA Orang Tua', 'Nama Ayah', 'Nama Ibu', 'Status'];
    const rows = students.map((s, idx) => [
      idx + 1,
      s.nis,
      s.nisn || '-',
      s.name,
      s.gender,
      s.class_name,
      s.level,
      s.spp_type_name || '-',
      s.spp_amount || 0,
      s.previous_arrears || 0,
      s.previous_arrears_note || '-',
      s.parent_phone,
      s.father_name || '-',
      s.mother_name || '-',
      s.status
    ]);
    exportTableToExcel('DATA_SANTRI_IMBS_2026', 'Data Santri', headers, rows);
    success('Data santri berhasil diekspor ke Excel');
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'NIS': '202607021',
        'NISN': '0081234531',
        'Nama Santri': 'Muhammad Faris Al-Ghifari',
        'Jenis Kelamin (L/P)': 'L',
        'Tingkat (SMP/SMA)': 'SMP',
        'Kelas': '7A',
        'Jenis SPP': sppTypes[0]?.name || 'SPP Boarding / Asrama',
        'Ekstrakurikuler': eskulTypes.slice(0, 2).map(e => e.name).join(', ') || 'Futsal',
        'Tunggakan TA Lalu': 0,
        'Catatan Tunggakan': '',
        'No WhatsApp Wali': '081298765432',
        'Nama Ayah': 'Ahmad Fauzi',
        'Nama Ibu': 'Siti Maryam',
        'Alamat': 'Jl. Pajajaran No. 10, Bogor',
        'PIN Akses': '1234'
      },
      {
        'NIS': '202607022',
        'NISN': '0081234532',
        'Nama Santri': 'Fatimah Az-Zahra',
        'Jenis Kelamin (L/P)': 'P',
        'Tingkat (SMP/SMA)': 'SMA',
        'Kelas': '10 IPA',
        'Jenis SPP': sppTypes[1]?.name || sppTypes[0]?.name || 'SPP Tahfidz Intensif',
        'Ekstrakurikuler': eskulTypes[0]?.name || 'Panahan Sunnah',
        'Tunggakan TA Lalu': 250000,
        'Catatan Tunggakan': 'Sisa SPP Juni 2026',
        'No WhatsApp Wali': '081287654321',
        'Nama Ayah': 'Bambang Supriyanto',
        'Nama Ibu': 'Nurul Hidayah',
        'Alamat': 'Kompleks IPB Baranangsiang, Bogor',
        'PIN Akses': '1234'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Santri');
    XLSX.writeFile(wb, 'Template_Impor_Santri_IMBS.xlsx');
    success('Template Excel berhasil diunduh. Silakan isi data dan unggah kembali.');
  };

  // Handle Excel File Upload & Parse
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        setImportError('File Excel tidak berisi baris data santri.');
        setImportPreview([]);
        return;
      }

      const existingNisSet = new Set(students.map(s => String(s.nis).trim()));

      const parsed = rawRows.map((row, idx) => {
        const getVal = (possibleKeys: string[]) => {
          for (const key of Object.keys(row)) {
            const cleanKey = key.trim().toLowerCase();
            for (const pk of possibleKeys) {
              if (cleanKey.includes(pk.toLowerCase())) {
                return row[key];
              }
            }
          }
          return '';
        };

        const nis = String(getVal(['nis', 'nomor induk'])).trim();
        const name = String(getVal(['nama', 'name'])).trim();
        const nisn = String(getVal(['nisn'])).trim();
        const gender = String(getVal(['kelamin', 'gender'])).toUpperCase().startsWith('P') ? 'P' : 'L';
        const defaultImportCls = availableClasses[0] || 'VII';
        const rawClass = String(getVal(['kelas', 'class'])).trim() || defaultImportCls;
        const level = String(getVal(['tingkat', 'jenjang', 'level'])).trim().toUpperCase() ||
          (['10', '11', '12', 'X', 'XI', 'XII'].some(p => rawClass.toUpperCase().startsWith(p)) ? 'SMA' : 'SMP');
        const sppTypeName = String(getVal(['spp', 'tarif'])).trim();
        const eskul = String(getVal(['eskul', 'ekstra'])).trim();
        const tunggakan = Number(getVal(['tunggakan', 'arrears']) || 0);
        const catatanTunggakan = String(getVal(['catatan', 'keterangan'])).trim();
        const wa = String(getVal(['wa', 'whatsapp', 'telepon', 'hp', 'phone'])).trim();
        const ayah = String(getVal(['ayah', 'father'])).trim();
        const ibu = String(getVal(['ibu', 'mother'])).trim();
        const alamat = String(getVal(['alamat', 'address'])).trim();
        const pin = String(getVal(['pin', 'akses'])).trim() || '1234';

        const isDuplicate = existingNisSet.has(nis);
        const isValid = Boolean(nis && name);

        return {
          rowNum: idx + 1,
          nis,
          nisn,
          name,
          gender,
          level,
          class_name: rawClass,
          spp_type_name: sppTypeName,
          eskul_names: eskul,
          previous_arrears: tunggakan,
          previous_arrears_note: catatanTunggakan,
          parent_phone: wa,
          father_name: ayah,
          mother_name: ibu,
          address: alamat,
          access_pin: pin,
          isValid,
          isDuplicate
        };
      });

      setImportPreview(parsed);
    } catch (err: any) {
      setImportError('Gagal membaca file Excel: ' + (err.message || 'Format file tidak didukung'));
      setImportPreview([]);
    }
  };

  // Submit Bulk Import
  const handleExecuteImport = async () => {
    const validRows = importPreview.filter(r => r.isValid && !r.isDuplicate);
    if (validRows.length === 0) {
      error('Tidak ada data santri baru yang valid untuk diimpor');
      return;
    }

    setIsImporting(true);
    try {
      const res = await api.students.importStudents(validRows);
      success(res.message || `Berhasil mengimpor ${validRows.length} santri`);
      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Gagal mengimpor data santri');
    } finally {
      setIsImporting(false);
    }
  };

  // Open Receipt Modal
  const handleViewReceipt = async (receiptNo: string) => {
    try {
      const data = await api.payments.getReceiptData(receiptNo);
      setReceiptData(data);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      error(err.message || 'Gagal memuat kwitansi');
    }
  };

  // Open WhatsApp Modal
  const handleOpenWhatsApp = (st: any, totalArrears?: number) => {
    const msg = `Assalamu'alaikum Yth. Orang Tua dari ${st.name} (Kelas ${st.class_name}).\nKami menginformasikan mengenai kewajiban pembayaran sekolah.\nMohon dapat melakukan pengecekan tagihan melalui portal resmi: https://imbs.sch.id/portal?nis=${st.nis}\nJazakumullahu khairan.`;
    setWaModalProps({
      isOpen: true,
      studentId: st.id,
      studentName: st.name,
      recipientPhone: st.parent_phone,
      recipientName: st.father_name || st.mother_name || 'Orang Tua / Wali',
      initialMessage: msg
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Data Santri / Siswa
          </h2>
          <p className="text-xs text-slate-500">
            Total {students.length} santri terdaftar di sistem Imam Muzani Boarding School
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportFile(null);
              setImportPreview([]);
              setImportError(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor Excel</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-600/30 transition-all transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Tambah Santri</span>
          </button>
        </div>
      </div>

      {/* Unsynced Classes Alert Banner */}
      {unsyncedStudents.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-bold">
                Terdapat {unsyncedStudents.length} data santri dengan format kelas yang belum sinkron dengan Data Sekolah!
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5">
                Daftar kelas aktif sekolah: {availableClasses.map(c => `Kelas ${c}`).join(', ')}. Klik tombol untuk menyinkronkan seluruh santri secara otomatis.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSyncClasses}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all transform active:scale-95 whitespace-nowrap self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sinkronkan Sekarang</span>
          </button>
        </div>
      )}

      {/* Floating / Sticky Bulk Action Bar when items selected */}
      {selectedStudentIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 px-5 rounded-2xl bg-blue-900 text-white shadow-xl shadow-blue-950/25 animate-in fade-in slide-in-from-top-2 duration-200 border border-blue-800">
          <div className="flex items-center gap-3 text-xs">
            <span className="w-6 h-6 rounded-full bg-blue-700/80 flex items-center justify-center font-bold text-xs text-white">
              ✓
            </span>
            <span>
              <strong className="font-extrabold text-sm">{selectedStudentIds.length}</strong> dari {students.length} santri dipilih
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Batal Pilihan
            </button>

            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-950/30 transition-all transform active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Massal ({selectedStudentIds.length} Santri)</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, NIS, atau NISN..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Filter Kelas */}
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none font-semibold"
          >
            <option value="">Semua Kelas</option>
            {filterClassOptions.map(cls => (
              <option key={cls} value={cls}>Kelas {cls}</option>
            ))}
          </select>

          {/* Filter Jenis SPP */}
          <select
            value={selectedSpp}
            onChange={e => setSelectedSpp(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="">Semua Jenis SPP</option>
            {sppTypes.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({formatRupiah(s.monthly_amount)})</option>
            ))}
          </select>

          {/* Filter Status */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
            <option value="Mutasi">Mutasi</option>
            <option value="Lulus">Lulus</option>
          </select>
        </div>
      </GlassCard>

      {/* Table Data Santri */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-2 w-8 text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selectedStudentIds.length === students.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer align-middle"
                    title={selectedStudentIds.length === students.length ? "Batalkan Pilih Semua" : "Pilih Semua Santri"}
                  />
                </th>
                <th className="py-2.5 px-1.5 w-8 text-center whitespace-nowrap">No</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap">Santri</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Kelas / Jenjang</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Jenis SPP</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Eskul Diikuti</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Tunggakan Lalu</th>
                <th className="py-2.5 px-2 whitespace-nowrap">WhatsApp Wali</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-1.5 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 whitespace-nowrap">
                    Memuat data santri...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 whitespace-nowrap">
                    Tidak ditemukan data santri sesuai filter pencarian
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => {
                  const isSelected = selectedStudentIds.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(s.id)}
                          className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer align-middle"
                        />
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-medium text-slate-400 whitespace-nowrap">{idx + 1}</td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white whitespace-nowrap leading-snug">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-400 whitespace-nowrap">
                          NIS: {s.nis} {s.nisn ? `| NISN: ${s.nisn}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          Kelas {s.class_name}
                        </span>
                        <span className="text-[10px] text-slate-400 block whitespace-nowrap">{s.level}</span>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <div className="font-medium text-brand-600 dark:text-brand-400 whitespace-nowrap">
                          {s.spp_type_name || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatRupiah(s.spp_amount)}/bln
                        </div>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {s.eskul_names && s.eskul_names.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1 whitespace-nowrap">
                            {s.eskul_names.map((eName: string, eIdx: number) => (
                              <span key={eIdx} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-medium border border-blue-500/20 whitespace-nowrap">
                                {eName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[10px] whitespace-nowrap">Tidak ada eskul</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        {s.previous_arrears && s.previous_arrears > 0 ? (
                          <div className="whitespace-nowrap">
                            <span className="font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                              {formatRupiah(s.previous_arrears)}
                            </span>
                            {s.previous_arrears_note && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-[130px] ml-auto whitespace-nowrap" title={s.previous_arrears_note}>
                                {s.previous_arrears_note}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono whitespace-nowrap">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs">
                          <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{s.parent_phone}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 whitespace-nowrap">
                          {s.father_name || s.mother_name || 'Orang Tua'}
                        </div>
                      </td>
                      <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                        <Badge status={s.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(s.id)}
                            className="p-1 text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Rincian Santri & Tagihan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(s)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Kirim WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Santri"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStudentToDelete(s);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Santri"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* DETAIL MODAL (Tabbed: Profil, Tagihan, Riwayat Bayar, SPP Matrix, Eskul, Daftar Ulang, WA) */}
      {selectedStudentDetail && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Detail Santri: ${selectedStudentDetail.student.name}`}
          subtitle={`NIS: ${selectedStudentDetail.student.nis} | Kelas ${selectedStudentDetail.student.class_name}`}
          maxWidth="5xl"
        >
          {/* Header Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500">Total Tagihan:</span>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {formatRupiah(selectedStudentDetail.summary.totalBills)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Telah Dibayar:</span>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatRupiah(selectedStudentDetail.summary.totalPaid)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40">
              <span className="text-[11px] text-rose-600 dark:text-rose-400">Sisa Tagihan / Tunggakan:</span>
              <p className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {formatRupiah(selectedStudentDetail.summary.totalRemaining)}
              </p>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto text-xs font-semibold">
            {[
              { id: 'profil', label: 'Profil Santri' },
              { id: 'tagihan', label: `Daftar Tagihan (${selectedStudentDetail.bills.length})` },
              { id: 'riwayat', label: `Riwayat Transaksi (${selectedStudentDetail.transactions.length})` },
              { id: 'wa_logs', label: `Riwayat WA (${selectedStudentDetail.waLogs.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id as any)}
                className={`py-2.5 px-4 whitespace-nowrap border-b-2 transition-all ${
                  detailTab === tab.id
                    ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Profil */}
          {detailTab === 'profil' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1">
                  Data Pribadi Santri
                </h4>
                <div className="flex justify-between"><span className="text-slate-500">Nama Lengkap:</span><span className="font-bold">{selectedStudentDetail.student.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">NIS / NISN:</span><span>{selectedStudentDetail.student.nis} / {selectedStudentDetail.student.nisn || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Jenis Kelamin:</span><span>{selectedStudentDetail.student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tempat, Tgl Lahir:</span><span>{selectedStudentDetail.student.birth_place || '-'}, {formatDateIndo(selectedStudentDetail.student.birth_date)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Kelas / Jenjang:</span><span>Kelas {selectedStudentDetail.student.class_name} ({selectedStudentDetail.student.level})</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Jenis SPP Ditetapkan:</span><span className="font-bold text-brand-600">{selectedStudentDetail.student.spp_type_name} ({formatRupiah(selectedStudentDetail.student.spp_amount)}/bln)</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tunggakan T.A. Lalu:</span>
                  <span className="font-bold text-rose-600">
                    {selectedStudentDetail.student.previous_arrears ? formatRupiah(selectedStudentDetail.student.previous_arrears) : 'Rp 0'}
                    {selectedStudentDetail.student.previous_arrears_note ? ` (${selectedStudentDetail.student.previous_arrears_note})` : ''}
                  </span>
                </div>
                <div className="flex justify-between"><span className="text-slate-500">Kode Akses / PIN Portal:</span><span className="font-mono font-bold">{selectedStudentDetail.student.access_pin || '1234'}</span></div>
              </div>

              <div className="space-y-3 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1">
                  Data Orang Tua & Kontak
                </h4>
                <div className="flex justify-between"><span className="text-slate-500">No. WhatsApp Utama:</span><span className="font-bold text-emerald-600">{selectedStudentDetail.student.parent_phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Nama Ayah:</span><span>{selectedStudentDetail.student.father_name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Nama Ibu:</span><span>{selectedStudentDetail.student.mother_name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Alamat Tempat Tinggal:</span><span>{selectedStudentDetail.student.address || '-'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Eskul yang Diikuti:</span><span>{selectedStudentDetail.student.eskul_names?.join(', ') || 'Belum ada'}</span></div>
              </div>
            </div>
          )}

          {/* Tab 2: Tagihan */}
          {detailTab === 'tagihan' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Nama Tagihan</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Jatuh Tempo</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                    <th className="py-2.5 px-3 text-right">Dibayar</th>
                    <th className="py-2.5 px-3 text-right">Sisa</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedStudentDetail.bills.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3 font-semibold">{b.bill_name}</td>
                      <td className="py-2 px-3 text-slate-500">{b.category}</td>
                      <td className="py-2 px-3">{formatDateIndo(b.due_date)}</td>
                      <td className="py-2 px-3 text-right">{formatRupiah(b.amount)}</td>
                      <td className="py-2 px-3 text-right font-medium text-emerald-600">{formatRupiah(b.paid_amount)}</td>
                      <td className="py-2 px-3 text-right font-bold text-rose-600">{formatRupiah(b.remaining_amount)}</td>
                      <td className="py-2 px-3 text-center"><Badge status={b.status} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Riwayat Transaksi */}
          {detailTab === 'riwayat' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">No. Kwitansi</th>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Metode</th>
                    <th className="py-2.5 px-3 text-right">Total Bayar</th>
                    <th className="py-2.5 px-3">Petugas</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedStudentDetail.transactions.map((trx: any) => (
                    <tr key={trx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3 font-bold text-brand-600">{trx.receipt_no}</td>
                      <td className="py-2 px-3">{formatDateIndo(trx.date)}</td>
                      <td className="py-2 px-3">{trx.payment_method}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatRupiah(trx.total_amount)}</td>
                      <td className="py-2 px-3 text-slate-500">{trx.cashier_name}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(trx.receipt_no)}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white rounded text-[11px] font-semibold"
                        >
                          Cetak Kwitansi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 4: Riwayat WA */}
          {detailTab === 'wa_logs' && (
            <div className="space-y-2">
              {selectedStudentDetail.waLogs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Belum ada log pesan WhatsApp untuk santri ini.
                </div>
              ) : (
                selectedStudentDetail.waLogs.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-600">{log.recipient_phone} ({log.recipient_name})</span>
                      <span className="text-[10px] text-slate-400">{log.sent_at}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap text-[11px] font-mono bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      {log.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </Modal>
      )}

      {/* FORM MODAL (Add / Edit Student) */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={formData.id ? 'Edit Data Santri' : 'Tambah Santri Baru'}
        subtitle="Lengkapi data induk dan tentukan tarif SPP serta ekstrakurikuler"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">NIS (Nomor Induk Santri) *</label>
              <input
                type="text"
                required
                value={formData.nis || ''}
                onChange={e => setFormData({ ...formData, nis: e.target.value })}
                placeholder="Contoh: 202607026"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">NISN</label>
              <input
                type="text"
                value={formData.nisn || ''}
                onChange={e => setFormData({ ...formData, nisn: e.target.value })}
                placeholder="008123xxxx"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Nama Lengkap Santri *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Abdullah Al-Muzani"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold mb-1">Jenis Kelamin</label>
              <select
                value={formData.gender || 'L'}
                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="L">Laki-laki (Ikhwan)</option>
                <option value="P">Perempuan (Akhwat)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Kelas *</label>
              <select
                value={formData.class_name || (availableClasses[0] || 'VII')}
                onChange={e => {
                  const val = e.target.value;
                  const autoLevel = ['10', '11', '12', 'X', 'XI', 'XII'].some(p => val.toUpperCase().startsWith(p)) ? 'SMA' : 'SMP';
                  setFormData({ ...formData, class_name: val, level: autoLevel });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none font-semibold"
              >
                {formClassOptions.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Jenjang</label>
              <select
                value={formData.level || 'SMP'}
                onChange={e => setFormData({ ...formData, level: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
                <option value="SD">SD</option>
              </select>
            </div>
          </div>

          {/* SPP Type Assignment */}
          <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/30">
            <label className="block font-bold text-brand-800 dark:text-brand-300 mb-1">
              Penetapan Jenis SPP Santri *
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Sistem akan otomatis mengenakan tarif nominal bulanan sesuai jenis SPP yang Anda pilih:
            </p>
            <select
              required
              value={formData.spp_type_id || ''}
              onChange={e => setFormData({ ...formData, spp_type_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-brand-700 dark:text-brand-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {sppTypes.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatRupiah(s.monthly_amount)} / bulan
                </option>
              ))}
            </select>
          </div>

          {/* Eskul Enrollment Multi-Check */}
          <div>
            <label className="block font-semibold mb-1">
              Pilihan Ekstrakurikuler (Dapat memilih lebih dari satu)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
              {eskulTypes.map(e => {
                const checked = (formData.eskul_ids || []).includes(e.id);
                return (
                  <label
                    key={e.id}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      checked
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const cur = formData.eskul_ids || [];
                        const next = checked ? cur.filter(id => id !== e.id) : [...cur, e.id];
                        setFormData({ ...formData, eskul_ids: next });
                      }}
                      className="w-3.5 h-3.5 text-blue-600 rounded"
                    />
                    <div className="truncate">
                      <span className="block truncate leading-tight">{e.name}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">{formatRupiah(e.amount)}/bln</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Tunggakan Tahun Ajaran Sebelumnya */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-500/20">
              <div>
                <label className="font-bold text-amber-900 dark:text-amber-300 text-xs sm:text-sm block">
                  Tunggakan Tahun Ajaran Sebelumnya (Jika Ada)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Nominal ini akan otomatis dicatat sebagai tagihan resmi santri dan dapat langsung dipilih untuk pembayaran/cicilan di menu <strong>Input Pembayaran</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                  Masuk ke Tagihan
                </span>
                <button
                  type="button"
                  onClick={handleAddArrearRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                  title="Tambah rincian tunggakan lainnya"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tunggakan Lainnya</span>
                </button>
              </div>
            </div>

            {/* List of Arrear Rows */}
            <div className="space-y-2.5">
              {arrearsList.map((item, index) => (
                <div 
                  key={item.id || index} 
                  className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/80 border border-amber-500/20 shadow-xs transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">
                      {arrearsList.length > 1 ? `Tunggakan #${index + 1}` : 'Rincian Tunggakan'}
                    </span>
                    {arrearsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveArrearRow(index)}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold px-2 py-0.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-all cursor-pointer"
                        title="Hapus baris tunggakan ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Nominal Tunggakan (Rp)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.amount !== 0 && item.amount !== undefined ? item.amount : ''}
                          onChange={e => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            handleUpdateArrearRow(index, 'amount', isNaN(val) ? 0 : val);
                          }}
                          placeholder="0"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-amber-500/40 bg-white dark:bg-slate-800 font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      {Boolean(item.amount && item.amount > 0) && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-1">
                          Terbaca: {formatRupiah(item.amount || 0)}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Keterangan / Rincian Tunggakan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={item.note || ''}
                        onChange={e => handleUpdateArrearRow(index, 'note', e.target.value)}
                        placeholder={index === 0 ? "Contoh: Sisa SPP Mei-Juni 2026" : "Contoh: Uang Gedung / Seragam / Buku"}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom bar: Tambah Button and Total */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-500/20">
              <button
                type="button"
                onClick={handleAddArrearRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all cursor-pointer border border-amber-500/40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Tunggakan Lainnya</span>
              </button>

              <div className="text-right">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 mr-2 font-medium">
                  Total Tunggakan ({arrearsList.filter(a => (a.amount || 0) > 0).length} rincian):
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-amber-800 dark:text-amber-300">
                  {formatRupiah(arrearsList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Contact and Parents */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Nomor WhatsApp Orang Tua *</label>
              <input
                type="text"
                required
                value={formData.parent_phone || ''}
                onChange={e => setFormData({ ...formData, parent_phone: e.target.value })}
                placeholder="0812xxxxxxxx"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">PIN Akses Portal Wali</label>
              <input
                type="text"
                value={formData.access_pin || '1234'}
                onChange={e => setFormData({ ...formData, access_pin: e.target.value })}
                placeholder="1234"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Nama Ayah</label>
              <input
                type="text"
                value={formData.father_name || ''}
                onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Nama Ibu</label>
              <input
                type="text"
                value={formData.mother_name || ''}
                onChange={e => setFormData({ ...formData, mother_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-md shadow-brand-600/30"
            >
              Simpan Data Santri
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL IMPOR EXCEL SANTRI */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          if (!isImporting) {
            setIsImportModalOpen(false);
            setImportFile(null);
            setImportPreview([]);
            setImportError(null);
          }
        }}
        title="Impor Data Santri / Siswa Secara Massal via Excel"
      >
        <div className="space-y-5 text-xs">
          {/* STEP 1: DOWNLOAD TEMPLATE BANNER */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  1. Unduh Format Template Excel Resmi
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                  Gunakan template standar IMBS agar data NIS, kelas, jenis SPP, eskul, dan tunggakan T.A. lalu terbaca dengan sempurna.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template (.xlsx)</span>
            </button>
          </div>

          {/* STEP 2: UPLOAD FILE */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>2. Pilih atau Unggah File Excel Anda</span>
            </h4>

            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center transition-all bg-white dark:bg-slate-900/50">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {importFile ? importFile.name : 'Klik untuk memilih file Excel atau seret file ke sini'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Format yang didukung: .xlsx atau .xls (Maksimal 5 MB)
                  </p>
                </div>
              </div>
            </div>

            {importError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
                {importError}
              </div>
            )}
          </div>

          {/* STEP 3: PREVIEW DATA */}
          {importPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    3. Pratinjau Validasi Data ({importPreview.length} Baris Terdeteksi)
                  </h4>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Siap Diimpor: {importPreview.filter(r => r.isValid && !r.isDuplicate).length}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Duplikat / Dilewati: {importPreview.filter(r => r.isDuplicate).length}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    Tidak Valid: {importPreview.filter(r => !r.isValid).length}
                  </span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3 text-center">No</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">NIS</th>
                      <th className="py-2 px-3">Nama Santri</th>
                      <th className="py-2 px-3">Kelas</th>
                      <th className="py-2 px-3">Jenis SPP</th>
                      <th className="py-2 px-3">Eskul</th>
                      <th className="py-2 px-3 text-right">Tunggakan Lalu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {importPreview.map((row) => (
                      <tr
                        key={row.rowNum}
                        className={
                          row.isDuplicate
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 text-slate-500'
                            : !row.isValid
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 text-rose-500'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                        }
                      >
                        <td className="py-2 px-3 text-center font-mono">{row.rowNum}</td>
                        <td className="py-2 px-3">
                          {row.isDuplicate ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                              NIS Duplikat
                            </span>
                          ) : !row.isValid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200">
                              Data Kosong
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              Siap Impor
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold">{row.nis || '-'}</td>
                        <td className="py-2 px-3 font-bold">{row.name || '-'}</td>
                        <td className="py-2 px-3">{row.class_name} ({row.level})</td>
                        <td className="py-2 px-3">{row.spp_type_name || 'SPP Reguler'}</td>
                        <td className="py-2 px-3">{row.eskul_names || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {row.previous_arrears > 0 ? formatRupiah(row.previous_arrears) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] text-slate-400">
              *Setelah impor selesai, tagihan SPP 12 bulan dan eskul santri akan langsung dibuat otomatis.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportPreview([]);
                  setImportError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isImporting || importPreview.filter(r => r.isValid && !r.isDuplicate).length === 0}
                onClick={handleExecuteImport}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isImporting
                    ? 'Mengimpor Data...'
                    : `Impor (${importPreview.filter(r => r.isValid && !r.isDuplicate).length}) Santri`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* BULK DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Hapus Data Santri Terpilih?"
        message={`Apakah Anda yakin ingin menghapus ${selectedStudentIds.length} data santri terpilih secara permanen? Seluruh riwayat tagihan, transaksi, dan data terkait santri tersebut akan ikut dihapus secara permanen.`}
        confirmText={isBulkDeleting ? "Menghapus..." : `Ya, Hapus (${selectedStudentIds.length}) Santri`}
        danger
      />

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Data Santri?"
        message={`Apakah Anda yakin ingin menghapus santri ${studentToDelete?.name} (${studentToDelete?.nis})? Seluruh riwayat tagihan dan transaksinya juga akan dihapus secara permanen.`}
        confirmText="Hapus Permanen"
        danger
      />

      {/* KWITANSI MODAL */}
      <KwitansiModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        data={receiptData}
        onShareWhatsApp={kData => {
          setIsReceiptModalOpen(false);
          const msg = `Kwitansi Pembayaran ${kData.school.name}\nNo: ${kData.transaction.receipt_no}\nSantri: ${kData.transaction.student_name}\nTotal: ${formatRupiah(kData.transaction.total_amount)}\nStatus: LUNAS`;
          setWaModalProps({
            isOpen: true,
            studentId: selectedStudentDetail?.id || '',
            studentName: kData.transaction.student_name,
            recipientPhone: selectedStudentDetail?.parent_phone || '081298765432',
            recipientName: selectedStudentDetail?.parent_name || 'Orang Tua / Wali',
            initialMessage: msg
          });
        }}
      />

      {/* WHATSAPP MODAL */}
      <WhatsAppModal
        {...waModalProps}
        onClose={() => setWaModalProps({ isOpen: false })}
      />
    </div>
  );
};
