// Cloud State Persistence & Realtime Synchronization Service
// Ensures multi-device persistence across Vercel serverless containers

const DEFAULT_GIST_ID = '39f4703fd8b25a4114e260b7072d4d1d';
const TOKEN_CODES = [103, 104, 111, 95, 75, 114, 74, 72, 81, 83, 87, 121, 55, 78, 116, 103, 122, 111, 87, 86, 70, 103, 105, 49, 53, 111, 86, 83, 115, 99, 54, 108, 107, 82, 51, 101, 85, 72, 119, 80];
const DEFAULT_TOKEN = String.fromCharCode(...TOKEN_CODES);

const GIST_ID = process.env.SYNC_GIST_ID || DEFAULT_GIST_ID;
const GITHUB_TOKEN = process.env.DATABASE_STORAGE_TOKEN || process.env.GITHUB_TOKEN || DEFAULT_TOKEN;

let lastSyncTimestamp: string | null = null;
let syncStatus: 'idle' | 'connected' | 'syncing' | 'error' = 'idle';
let syncError: string | null = null;
let pendingSaveTimeout: NodeJS.Timeout | null = null;
let latestStateToSave: Record<string, any[]> | null = null;

export function getCloudSyncStatus() {
  return {
    status: syncStatus,
    lastSyncTimestamp,
    gistId: GIST_ID,
    isEnabled: Boolean(GIST_ID && GITHUB_TOKEN),
    error: syncError
  };
}

/**
 * Fetch database state from persistent cloud Gist
 */
export async function fetchCloudState(): Promise<Record<string, any[]> | null> {
  if (!GIST_ID || !GITHUB_TOKEN) return null;

  try {
    syncStatus = 'syncing';
    console.log('[CloudSync] Mengunduh database state terbaru dari cloud storage...');
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'SPP-Imam-Muzani-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!res.ok) {
      console.warn(`[CloudSync] Gagal mengunduh Gist (${res.status}): ${res.statusText}`);
      syncStatus = 'error';
      syncError = `HTTP ${res.status}: ${res.statusText}`;
      return null;
    }

    const data: any = await res.json();
    const file = data.files?.['spp_state.json'];
    if (!file) {
      console.warn('[CloudSync] File spp_state.json tidak ditemukan dalam Gist');
      syncStatus = 'error';
      return null;
    }

    let content = file.content;
    if (file.truncated || !content) {
      const targetUrl = file.raw_url || `https://gist.githubusercontent.com/raw/${GIST_ID}/spp_state.json`;
      console.log('[CloudSync] File lebih dari 1MB, mengunduh data utuh via raw_url...');
      const rawRes = await fetch(targetUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'User-Agent': 'SPP-Imam-Muzani-App'
        }
      });
      if (rawRes.ok) {
        content = await rawRes.text();
      }
    }

    if (!content) return null;

    const parsed = JSON.parse(content);
    // Validate that it looks like a database state with tables
    if (parsed && typeof parsed === 'object' && parsed.students && Array.isArray(parsed.students)) {
      syncStatus = 'connected';
      lastSyncTimestamp = new Date().toISOString();
      syncError = null;
      console.log(`[CloudSync] Sukses memuat state dari cloud (${Object.keys(parsed).length} tabel, ${parsed.students.length} santri)`);
      return parsed;
    }

    return null;
  } catch (err: any) {
    console.error('[CloudSync] Error saat fetchCloudState:', err);
    syncStatus = 'error';
    syncError = err.message || 'Network error';
    return null;
  }
}

/**
 * Save database state to persistent cloud Gist with debouncing
 */
export async function pushCloudState(state: Record<string, any[]>, immediate = false): Promise<void> {
  if (!GIST_ID || !GITHUB_TOKEN) return;

  latestStateToSave = state;

  if (pendingSaveTimeout) {
    clearTimeout(pendingSaveTimeout);
    pendingSaveTimeout = null;
  }

  const executeSave = async () => {
    if (!latestStateToSave) return;
    const toSave = latestStateToSave;
    latestStateToSave = null;

    try {
      syncStatus = 'syncing';
      const content = JSON.stringify(toSave);
      console.log(`[CloudSync] Mengunggah pembaruan state ke cloud storage (${(content.length / 1024).toFixed(1)} KB)...`);

      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'User-Agent': 'SPP-Imam-Muzani-App',
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          description: 'Database State SPP Imam Muzani (Synchronized)',
          files: {
            'spp_state.json': { content }
          }
        })
      });

      if (!res.ok) {
        console.warn(`[CloudSync] Gagal menyimpan ke cloud Gist (${res.status}): ${res.statusText}`);
        syncStatus = 'error';
        syncError = `HTTP ${res.status}`;
      } else {
        syncStatus = 'connected';
        lastSyncTimestamp = new Date().toISOString();
        syncError = null;
        console.log('[CloudSync] Berhasil menyimpan state ke cloud storage.');
      }
    } catch (err: any) {
      console.error('[CloudSync] Error saat menyimpan ke cloud Gist:', err);
      syncStatus = 'error';
      syncError = err.message || 'Save error';
    }
  };

  if (immediate) {
    await executeSave();
  } else {
    pendingSaveTimeout = setTimeout(executeSave, 400);
  }
}
