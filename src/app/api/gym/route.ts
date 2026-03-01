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
  const gyms = await prisma.gymMembership.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(gyms);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as {
    gymName: string;
    address?: string;
    notes?: string;
    equipment?: string;
    active?: boolean;
  };
  if (!body.gymName) return NextResponse.json({ error: 'gymName required' }, { status: 400 });

  const profile = await getOrCreateProfile(userId);
  const gym = await prisma.gymMembership.create({
    data: {
      profileId: profile.id,
      gymName:   body.gymName,
      address:   body.address ?? null,
      notes:     body.notes ?? null,
      equipment: body.equipment ?? null,
      active:    body.active ?? true,
    },
  });
  return NextResponse.json(gym, { status: 201 });
}
