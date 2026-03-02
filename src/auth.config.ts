import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe Auth.js config — no Node.js-only imports.
 * Used by middleware (Edge Runtime) and spread into the full auth.ts config.
 */
export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'USER';
      }
      return token;
    },
    session({ session, token }) {
      if (!token?.id) return session;
      session.user.id = token.id as string;
      session.user.role = (token.role as string) ?? 'USER';
      return session;
    },
  },
  providers: [],
};
