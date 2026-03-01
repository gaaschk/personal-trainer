import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Verifies the request has a valid Auth.js session.
 * Returns { userId, email } on success, or NextResponse 401 on failure.
 */
export async function requireAuth(): Promise<
  { userId: string; email: string } | NextResponse
> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  return {
    userId: session.user.id,
    email:  session.user.email ?? '',
  };
}
