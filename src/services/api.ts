// API Client Service for Aplikasi SPP Sekolah
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { supabaseService } from './supabaseService';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const rawText = await response.text();
  let data: any;

  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (_) {
    if (!response.ok) {
      throw new Error(`Server error (${response.status}): Layanan backend sedang tidak dapat diakses atau sedang memulai ulang.`);
    }
    throw new Error('Format respons server tidak valid.');
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Terjadi kesalahan pada permintaan API');
  }

  return data as T;
}

export const api = {
  // Auth & Users
  auth: {
    login: (body: { username: string; password: string }) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    getUsers: () => request<any[]>('/auth/users'),
    createUser: (body: any) => request<any>('/auth/users', { method: 'POST', body: JSON.stringify(body) }),
    updateUser: (id: string, body: any) => request<any>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteUser: (id: string) => request<any>(`/auth/users/${id}`, { method: 'DELETE' })
  },

  // School Settings
  school: {
    getSettings: async () => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.school.getSettings();
        if (res.data) return res.data;
      }
      return request<any>('/school');
    },
    updateSettings: async (body: any) => {
      if (isSupabaseConfigured()) {
        await supabaseService.school.updateSettings(body);
      }
      return request<any>('/school', { method: 'PUT', body: JSON.stringify(body) });
    },
    renameClass: (oldClassName: string, newClassName: string) =>
      request<any>('/school/rename-class', {
        method: 'POST',
        body: JSON.stringify({ oldClassName, newClassName })
      }),
    syncStudentClasses: () =>
      request<any>('/school/sync-student-classes', { method: 'POST' })
  },

  // Academic Years
  academicYears: {
    getAll: async () => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.master.getAcademicYears();
        if (!res.error && res.data) return res.data;
      }
      return request<any[]>('/academic-years');
    },
    create: async (body: any) => {
      if (isSupabaseConfigured()) {
        try { await supabase.from('academic_years').insert(body); } catch (_) {}
      }
      return request<any>('/academic-years', { method: 'POST', body: JSON.stringify(body) });
    },
    setActive: (id: string) => request<any>(`/academic-years/${id}/set-active`, { method: 'PUT' }),
    generateBills: (id: string) => request<any>(`/academic-years/${id}/generate-bills`, { method: 'POST' })
  },

  // Students
  students: {
    getAll: async (params: Record<string, string> = {}) => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.students.getAll({
          class_name: params.class_name,
          status: params.status,
          search: params.search
        });
        if (!res.error && res.data) return res.data;
      }
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/students${qs ? `?${qs}` : ''}`);
    },
    getDetail: async (id: string) => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.students.getById(id);
        if (!res.error && res.data) return res.data;
      }
      return request<any>(`/students/${id}`);
    },
    create: async (body: any) => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.students.create(body);
        try { await request<any>('/students', { method: 'POST', body: JSON.stringify(body) }); } catch (_) {}
        if (res.success && res.data) return res.data;
      }
      return request<any>('/students', { method: 'POST', body: JSON.stringify(body) });
    },
    update: async (id: string, body: any) => {
      if (isSupabaseConfigured()) {
        await supabaseService.students.update(id, body);
        try { await request<any>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(body) }); } catch (_) {}
        return { message: 'Data santri berhasil diperbarui' };
      }
      return request<any>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    },
    delete: async (id: string) => {
      if (isSupabaseConfigured()) {
        await supabaseService.students.delete(id);
        try { await request<any>(`/students/${id}`, { method: 'DELETE' }); } catch (_) {}
        return { message: 'Data santri berhasil dihapus' };
      }
      return request<any>(`/students/${id}`, { method: 'DELETE' });
    },
    bulkDelete: async (ids: string[]) => {
      if (isSupabaseConfigured()) {
        await supabaseService.students.bulkDelete(ids);
        try { await request<any>('/students/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }); } catch (_) {}
        return { message: `${ids.length} data santri berhasil dihapus secara permanen.` };
      }
      return request<any>('/students/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
    },
    importStudents: async (students: any[]) => {
      if (isSupabaseConfigured()) {
        for (const s of students) {
          await supabaseService.students.create(s);
        }
      }
      return request<any>('/students/import', { method: 'POST', body: JSON.stringify({ students }) });
    }
  },

  // SPP Types
  sppTypes: {
    getAll: async () => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.master.getSppTypes();
        if (!res.error && res.data) return res.data;
      }
      return request<any[]>('/spp-types');
    },
    create: async (body: any) => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.master.createSppType(body);
        try { await request<any>('/spp-types', { method: 'POST', body: JSON.stringify(body) }); } catch (_) {}
        if (res.success && res.data) return res.data;
      }
      return request<any>('/spp-types', { method: 'POST', body: JSON.stringify(body) });
    },
    update: async (id: string, body: any) => {
      if (isSupabaseConfigured()) {
        await supabaseService.master.updateSppType(id, body);
        try { await request<any>(`/spp-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }); } catch (_) {}
        return { message: 'Jenis SPP berhasil diperbarui' };
      }
      return request<any>(`/spp-types/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    },
    duplicate: async (id: string) => {
      if (isSupabaseConfigured()) {
        const all = await supabaseService.master.getSppTypes();
        const existing = all.data?.find(s => s.id === id);
        if (existing) {
          await supabaseService.master.createSppType({
            ...existing,
            id: undefined,
            name: `${existing.name} (Salinan)`
          });
        }
      }
      return request<any>(`/spp-types/${id}/duplicate`, { method: 'POST' });
    },
    delete: async (id: string) => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.master.deleteSppType(id);
        if (!res.success && res.error) {
          throw new Error(res.error);
        }
        try { await request<any>(`/spp-types/${id}`, { method: 'DELETE' }); } catch (_) {}
        return { message: 'Jenis SPP berhasil dihapus' };
      }
      return request<any>(`/spp-types/${id}`, { method: 'DELETE' });
    }
  },

  // Eskul
  eskul: {
    getAll: async () => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.master.getEskulTypes();
        if (!res.error && res.data) return res.data;
      }
      return request<any[]>('/eskul');
    },
    create: async (body: any) => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.master.createEskulType(body);
        try { await request<any>('/eskul', { method: 'POST', body: JSON.stringify(body) }); } catch (_) {}
        if (res.success && res.data) return res.data;
      }
      return request<any>('/eskul', { method: 'POST', body: JSON.stringify(body) });
    },
    update: async (id: string, body: any) => {
      if (isSupabaseConfigured()) {
        await supabaseService.master.updateEskulType(id, body);
        try { await request<any>(`/eskul/${id}`, { method: 'PUT', body: JSON.stringify(body) }); } catch (_) {}
        return { message: 'Jenis eskul berhasil diperbarui' };
      }
      return request<any>(`/eskul/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    },
    delete: async (id: string) => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.master.deleteEskulType(id);
        if (!res.success && res.error) {
          throw new Error(res.error);
        }
        try { await request<any>(`/eskul/${id}`, { method: 'DELETE' }); } catch (_) {}
        return { message: 'Jenis eskul berhasil dihapus' };
      }
      return request<any>(`/eskul/${id}`, { method: 'DELETE' });
    }
  },

  // Annual Bills
  annualBills: {
    getAll: async () => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.master.getAnnualBillTypes();
        if (!res.error && res.data) {
          return { types: res.data, packages: [] };
        }
      }
      return request<any>('/annual-bills');
    },
    createType: async (body: any) => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.master.createAnnualBillType(body);
        try { await request<any>('/annual-bills/type', { method: 'POST', body: JSON.stringify(body) }); } catch (_) {}
        if (res.success && res.data) return res.data;
      }
      return request<any>('/annual-bills/type', { method: 'POST', body: JSON.stringify(body) });
    },
    updateType: async (id: string, body: any) => {
      if (isSupabaseConfigured()) {
        await supabaseService.master.updateAnnualBillType(id, body);
        try { await request<any>(`/annual-bills/type/${id}`, { method: 'PUT', body: JSON.stringify(body) }); } catch (_) {}
        return { message: 'Tagihan tahunan berhasil diperbarui' };
      }
      return request<any>(`/annual-bills/type/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    },
    deleteType: async (id: string) => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.master.deleteAnnualBillType(id);
        if (!res.success && res.error) {
          throw new Error(res.error);
        }
        try { await request<any>(`/annual-bills/type/${id}`, { method: 'DELETE' }); } catch (_) {}
        return { message: 'Tagihan tahunan berhasil dihapus' };
      }
      return request<any>(`/annual-bills/type/${id}`, { method: 'DELETE' });
    },
    savePackage: (body: any) => request<any>('/annual-bills/package', { method: 'POST', body: JSON.stringify(body) })
  },

  // Billing
  billing: {
    getAll: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/billing${qs ? `?${qs}` : ''}`);
    },
    getKhususBills: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/billing/khusus${qs ? `?${qs}` : ''}`);
    },
    getStudentBills: (studentId: string) => request<any>(`/billing/student/${studentId}`),
    createManualBill: (body: any) => request<any>('/billing/manual-bill', { method: 'POST', body: JSON.stringify(body) }),
    createKhususBill: (body: any) => request<any>('/billing/khusus', { method: 'POST', body: JSON.stringify(body) }),
    deleteBill: (id: string) => request<any>(`/billing/${id}`, { method: 'DELETE' })
  },

  // Payments & Transactions
  payments: {
    process: (body: any) => request<any>('/payments', { method: 'POST', body: JSON.stringify(body) }),
    getTransactions: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/payments/transactions${qs ? `?${qs}` : ''}`);
    },
    getTransactionDetail: (id: string) => request<any>(`/payments/transactions/${id}`),
    getReceiptData: (receiptNo: string) => request<any>(`/payments/receipt/${encodeURIComponent(receiptNo)}`),
    cancelTransaction: (id: string, body: { reason: string; user_name?: string }) =>
      request<any>(`/payments/transactions/${id}`, { method: 'DELETE', body: JSON.stringify(body) })
  },

  // Confirmations
  confirmations: {
    getAll: async (params: Record<string, string> = {}) => {
      if (isSupabaseConfigured()) {
        const res = await supabaseService.confirmations.getAll(params);
        if (!res.error && res.data) return res.data;
      }
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/confirmations${qs ? `?${qs}` : ''}`);
    },
    submit: (body: any) => request<any>('/confirmations', { method: 'POST', body: JSON.stringify(body) }),
    approve: (id: string, body: any = {}) => request<any>(`/confirmations/${id}/approve`, { method: 'PUT', body: JSON.stringify(body) }),
    reject: (id: string, body: { reason: string; reviewer_name?: string }) =>
      request<any>(`/confirmations/${id}/reject`, { method: 'PUT', body: JSON.stringify(body) })
  },

  // WhatsApp
  whatsapp: {
    getReminders: () => request<any[]>('/whatsapp/reminders'),
    sendSingle: (body: any) => request<any>('/whatsapp/send-single', { method: 'POST', body: JSON.stringify(body) }),
    sendBulk: (items: any[]) => request<any>('/whatsapp/send-bulk', { method: 'POST', body: JSON.stringify({ items }) }),
    getTemplates: () => request<any[]>('/whatsapp/templates'),
    updateTemplate: (id: string, body: any) => request<any>(`/whatsapp/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    getLogs: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/whatsapp/logs${qs ? `?${qs}` : ''}`);
    }
  },

  // Reports
  reports: {
    getPenerimaan: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any>(`/reports/penerimaan${qs ? `?${qs}` : ''}`);
    },
    getPelunasan: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/reports/pelunasan${qs ? `?${qs}` : ''}`);
    },
    getTunggakan: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any>(`/reports/tunggakan${qs ? `?${qs}` : ''}`);
    },
    getMatrixSpp: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any>(`/reports/matrix-spp${qs ? `?${qs}` : ''}`);
    },
    getMatrixEskul: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/reports/matrix-eskul${qs ? `?${qs}` : ''}`);
    },
    getDaftarUlang: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any>(`/reports/daftar-ulang${qs ? `?${qs}` : ''}`);
    },
    getTagihanKhusus: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any>(`/reports/tagihan-khusus${qs ? `?${qs}` : ''}`);
    }
  },

  // System & Dashboard
  system: {
    getDashboardStats: (params: { class_name?: string } = {}) => {
      const qs = new URLSearchParams(params.class_name ? { class_name: params.class_name } : {}).toString();
      return request<any>(`/system/dashboard-stats${qs ? `?${qs}` : ''}`);
    },
    backupDatabase: () => window.open('/api/system/backup', '_blank'),
    restoreDatabase: (state: any) => request<any>('/system/restore', { method: 'POST', body: JSON.stringify(state) }),
    resetDemo: () => request<any>('/system/reset-demo', { method: 'POST' }),
    getAuditLogs: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/system/audit-logs${qs ? `?${qs}` : ''}`);
    }
  },

  // Parent Portal
  portal: {
    checkNis: (nis: string, pin?: string) => {
      const qs = pin ? `?pin=${encodeURIComponent(pin)}` : '';
      return request<any>(`/portal/check-nis/${encodeURIComponent(nis)}${qs}`);
    }
  }
};
