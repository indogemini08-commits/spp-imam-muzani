import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { SCHEMA_SQL } from './schema';

let db: Database | null = null;
const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? '/tmp' : path.resolve(process.cwd(), 'server', 'data');
const DB_FILE = path.join(DATA_DIR, 'spp.db');

async function loadSqlJsEngine() {
  try {
    // @ts-ignore
    const initSqlJs = (await import('sql.js')).default;
    return await initSqlJs();
  } catch (err) {
    try {
      // @ts-ignore
      const asmMod: any = await import('sql.js/dist/sql-asm.js');
      const initAsm = asmMod?.default || asmMod;
      return await (initAsm as any)();
    } catch (asmErr) {
      console.error('Gagal menginisialisasi engine sql.js:', asmErr);
      throw asmErr;
    }
  }
}

export async function getDb(): Promise<Database> {
  if (db) return db;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn('Gagal membuat direktori data:', e);
  }

  // If on Vercel and /tmp/spp.db doesn't exist yet, copy from pre-bundled file if present
  if (isVercel && !fs.existsSync(DB_FILE)) {
    const bundledCandidates = [
      path.resolve(process.cwd(), 'server', 'data', 'spp.db'),
      path.resolve(process.cwd(), 'data', 'spp.db')
    ];
    for (const cand of bundledCandidates) {
      if (fs.existsSync(cand)) {
        try {
          fs.copyFileSync(cand, DB_FILE);
          break;
        } catch (copyErr) {
          console.warn('Gagal menyalin bundled db:', copyErr);
        }
      }
    }
  }

  const SQL = await loadSqlJsEngine();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      db.run('PRAGMA foreign_keys = ON;');
      db.run(SCHEMA_SQL);
      try {
        db.run('ALTER TABLE school_settings ADD COLUMN app_logo_url TEXT DEFAULT "";');
      } catch (_) {}
      try {
        db.run('ALTER TABLE students ADD COLUMN previous_arrears REAL DEFAULT 0;');
      } catch (_) {}
      try {
        db.run('ALTER TABLE students ADD COLUMN previous_arrears_note TEXT DEFAULT "";');
      } catch (_) {}
      try {
        db.run("ALTER TABLE students ADD COLUMN additional_arrears TEXT DEFAULT '[]';");
      } catch (_) {}
      try {
        db.run('ALTER TABLE school_settings ADD COLUMN yayasan_name TEXT DEFAULT "YAYASAN PENDIDIKAN ISLAM IMAM MUZANI";');
      } catch (_) {}
      try {
        db.run('ALTER TABLE school_settings ADD COLUMN headmaster_title TEXT DEFAULT "Kepala Sekolah / Mudir Pesantren";');
      } catch (_) {}
      try {
        db.run('ALTER TABLE school_settings ADD COLUMN headmaster_name TEXT DEFAULT "KH. Abdullah Syafi\'i, Lc., M.Pd.I.";');
      } catch (_) {}
      try {
        db.run('ALTER TABLE school_settings ADD COLUMN headmaster_nip TEXT DEFAULT "NIY: 197804152005011002";');
      } catch (_) {}
      try {
        db.run('ALTER TABLE school_settings ADD COLUMN bank_accounts TEXT DEFAULT "[]";');
      } catch (_) {}
      try {
        db.run("ALTER TABLE school_settings ADD COLUMN available_classes TEXT DEFAULT '[]';");
      } catch (_) {}
      try {
        db.run('ALTER TABLE annual_bill_types ADD COLUMN target_classes TEXT DEFAULT "ALL";');
      } catch (_) {}
      try {
        db.run("UPDATE students SET class_name = 'VII', level = 'SMP' WHERE class_name IN ('7A', '7B', '7', 'Kelas 7', 'Kelas 7A', 'Kelas 7B');");
        db.run("UPDATE students SET class_name = 'VIII', level = 'SMP' WHERE class_name IN ('8A', '8B', '8', 'Kelas 8', 'Kelas 8A', 'Kelas 8B');");
        db.run("UPDATE students SET class_name = 'IX', level = 'SMP' WHERE class_name IN ('9A', '9B', '9', 'Kelas 9', 'Kelas 9A', 'Kelas 9B');");
        db.run("UPDATE students SET class_name = 'X', level = 'SMA' WHERE class_name IN ('10 IPA', '10 IPS', '10', 'Kelas 10', 'Kelas 10 IPA');");
      } catch (_) {}
      // Remove hardcoded user updates to let user freely customize names in RBAC settings

      // Auto-heal next transaction and receipt sequences to prevent duplicate constraint collisions
      try {
        const trxs = db.exec("SELECT transaction_no, receipt_no FROM transactions");
        if (trxs[0]?.values) {
          let maxT = 0;
          let maxR = 0;
          for (const row of trxs[0].values) {
            const tNo = String(row[0] || '');
            const rNo = String(row[1] || '');
            const mT = tNo.match(/(\d+)$/);
            if (mT) {
              const n = parseInt(mT[1], 10);
              if (!isNaN(n) && n > maxT) maxT = n;
            }
            const mR = rNo.match(/(\d+)$/);
            if (mR) {
              const n = parseInt(mR[1], 10);
              if (!isNaN(n) && n > maxR) maxR = n;
            }
          }
          if (maxT > 0 || maxR > 0) {
            db.run(
              "UPDATE school_settings SET next_trx_seq = MAX(COALESCE(next_trx_seq, 1), ?), next_receipt_seq = MAX(COALESCE(next_receipt_seq, 1), ?) WHERE id = 'school_main'",
              [maxT + 1, maxR + 1]
            );
          }
        }
      } catch (_) {}

      return db;
    } catch (err) {
      console.error('Gagal memuat file database yang ada, membuat database baru:', err);
    }
  }

  db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.run(SCHEMA_SQL);
  await persistDb();
  return db;
}

