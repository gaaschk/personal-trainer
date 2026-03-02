import { prisma } from './prisma';
import { encrypt, decrypt } from './encryption';
import { SETTINGS_MANIFEST, type SettingKey } from './settings-manifest';

export { SETTINGS_MANIFEST, type SettingKey };

// ── In-memory cache ───────────────────────────────────────────────────────────

const _cache = new Map<string, string>();
let _cacheTime = 0;
const CACHE_TTL = 60_000; // 60 seconds

export function invalidateSettingsCache(): void {
  _cache.clear();
  _cacheTime = 0;
}

async function loadCache(): Promise<void> {
  const now = Date.now();
  if (now - _cacheTime < CACHE_TTL && _cache.size > 0) return;

  const rows = await prisma.systemSetting.findMany();
  _cache.clear();
  for (const row of rows) {
    const manifest = SETTINGS_MANIFEST[row.key as SettingKey];
    const value = manifest?.secret ? decrypt(row.value) : row.value;
    _cache.set(row.key, value);
  }
  _cacheTime = now;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Get a single setting: DB value (decrypted) → env var → undefined */
export async function getSetting(key: string): Promise<string | undefined> {
  await loadCache();
  const cached = _cache.get(key);
  if (cached !== undefined) return cached;
  return process.env[key] ?? undefined;
}

/** Get all manifest keys with their current values (decrypted) */
export async function getAllSettings(): Promise<Record<string, string>> {
  await loadCache();
  const result: Record<string, string> = {};
  for (const key of Object.keys(SETTINGS_MANIFEST)) {
    const cached = _cache.get(key);
    result[key] = cached !== undefined ? cached : (process.env[key] ?? '');
  }
  return result;
}

/** Save a setting to DB (encrypts if secret), invalidates cache */
export async function upsertSetting(key: string, value: string): Promise<void> {
  const manifest = SETTINGS_MANIFEST[key as SettingKey];
  const stored = manifest?.secret ? encrypt(value) : value;
  await prisma.systemSetting.upsert({
    where:  { key },
    create: { key, value: stored },
    update: { value: stored },
  });
  invalidateSettingsCache();
}
