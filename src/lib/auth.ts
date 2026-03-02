import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Verifies the request has a valid Auth.js session.
 * Returns { userId, email, role } on success, or NextResponse 401 on failure.
 */
export async function requireAuth(): Promise<
  { userId: string; email: string; role: string } | NextResponse
> {
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
