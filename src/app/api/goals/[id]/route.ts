import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id } = await params;

  const profile = await prisma.healthProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const goal = await prisma.goal.findFirst({ where: { id, profileId: profile.id } });
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.goal.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id } = await params;

  const profile = await prisma.healthProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const goal = await prisma.goal.findFirst({ where: { id, profileId: profile.id } });
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as {
    type?: string; title?: string; targetDate?: string;
    seasonStart?: string; seasonEnd?: string; active?: boolean;
  };
  const updated = await prisma.goal.update({
    where: { id },
    data: {
      type:        (body.type as 'MAINTENANCE' | 'EVENT' | 'SEASONAL') ?? undefined,
      title:       body.title ?? undefined,
      targetDate:  body.targetDate !== undefined ? (body.targetDate ? new Date(body.targetDate) : null) : undefined,
      seasonStart: body.seasonStart !== undefined ? (body.seasonStart ? new Date(body.seasonStart) : null) : undefined,
      seasonEnd:   body.seasonEnd !== undefined ? (body.seasonEnd ? new Date(body.seasonEnd) : null) : undefined,
      active:      body.active ?? undefined,
    },
  });
  return NextResponse.json(updated);
}
