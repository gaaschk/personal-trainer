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
  const items = await prisma.equipmentItem.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { name: string; category?: string; notes?: string };
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const profile = await getOrCreateProfile(userId);
  const item = await prisma.equipmentItem.create({
    data: {
      profileId: profile.id,
      name:     body.name,
      category: body.category ?? null,
      notes:    body.notes ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
