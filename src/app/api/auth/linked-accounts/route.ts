import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/auth/linked-accounts
// Returns which OAuth providers are linked to the current user's account.
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const accounts = await prisma.account.findMany({
    where:  { userId },
    select: { provider: true },
  });

  // Also check whether the user has a password (so we know if credentials login is available)
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { password: true },
  });

  return NextResponse.json({
    providers:       accounts.map((a) => a.provider),
    hasPassword:     !!user?.password,
  });
}

// DELETE /api/auth/linked-accounts?provider=google
// Unlinks an OAuth provider. Blocked if it would leave the account with no sign-in method.
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const provider = req.nextUrl.searchParams.get('provider');
  if (!provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });

  const [accounts, user] = await Promise.all([
    prisma.account.findMany({ where: { userId }, select: { provider: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { password: true } }),
  ]);

  const otherAccounts = accounts.filter((a) => a.provider !== provider);
  const hasPassword   = !!user?.password;

  if (otherAccounts.length === 0 && !hasPassword) {
    return NextResponse.json(
      { error: 'Cannot unlink — this is your only sign-in method. Set a password first.' },
      { status: 400 },
    );
  }

  await prisma.account.deleteMany({ where: { userId, provider } });
  return NextResponse.json({ ok: true });
}
