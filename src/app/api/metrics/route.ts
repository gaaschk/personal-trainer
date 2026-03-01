import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') ?? '90');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const metrics = await prisma.bodyMetric.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: 'asc' },
  });
  return NextResponse.json(metrics);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as {
    date?: string;
    weightKg?: number;
    bodyFatPct?: number;
    notes?: string;
  };

  const date = body.date ? new Date(body.date) : new Date();
  date.setHours(0, 0, 0, 0);

  const metric = await prisma.bodyMetric.upsert({
    where: { userId_date: { userId, date } },
    update: {
      weightKg:   body.weightKg ?? undefined,
      bodyFatPct: body.bodyFatPct ?? undefined,
      notes:      body.notes ?? undefined,
    },
    create: {
      userId,
      date,
      weightKg:   body.weightKg ?? null,
      bodyFatPct: body.bodyFatPct ?? null,
      notes:      body.notes ?? null,
    },
  });
  return NextResponse.json(metric, { status: 201 });
}
