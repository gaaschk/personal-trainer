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
  const injuries = await prisma.injury.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(injuries);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as { description: string; tag?: string };
  if (!body.description) return NextResponse.json({ error: 'description required' }, { status: 400 });

  const profile = await getOrCreateProfile(userId);
  const injury = await prisma.injury.create({
    data: {
      profileId:   profile.id,
      description: body.description,
      tag:         body.tag ?? body.description.toLowerCase().replace(/\s+/g, '-').substring(0, 50),
      active:      true,
    },
  });
  return NextResponse.json(injury, { status: 201 });
}
