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

  const injury = await prisma.injury.findFirst({ where: { id, profileId: profile.id } });
  if (!injury) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.injury.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id } = await params;

  const profile = await prisma.healthProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const injury = await prisma.injury.findFirst({ where: { id, profileId: profile.id } });
  if (!injury) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json() as { active?: boolean; description?: string };
  const updated = await prisma.injury.update({
    where: { id },
    data: {
      active:      body.active ?? undefined,
      description: body.description ?? undefined,
    },
  });
  return NextResponse.json(updated);
}
