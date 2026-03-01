import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as {
    title: string;
    planDayId?: string;
    scheduledAt?: string;
    notes?: string;
  };

  if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const session = await prisma.workoutSession.create({
    data: {
      userId,
      title:       body.title,
      planDayId:   body.planDayId ?? null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      notes:       body.notes ?? null,
      status:      'PLANNED',
    },
  });
  return NextResponse.json(session, { status: 201 });
}
