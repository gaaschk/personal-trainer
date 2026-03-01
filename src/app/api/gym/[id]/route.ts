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

  const gym = await prisma.gymMembership.findFirst({ where: { id, profileId: profile.id } });
  if (!gym) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.gymMembership.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id } = await params;

  const profile = await prisma.healthProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const gym = await prisma.gymMembership.findFirst({ where: { id, profileId: profile.id } });
  if (!gym) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as {
    gymName?: string; address?: string; notes?: string; equipment?: string; active?: boolean;
  };
  const updated = await prisma.gymMembership.update({
    where: { id },
    data: {
      gymName:   body.gymName ?? undefined,
      address:   body.address ?? undefined,
      notes:     body.notes ?? undefined,
      equipment: body.equipment ?? undefined,
      active:    body.active ?? undefined,
    },
  });
  return NextResponse.json(updated);
}
