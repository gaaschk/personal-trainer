import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { sessionId } = await params;

  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const exercises = await prisma.workoutExercise.findMany({
    where: { sessionId },
    include: { sets: { orderBy: { setNumber: 'asc' } } },
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(exercises);
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { sessionId } = await params;

  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as { name: string; order?: number; notes?: string };
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const count = await prisma.workoutExercise.count({ where: { sessionId } });
  const exercise = await prisma.workoutExercise.create({
    data: {
      sessionId,
      name:  body.name,
      order: body.order ?? count,
      notes: body.notes ?? null,
    },
    include: { sets: true },
  });
  return NextResponse.json(exercise, { status: 201 });
}
