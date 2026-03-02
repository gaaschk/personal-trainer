import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { issueMobileToken } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { searchParams } = new URL(req.url);
  const state      = searchParams.get('state')      ?? '';
  const deviceName = searchParams.get('deviceName') ?? undefined;
  const platform   = searchParams.get('platform')   ?? undefined;

  const { token } = await issueMobileToken(
    session.user.id,
    deviceName || undefined,
    platform   || undefined,
  );

  const deepLink =
    `ptmobile://auth` +
    `?token=${encodeURIComponent(token)}` +
    `&email=${encodeURIComponent(session.user.email)}` +
    `&state=${encodeURIComponent(state)}`;

  return NextResponse.redirect(deepLink);
}
