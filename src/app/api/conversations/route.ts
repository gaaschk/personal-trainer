import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const conversations = await prisma.conversation.findMany({
    where:   { userId },
    orderBy: { updatedAt: 'desc' },
    select:  { id: true, title: true, updatedAt: true },
  });

  return NextResponse.json(conversations);
}
