import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Verifies the request has a valid session.
 * If `req` is provided and carries an `Authorization: Bearer <token>` header,
 * mobile bearer-token auth is attempted first.
 * Otherwise falls through to the standard Auth.js cookie session.
 * Returns { userId, email, role } on success, or NextResponse 401 on failure.
 */
export async function requireAuth(req?: NextRequest): Promise<
  { userId: string; email: string; role: string } | NextResponse
> {
  // ── Bearer token (mobile) ─────────────────────────────────────────────────
  const authHeader = req?.headers.get('authorization') ?? '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const raw = authHeader.slice(7).trim();
    try {
      const { verifyMobileToken } = await import('@/lib/mobile-auth');
      const userId = await verifyMobileToken(raw);
      const user = await prisma.user.findUnique({
        where:  { id: userId },
        select: { email: true, role: true },
      });
      if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
      return { userId, email: user.email, role: user.role };
    } catch {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }
  }

  // ── Cookie session (web) ──────────────────────────────────────────────────
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  return {
    userId: session.user.id,
    email:  session.user.email ?? '',
    role:   session.user.role ?? 'USER',
  };
}

/**
 * Verifies the request has a valid session AND the user has the ADMIN role.
 * Always performs a fresh DB lookup to prevent stale-JWT promotions/demotions.
 * Returns { userId, email, role } or NextResponse 401/403.
 */
export async function requireAdmin(): Promise<
  { userId: string; email: string; role: string } | NextResponse
> {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const user = await prisma.user.findUnique({
    where:  { id: authResult.userId },
    select: { role: true },
  });

  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return authResult;
}
