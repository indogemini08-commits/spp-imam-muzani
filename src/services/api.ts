// API Client Service for Aplikasi SPP Sekolah

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada permintaan API');
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
    getSettings: () => request<any>('/school'),
    updateSettings: (body: any) => request<any>('/school', { method: 'PUT', body: JSON.stringify(body) }),
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
    getAll: () => request<any[]>('/academic-years'),
    create: (body: any) => request<any>('/academic-years', { method: 'POST', body: JSON.stringify(body) }),
    setActive: (id: string) => request<any>(`/academic-years/${id}/set-active`, { method: 'PUT' }),
    generateBills: (id: string) => request<any>(`/academic-years/${id}/generate-bills`, { method: 'POST' })
  },

  // Students
  students: {
    getAll: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request<any[]>(`/students${qs ? `?${qs}` : ''}`);
    },
    getDetail: (id: string) => request<any>(`/students/${id}`),
    create: (body: any) => request<any>('/students', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/students/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request<any>(`/students/${id}`, { method: 'DELETE' }),
    bulkDelete: (ids: string[]) => request<any>('/students/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
    importStudents: (students: any[]) => request<any>('/students/import', { method: 'POST', body: JSON.stringify({ students }) })
  },

  // SPP Types
  sppTypes: {
    getAll: () => request<any[]>('/spp-types'),
    create: (body: any) => request<any>('/spp-types', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/spp-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    duplicate: (id: string) => request<any>(`/spp-types/${id}/duplicate`, { method: 'POST' }),
    delete: (id: string) => request<any>(`/spp-types/${id}`, { method: 'DELETE' })
  },

  // Eskul
  eskul: {
    getAll: () => request<any[]>('/eskul'),
    create: (body: any) => request<any>('/eskul', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/eskul/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request<any>(`/eskul/${id}`, { method: 'DELETE' })
  },

  // Annual Bills
  annualBills: {
    getAll: () => request<any>('/annual-bills'),
    createType: (body: any) => request<any>('/annual-bills/type', { method: 'POST', body: JSON.stringify(body) }),
    updateType: (id: string, body: any) => request<any>(`/annual-bills/type/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteType: (id: string) => request<any>(`/annual-bills/type/${id}`, { method: 'DELETE' }),
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
    getAll: (params: Record<string, string> = {}) => {
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
