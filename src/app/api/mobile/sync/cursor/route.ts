import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DATA_TYPES = ['activity', 'vitals', 'sleep', 'body', 'workouts'] as const;

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const rows = await prisma.syncCursor.findMany({
    where: { userId: auth.userId },
  });

  const cursors: Record<string, string | null> = {};
  for (const type of DATA_TYPES) {
    const row = rows.find((r) => r.dataType === type);
    cursors[type] = row ? row.lastSyncAt.toISOString() : null;
  }

  return NextResponse.json({ cursors });
}
