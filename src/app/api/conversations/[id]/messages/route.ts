import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId },
  });
  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where:   { conversationId: id, role: { in: ['USER', 'ASSISTANT'] } },
    orderBy: { createdAt: 'asc' },
    take:    60,
    select:  { role: true, content: true, displayContent: true },
  });

  return NextResponse.json(
    messages.map((m) => ({
      role:    m.role === 'USER' ? 'user' : 'assistant',
      content: (m.displayContent ?? m.content) || '',
    })),
  );
}
