import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

type Params = { params: Promise<{ sessionId: string; id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { sessionId, id: exerciseId } = await params;

  // Verify ownership
  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const exercise = await prisma.workoutExercise.findFirst({ where: { id: exerciseId, sessionId } });
  if (!exercise) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as {
    setNumber?: number;
    weightKg?: number;
    reps?: number;
    durationSec?: number;
    distanceM?: number;
    rpe?: number;
    completed?: boolean;
  };

  const count = await prisma.exerciseSet.count({ where: { exerciseId } });
  const set = await prisma.exerciseSet.create({
    data: {
      exerciseId,
      setNumber:   body.setNumber ?? count + 1,
      weightKg:    body.weightKg ?? null,
      reps:        body.reps ?? null,
      durationSec: body.durationSec ?? null,
      distanceM:   body.distanceM ?? null,
      rpe:         body.rpe ?? null,
      completed:   body.completed ?? false,
      completedAt: body.completed ? new Date() : null,
    },
  });
  return NextResponse.json(set, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { sessionId, id: exerciseId } = await params;

  const session = await prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as {
    setId: string;
    weightKg?: number;
    reps?: number;
    durationSec?: number;
    rpe?: number;
    completed?: boolean;
  };

  const set = await prisma.exerciseSet.update({
    where: { id: body.setId },
    data: {
      weightKg:    body.weightKg ?? undefined,
      reps:        body.reps ?? undefined,
      durationSec: body.durationSec ?? undefined,
      rpe:         body.rpe ?? undefined,
      completed:   body.completed ?? undefined,
      completedAt: body.completed ? new Date() : undefined,
    },
  });
  return NextResponse.json(set);
}
