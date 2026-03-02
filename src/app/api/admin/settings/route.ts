import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getAllSettings, upsertSetting, SETTINGS_MANIFEST } from '@/lib/settings';

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const raw = await getAllSettings();
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const manifest = SETTINGS_MANIFEST[key as keyof typeof SETTINGS_MANIFEST];
    masked[key] = manifest?.secret ? (value ? '••••••' : '') : value;
  }
  return NextResponse.json(masked);
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json() as { key?: string; value?: string };
  if (!body.key || body.value === undefined) {
    return NextResponse.json({ error: 'key and value required' }, { status: 400 });
  }
  if (!(body.key in SETTINGS_MANIFEST)) {
    return NextResponse.json({ error: 'Unknown setting key' }, { status: 400 });
  }

  await upsertSetting(body.key, body.value);
  return NextResponse.json({ ok: true });
}
