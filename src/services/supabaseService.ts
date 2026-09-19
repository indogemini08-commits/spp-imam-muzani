import { supabase, isSupabaseConfigured, uploadToImamMuzaniPay } from '../lib/supabase';
import {
  Student,
  SchoolSettings,
  AcademicYear,
  SPPType,
  EskulType,
  AnnualBillType,
  Bill,
  Transaction,
  PaymentConfirmation
} from '../types';

/**
 * Service Layer Terpadu untuk Supabase Database & Storage (Bucket: ImamMuzaniPay)
 * Dilengkapi dengan Loading State & Penanganan Error Lengkap
 */
export const supabaseService = {
  // ==========================================================================
  // PENGATURAN SEKOLAH (SCHOOL SETTINGS)
  // ==========================================================================
  school: {
    async getSettings(): Promise<{ data: SchoolSettings | null; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) {
          return { data: null, error: 'Supabase URL & Anon Key belum diatur' };
        }

        const { data, error } = await supabase
          .from('school_settings')
          .select('*')
          .eq('id', 'school_main')
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Parse JSON fields jika bertipe string
          if (typeof data.bank_accounts === 'string') {
            try { data.bank_accounts = JSON.parse(data.bank_accounts); } catch (_) {}
          }
          if (typeof data.available_classes === 'string') {
            try { data.available_classes = JSON.parse(data.available_classes); } catch (_) {}
          }
        }

        return { data: data as SchoolSettings, error: null };
      } catch (err: any) {
        console.error('[Supabase] Gagal mengambil pengaturan sekolah:', err);
        return { data: null, error: err?.message || 'Gagal mengambil data pengaturan sekolah' };
      }
    },

    async updateSettings(settings: Partial<SchoolSettings>): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) {
          return { success: false, error: 'Supabase belum dikonfigurasi' };
        }

        const payload: any = { ...settings };
        if (Array.isArray(payload.bank_accounts)) {
          payload.bank_accounts = JSON.stringify(payload.bank_accounts);
        }
        if (Array.isArray(payload.available_classes)) {
          payload.available_classes = JSON.stringify(payload.available_classes);
        }

        const { error } = await supabase
          .from('school_settings')
          .upsert({ id: 'school_main', ...payload });

        if (error) throw error;
        return { success: true, error: null };
      } catch (err: any) {
        console.error('[Supabase] Gagal memperbarui pengaturan sekolah:', err);
        return { success: false, error: err?.message || 'Gagal menyimpan pengaturan sekolah' };
      }
    }
  },

  // ==========================================================================
  // DATA SANTRI (STUDENTS)
  // ==========================================================================
  students: {
    async getAll(filters?: { class_name?: string; status?: string; search?: string }): Promise<{ data: Student[]; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) {
          return { data: [], error: 'Supabase belum dikonfigurasi' };
        }

        let query = supabase.from('students').select('*').order('name', { ascending: true });

        if (filters?.class_name) {
          query = query.eq('class_name', filters.class_name);
        }
        if (filters?.status) {
          query = query.eq('status', filters.status);
        }
        if (filters?.search) {
          query = query.or(`name.ilike.%${filters.search}%,nis.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Parse JSON array fields
        const formatted = (data || []).map((s: any) => ({
          ...s,
          eskul_ids: typeof s.eskul_ids === 'string' ? JSON.parse(s.eskul_ids || '[]') : s.eskul_ids || [],
          additional_arrears: typeof s.additional_arrears === 'string' ? JSON.parse(s.additional_arrears || '[]') : s.additional_arrears || []
        }));

        return { data: formatted as Student[], error: null };
      } catch (err: any) {
        console.error('[Supabase] Gagal memuat data santri:', err);
        return { data: [], error: err?.message || 'Gagal mengambil daftar santri' };
      }
    },

    async getById(id: string): Promise<{ data: Student | null; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { data: null, error: 'Supabase belum dikonfigurasi' };

        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) return { data: null, error: 'Santri tidak ditemukan' };

        data.eskul_ids = typeof data.eskul_ids === 'string' ? JSON.parse(data.eskul_ids || '[]') : data.eskul_ids || [];
        data.additional_arrears = typeof data.additional_arrears === 'string' ? JSON.parse(data.additional_arrears || '[]') : data.additional_arrears || [];

        return { data: data as Student, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Gagal memuat detail santri' };
      }
    },

    async create(student: Partial<Student>): Promise<{ success: boolean; data?: Student; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };

        const payload: any = {
          ...student,
          id: student.id || `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          eskul_ids: JSON.stringify(student.eskul_ids || []),
          additional_arrears: JSON.stringify(student.additional_arrears || [])
        };

        const { data, error } = await supabase.from('students').insert(payload).select().single();
        if (error) throw error;

        return { success: true, data: data as Student, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal menambah santri baru' };
      }
    },

    async update(id: string, student: Partial<Student>): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };

        const payload: any = { ...student };
        if (payload.eskul_ids !== undefined) {
          payload.eskul_ids = JSON.stringify(payload.eskul_ids);
        }
        if (payload.additional_arrears !== undefined) {
          payload.additional_arrears = JSON.stringify(payload.additional_arrears);
        }

        const { error } = await supabase.from('students').update(payload).eq('id', id);
        if (error) throw error;

        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal memperbarui data santri' };
      }
    },

    async delete(id: string): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };

        // Hapus data tagihan dan konfirmasi terkait terlebih dahulu
        await supabase.from('bills').delete().eq('student_id', id);
        await supabase.from('payment_confirmations').delete().eq('student_id', id);

        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;

        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal menghapus santri' };
      }
    },

    async bulkDelete(ids: string[]): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };
        if (!ids || ids.length === 0) return { success: true, error: null };

        await supabase.from('bills').delete().in('student_id', ids);
        await supabase.from('payment_confirmations').delete().in('student_id', ids);

        const { error } = await supabase.from('students').delete().in('id', ids);
        if (error) throw error;

        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal menghapus data santri terpilih' };
      }
    }
  },

  // ==========================================================================
  // TAGIHAN SPP & KEUANGAN (BILLS)
  // ==========================================================================
  bills: {
    async getAll(filters?: { student_id?: string; category?: string; status?: string }): Promise<{ data: Bill[]; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { data: [], error: 'Supabase belum dikonfigurasi' };

        let query = supabase.from('bills').select('*').order('due_date', { ascending: true });

        if (filters?.student_id) query = query.eq('student_id', filters.student_id);
        if (filters?.category) query = query.eq('category', filters.category);
        if (filters?.status) query = query.eq('status', filters.status);

        const { data, error } = await query;
        if (error) throw error;

        return { data: (data || []) as Bill[], error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Gagal memuat daftar tagihan' };
      }
    },

    async getByStudentId(studentId: string): Promise<{ data: Bill[]; error: string | null }> {
      return this.getAll({ student_id: studentId });
    }
  },

  // ==========================================================================
  // SISTEM RESERVASI & KONFIRMASI PEMBAYARAN ONLINE (PAYMENT CONFIRMATIONS)
  // Menggunakan Storage Bucket: ImamMuzaniPay untuk bukti transfer
  // ==========================================================================
  confirmations: {
    async getAll(filters?: { status?: string }): Promise<{ data: PaymentConfirmation[]; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { data: [], error: 'Supabase belum dikonfigurasi' };

        let query = supabase
          .from('payment_confirmations')
          .select('*, students(name, nis, class_name)')
          .order('created_at', { ascending: false });

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;

        const formatted = (data || []).map((c: any) => ({
          ...c,
          student_name: c.students?.name || c.sender_name,
          student_nis: c.students?.nis || '',
          student_class: c.students?.class_name || '',
          target_bill_ids: typeof c.target_bill_ids === 'string' ? JSON.parse(c.target_bill_ids || '[]') : c.target_bill_ids || []
        }));

        return { data: formatted, error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Gagal memuat riwayat konfirmasi pembayaran' };
      }
    },

    /**
     * Membuat reservasi / pengajuan konfirmasi transfer baru oleh wali santri
     * @param proofFile File bukti transfer yang akan di-upload ke bucket ImamMuzaniPay
     */
    async submitReservation(
      data: {
        student_id: string;
        sender_name: string;
        bank_name: string;
        amount: number;
        payment_method: string;
        target_bill_ids: string[];
        notes?: string;
      },
      proofFile?: File
    ): Promise<{ success: boolean; data?: any; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };

        let proofUrl = '';
        if (proofFile) {
          const uploadRes = await uploadToImamMuzaniPay(proofFile, 'proofs');
          if (!uploadRes.success) {
            return { success: false, error: `Gagal upload bukti transfer: ${uploadRes.error}` };
          }
          proofUrl = uploadRes.url;
        }

        const confirmationId = `conf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const payload = {
          id: confirmationId,
          student_id: data.student_id,
          date: new Date().toISOString().split('T')[0],
          sender_name: data.sender_name,
          bank_name: data.bank_name,
          amount: data.amount,
          payment_method: data.payment_method || 'Transfer Bank',
          proof_url: proofUrl,
          notes: data.notes || '',
          target_bill_ids: JSON.stringify(data.target_bill_ids || []),
          status: 'Menunggu',
          created_at: new Date().toISOString()
        };

        const { data: createdData, error } = await supabase
          .from('payment_confirmations')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        return { success: true, data: createdData, error: null };
      } catch (err: any) {
        console.error('[Supabase] Gagal menyimpan reservasi pembayaran:', err);
        return { success: false, error: err?.message || 'Gagal mengajukan konfirmasi pembayaran' };
      }
    },

    async review(
      id: string,
      status: 'Disetujui' | 'Ditolak',
      reviewerName: string,
      rejectionReason?: string
    ): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };

        const { error } = await supabase
          .from('payment_confirmations')
          .update({
            status,
            reviewed_by: reviewerName,
            reviewed_at: new Date().toISOString(),
            rejection_reason: rejectionReason || null
          })
          .eq('id', id);

        if (error) throw error;
        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal memproses verifikasi pembayaran' };
      }
    }
  },

  // ==========================================================================
  // MASTER TAHUN AJARAN, SPP, ESKUL, BIAYA TAHUNAN
  // ==========================================================================
  master: {
    async getAcademicYears(): Promise<{ data: AcademicYear[]; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { data: [], error: 'Supabase belum dikonfigurasi' };
        const { data, error } = await supabase.from('academic_years').select('*').order('name', { ascending: false });
        if (error) throw error;
        return { data: (data || []) as AcademicYear[], error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Gagal memuat data tahun pelajaran' };
      }
    },

    // SPP Types CRUD
    async getSppTypes(): Promise<{ data: SPPType[]; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { data: [], error: 'Supabase belum dikonfigurasi' };
        const { data, error } = await supabase.from('spp_types').select('*').order('monthly_amount', { ascending: true });
        if (error) throw error;
        const formatted = (data || []).map((t: any) => ({
          ...t,
          active_months: typeof t.active_months === 'string' ? JSON.parse(t.active_months || '[]') : t.active_months || []
        }));
        return { data: formatted as SPPType[], error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Gagal memuat jenis SPP' };
      }
    },

    async createSppType(type: Partial<SPPType>): Promise<{ success: boolean; data?: any; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };
        const id = type.id || `spp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const payload = {
          ...type,
          id,
          active_months: JSON.stringify(type.active_months || ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']),
          is_mandatory: type.is_mandatory !== false,
          is_active: type.is_active !== false
        };
        const { data, error } = await supabase.from('spp_types').insert(payload).select().single();
        if (error) throw error;
        return { success: true, data, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal menambah jenis SPP' };
      }
    },

    async updateSppType(id: string, type: Partial<SPPType>): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };
        const payload: any = { ...type };
        if (payload.active_months && Array.isArray(payload.active_months)) {
          payload.active_months = JSON.stringify(payload.active_months);
        }
        const { error } = await supabase.from('spp_types').update(payload).eq('id', id);
        if (error) throw error;
        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal memperbarui jenis SPP' };
      }
    },

    async deleteSppType(id: string): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };
        const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('spp_type_id', id);
        if (count && count > 0) {
          return { success: false, error: `Jenis SPP ini tidak dapat dihapus karena masih digunakan oleh ${count} santri.` };
        }
        const { error } = await supabase.from('spp_types').delete().eq('id', id);
        if (error) throw error;
        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal menghapus jenis SPP' };
      }
    },

    // Eskul Types CRUD
    async getEskulTypes(): Promise<{ data: EskulType[]; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { data: [], error: 'Supabase belum dikonfigurasi' };
        const { data, error } = await supabase.from('eskul_types').select('*').order('name', { ascending: true });
        if (error) throw error;
        return { data: (data || []) as EskulType[], error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Gagal memuat jenis ekstrakurikuler' };
      }
    },

    async createEskulType(type: Partial<EskulType>): Promise<{ success: boolean; data?: any; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };
        const id = type.id || `esk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const payload = { ...type, id, is_active: type.is_active !== false };
        const { data, error } = await supabase.from('eskul_types').insert(payload).select().single();
        if (error) throw error;
        return { success: true, data, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal menambah ekstrakurikuler' };
      }
    },

    async updateEskulType(id: string, type: Partial<EskulType>): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };
        const { error } = await supabase.from('eskul_types').update(type).eq('id', id);
        if (error) throw error;
        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal memperbarui ekstrakurikuler' };
      }
    },

    async deleteEskulType(id: string): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };
        await supabase.from('bills').delete().eq('category', 'ESKUL').eq('category_id', id).eq('paid_amount', 0);
        const { error } = await supabase.from('eskul_types').delete().eq('id', id);
        if (error) throw error;
        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal menghapus ekstrakurikuler' };
      }
    },

    // Annual Bill Types CRUD
    async getAnnualBillTypes(): Promise<{ data: AnnualBillType[]; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { data: [], error: 'Supabase belum dikonfigurasi' };
        const { data, error } = await supabase.from('annual_bill_types').select('*').order('created_at', { ascending: true });
        if (error) throw error;
        return { data: (data || []) as AnnualBillType[], error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Gagal memuat komponen biaya tahunan' };
      }
    },

    async createAnnualBillType(type: Partial<AnnualBillType>): Promise<{ success: boolean; data?: any; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };
        const id = type.id || `abt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const payload = {
          ...type,
          id,
          is_active: type.is_active !== false,
          allow_installment: type.allow_installment !== false,
          is_mandatory: type.is_mandatory !== false,
          target_classes: type.target_classes || 'ALL'
        };
        const { data, error } = await supabase.from('annual_bill_types').insert(payload).select().single();
        if (error) throw error;
        return { success: true, data, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal menambah pos tagihan tahunan' };
      }
    },

    async updateAnnualBillType(id: string, type: Partial<AnnualBillType>): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };
        const { error } = await supabase.from('annual_bill_types').update(type).eq('id', id);
        if (error) throw error;
        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal memperbarui pos tagihan tahunan' };
      }
    },

    async deleteAnnualBillType(id: string): Promise<{ success: boolean; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { success: false, error: 'Supabase belum dikonfigurasi' };
        await supabase.from('bills').delete().eq('category_id', id).eq('paid_amount', 0);
        const { error } = await supabase.from('annual_bill_types').delete().eq('id', id);
        if (error) throw error;
        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Gagal menghapus pos tagihan tahunan' };
      }
    }
  },

  // ==========================================================================
  // REALTIME SYNCHRONIZATION HELPER (REALTIME ACROSS ALL DEVICES)
  // ==========================================================================
  realtime: {
    subscribe(onEvent: (payload: any) => void) {
      if (!isSupabaseConfigured()) return () => {};
      const channel = supabase
        .channel('spp_global_sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            onEvent(payload);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  },

  // ==========================================================================
  // RIWAYAT TRANSAKSI KAS & PEMBAYARAN (TRANSACTIONS)
  // ==========================================================================
  transactions: {
    async getAll(): Promise<{ data: Transaction[]; error: string | null }> {
      try {
        if (!isSupabaseConfigured()) return { data: [], error: 'Supabase belum dikonfigurasi' };
        const { data, error } = await supabase
          .from('transactions')
          .select('*, students(name, nis, class_name), transaction_items(*)')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = (data || []).map((t: any) => ({
          ...t,
          student_name: t.students?.name || '',
          student_nis: t.students?.nis || '',
          student_class: t.students?.class_name || '',
          items: t.transaction_items || []
        }));

        return { data: formatted as Transaction[], error: null };
      } catch (err: any) {
        return { data: [], error: err?.message || 'Gagal memuat riwayat transaksi' };
      }
    }
  }
};
