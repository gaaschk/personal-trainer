/**
 * Next.js instrumentation hook — runs once at server startup.
 * Loads DB settings into process.env so OAuth providers (Google, Apple)
 * receive credentials at module init time. Never overwrites existing env vars.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { prisma } = await import('@/lib/prisma');
      const { decrypt } = await import('@/lib/encryption');
      const { SETTINGS_MANIFEST } = await import('@/lib/settings-manifest');
      const rows = await prisma.systemSetting.findMany();
      for (const row of rows) {
        if (!process.env[row.key]) {
          const manifest = SETTINGS_MANIFEST[row.key as keyof typeof SETTINGS_MANIFEST];
          process.env[row.key] = manifest?.secret ? decrypt(row.value) : row.value;
        }
      }
    } catch {
      // Non-fatal: DB may not be reachable at startup in some environments
    }
  }
}
