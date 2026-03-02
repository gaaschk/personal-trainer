import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ChatInterface from '@/components/chat/ChatInterface';

export const metadata = { title: 'AI Coach — AI Trainer' };

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  // Load all conversations + most recent conversation's messages
  const [allConversations, recentConversation] = await Promise.all([
    prisma.conversation.findMany({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
      select:  { id: true, title: true, updatedAt: true },
    }),
    prisma.conversation.findFirst({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          where:   { role: { in: ['USER', 'ASSISTANT'] } },
          orderBy: { createdAt: 'asc' },
          take:    60,
        },
      },
    }),
  ]);

  const initialMessages = recentConversation?.messages.map((m) => ({
    role:    m.role === 'USER' ? ('user' as const) : ('assistant' as const),
    content: (m.displayContent ?? m.content) || '',
  })) ?? [];

  const conversations = allConversations.map((c) => ({
    id:        c.id,
    title:     c.title,
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <div className="h-screen overflow-hidden">
      <ChatInterface
        conversationId={recentConversation?.id}
        initialMessages={initialMessages}
        conversations={conversations}
      />
    </div>
  );
}
