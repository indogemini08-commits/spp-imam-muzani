import { createApp } from '../server/src/app';

let appInstance: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appInstance) {
      appInstance = await createApp();
    }
    return appInstance(req, res);
  } catch (err: any) {
    console.error('Fatal error in Vercel API handler:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: err?.message || 'Terjadi kesalahan internal pada serverless function'
      });
    }
  }
}

