import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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

export async function createApp() {
  // Ensure DB initialized & seeded
  await getDb();
  await seedDatabase();
  synchronizeMasterData();

  const app = express();

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
  }));
  app.options('*', cors());

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Root API Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'SPP Imam Muzani Standalone Local API',
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

  // 404 handler for API routes that do not exist
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API tidak ditemukan' });
  });

  // Serve Frontend Production Build from /dist
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    // SPA Client-Side Routing Fallback (for React Single Page App)
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}
