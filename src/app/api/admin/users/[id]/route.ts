import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json() as { role?: string };

  if (!body.role || !['USER', 'ADMIN'].includes(body.role)) {
    return NextResponse.json({ error: 'role must be USER or ADMIN' }, { status: 400 });
  }

  if (id === auth.userId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: body.role as 'USER' | 'ADMIN' },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json(user);
}
