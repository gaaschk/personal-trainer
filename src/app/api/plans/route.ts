import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const profile = await prisma.healthProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json([]);

  const plans = await prisma.trainingPlan.findMany({
    where: { profileId: profile.id },
    include: {
      planDays: {
        include: { plannedExercises: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(plans);
}
