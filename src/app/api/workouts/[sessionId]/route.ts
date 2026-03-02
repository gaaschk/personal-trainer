import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { sessionId } = await params;

  const session = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      workoutExercises: {
        include: { sets: { orderBy: { setNumber: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(session);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { sessionId } = await params;

  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as {
    title?: string;
    status?: string;
    startedAt?: string;
    completedAt?: string;
    durationMin?: number;
    notes?: string;
  };

  const updated = await prisma.workoutSession.update({
    where: { id: sessionId },
    data: {
      title:       body.title ?? undefined,
      status:      (body.status as 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED') ?? undefined,
      startedAt:   body.startedAt   ? new Date(body.startedAt)   : undefined,
      completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
      durationMin: body.durationMin ?? undefined,
      notes:       body.notes ?? undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { sessionId } = await params;

  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.workoutSession.delete({ where: { id: sessionId } });
  return NextResponse.json({ ok: true });
}