export async function persistDb(): Promise<void> {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Gagal menyimpan file database ke disk:', err);
  }
}

export function query<T = any>(sqlStr: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database belum diinisialisasi');
  try {
    const stmt = db.prepare(sqlStr);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Error saat query SQL:', sqlStr, params, err);
    throw err;
  }
}

export function get<T = any>(sqlStr: string, params: any[] = []): T | null {
  const rows = query<T>(sqlStr, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sqlStr: string, params: any[] = []): void {
  if (!db) throw new Error('Database belum diinisialisasi');
  try {
    db.run(sqlStr, params);
  } catch (err) {
    console.error('Error saat eksekusi SQL run:', sqlStr, params, err);
    throw err;
  }
}

export function exportDatabaseState(): Record<string, any[]> {
  if (!db) throw new Error('Database belum diinisialisasi');
  const tables = [
    'users',
    'school_settings',
    'academic_years',
    'spp_types',
    'eskul_types',
    'annual_bill_types',
    'annual_bill_packages',
    'students',
    'bills',
    'transactions',
    'transaction_items',
    'payment_confirmations',
    'whatsapp_templates',
    'whatsapp_logs',
    'audit_logs'
  ];

  const state: Record<string, any[]> = {};
  for (const table of tables) {
    try {
      state[table] = query(`SELECT * FROM ${table}`);
    } catch {
      state[table] = [];
    }
  }
  return state;
}

export async function importDatabaseState(state: Record<string, any[]>): Promise<void> {
  if (!db) throw new Error('Database belum diinisialisasi');
  
  db.run('PRAGMA foreign_keys = OFF;');
  
  const tables = Object.keys(state);
  for (const table of tables) {
    if (!Array.isArray(state[table])) continue;
    try {
      db.run(`DELETE FROM ${table};`);
      const rows = state[table];
      if (rows.length === 0) continue;

      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const insertSql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders});`;

      for (const row of rows) {
        const values = cols.map((c) => row[c]);
        db.run(insertSql, values);
      }
    } catch (tableErr) {
      console.warn(`Peringatan saat import tabel ${table}:`, tableErr);
    }
  }

  db.run('PRAGMA foreign_keys = ON;');
  await persistDb();
}
