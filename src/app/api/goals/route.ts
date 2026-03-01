import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getOrCreateProfile(userId: string) {
  return prisma.healthProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const profile = await getOrCreateProfile(userId);
  const goals = await prisma.goal.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as {
    type: string;
    title: string;
    targetDate?: string;
    seasonStart?: string;
    seasonEnd?: string;
    active?: boolean;
  };
  if (!body.type || !body.title) {
    return NextResponse.json({ error: 'type and title required' }, { status: 400 });
  }

  const profile = await getOrCreateProfile(userId);
  const goal = await prisma.goal.create({
    data: {
      profileId:   profile.id,
      type:        body.type as 'MAINTENANCE' | 'EVENT' | 'SEASONAL',
      title:       body.title,
      targetDate:  body.targetDate ? new Date(body.targetDate) : null,
      seasonStart: body.seasonStart ? new Date(body.seasonStart) : null,
      seasonEnd:   body.seasonEnd ? new Date(body.seasonEnd) : null,
      active:      body.active ?? true,
    },
  });
  return NextResponse.json(goal, { status: 201 });
}
