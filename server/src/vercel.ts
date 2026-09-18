import express from 'express';
import cors from 'cors';
import { getDb } from './db/database';
import { seedDatabase } from './db/seed';
import { synchronizeMasterData } from './services/billingEngine';

// Routes
import authRoutes from './routes/auth';
import schoolRoutes from './routes/school';
import academicYearRoutes from './routes/academicYears';
import studentRoutes from './routes/students';
import sppTypeRoutes from './routes/sppTypes';
import eskulRoutes from './routes/eskul';
import annualBillRoutes from './routes/annualBills';
import billingRoutes from './routes/billing';
import paymentRoutes from './routes/payments';
import confirmationRoutes from './routes/confirmations';
import whatsappRoutes from './routes/whatsapp';
import reportRoutes from './routes/reports';
import systemRoutes from './routes/system';
import portalRoutes from './routes/portal';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));
app.options('*', cors());

// URL Normalizer for Vercel Serverless Function
app.use((req, _res, next) => {
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Lazy DB initialization promise
let dbReadyPromise: Promise<void> | null = null;
function ensureDatabaseReady() {
  if (!dbReadyPromise) {
    dbReadyPromise = (async () => {
      try {
        console.log('[Vercel Serverless] Inisialisasi database...');
        await getDb();
        await seedDatabase();
        synchronizeMasterData();
        console.log('[Vercel Serverless] Database siap digunakan.');
      } catch (err) {
        console.error('[Vercel Serverless] Gagal inisialisasi database:', err);
        dbReadyPromise = null; // allow retry
        throw err;
      }
    })();
  }
  return dbReadyPromise;
}

// DB readiness middleware
app.use(async (req, res, next) => {
  if (req.url === '/api/health-check-raw') {
    return res.json({ status: 'ok', raw: true });
  }
  try {
    await ensureDatabaseReady();
    next();
  } catch (err: any) {
    return res.status(500).json({
      error: 'Database Initialization Failed',
      message: err?.message || 'Gagal memuat database pada serverless runtime'
    });
  }
});

// Root & Health check
app.get(['/api', '/api/health'], (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SPP Imam Muzani Backend API (Vercel Serverless)',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/spp-types', sppTypeRoutes);
app.use('/api/eskul', eskulRoutes);
app.use('/api/annual-bills', annualBillRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/confirmations', confirmationRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/portal', portalRoutes);

// Global Error Handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[Vercel Express Error]', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || 'Terjadi kesalahan internal server'
    });
  }
});

// 404 handler for unmatched /api routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Rute API '${req.url}' tidak ditemukan`
  });
});

export default app;
