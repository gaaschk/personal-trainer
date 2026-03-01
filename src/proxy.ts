import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session     = req.auth;
  const pathname    = nextUrl.pathname;

  const isAppRoute  = pathname.startsWith('/dashboard') ||
                      pathname.startsWith('/chat') ||
                      pathname.startsWith('/profile') ||
                      pathname.startsWith('/plan') ||
                      pathname.startsWith('/workout') ||
                      pathname.startsWith('/progress');
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  if (isAppRoute && !session?.user) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && session?.user) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
