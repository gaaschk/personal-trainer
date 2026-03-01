import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

type Params = { params: Promise<{ planId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { planId } = await params;

  const profile = await prisma.healthProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, profileId: profile.id },
    include: {
      planDays: {
        include: { plannedExercises: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { planId } = await params;

  const profile = await prisma.healthProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const plan = await prisma.trainingPlan.findFirst({ where: { id: planId, profileId: profile.id } });
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as { status?: string; title?: string };
  const updated = await prisma.trainingPlan.update({
    where: { id: planId },
    data: {
      status: (body.status as 'ACTIVE' | 'ARCHIVED') ?? undefined,
      title:  body.title ?? undefined,
    },
  });
  return NextResponse.json(updated);
}
