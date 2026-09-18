import { createApp } from './app';

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const app = await createApp();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`Backend Server SPP Imam Muzani berjalan pada port ${PORT}`);
      console.log(`API Ready: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Gagal menjalankan server backend:', err);
    process.exit(1);
  }
}

start();
