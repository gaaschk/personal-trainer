import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { hashTokenPublic } from '@/lib/mobile-auth';

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  // Extract raw token from Authorization header to delete that specific row
  const authHeader = req.headers.get('authorization') ?? '';
  const raw = authHeader.replace(/^Bearer\s+/i, '');
  if (!raw) {
    return NextResponse.json({ error: 'No token provided' }, { status: 400 });
  }

  const { prisma } = await import('@/lib/prisma');
  await prisma.mobileToken.deleteMany({
    where: { tokenHash: hashTokenPublic(raw), userId: auth.userId },
  });

  return NextResponse.json({ ok: true });
}
