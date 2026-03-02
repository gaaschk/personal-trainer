import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from './client';
import { prisma } from '@/lib/prisma';
import { getChatWindowSize, getChatSummaryTrigger } from './context-config';
import { getSetting } from '@/lib/settings';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DbMessage {
  id:          string;
  role:        'USER' | 'ASSISTANT' | 'TOOL';
  content:     string;
  summarized:  boolean;
}

export interface ClaudeContext {
  messages:     Anthropic.MessageParam[];
  systemSuffix: string; // appended to the base system prompt when a summary exists
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build the message array to send to Claude for this turn.
 *
 * - If total stored messages ≤ CHAT_WINDOW_SIZE: send them all verbatim.
 * - Otherwise: inject the rolling summary into systemSuffix and send only the
 *   most recent CHAT_WINDOW_SIZE messages (starting at the first USER row so
 *   the array always begins with a user turn as the API requires).
 */
export async function buildClaudeContext(
  conversationId: string,
  newContent:     string | Anthropic.ContentBlockParam[],
): Promise<ClaudeContext> {
  const chatWindowSize = await getChatWindowSize();

  const [allMessages, conversation] = await Promise.all([
    prisma.message.findMany({
      where:   { conversationId },
      orderBy: { createdAt: 'asc' },
      select:  { id: true, role: true, content: true, summarized: true },
    }),
    prisma.conversation.findUnique({
      where:  { id: conversationId },
      select: { summary: true },
    }),
  ]);

  // Build windowed message list
  let windowedRows: DbMessage[];
  if (allMessages.length <= chatWindowSize) {
    windowedRows = allMessages;
  } else {
    const raw = allMessages.slice(-chatWindowSize);
    // Claude requires the first message to be from the user
    const firstUser = raw.findIndex((m) => m.role === 'USER');
    windowedRows = firstUser > 0 ? raw.slice(firstUser) : raw;
  }

  // Convert to Anthropic MessageParam (only USER/ASSISTANT rows are stored)
  const claudeMessages: Anthropic.MessageParam[] = windowedRows
    .filter((m) => m.role !== 'TOOL')
    .map((m) => ({
      role:    m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    }));

  // Append the current user turn
  claudeMessages.push({ role: 'user', content: newContent });

  // Build system suffix from rolling summary
  const systemSuffix = conversation?.summary
    ? `\n\n## Earlier Conversation Summary\nThe following covers exchanges that are no longer in the active context window:\n\n${conversation.summary}`
    : '';

  return { messages: claudeMessages, systemSuffix };
}

/**
 * After saving new messages to DB, check whether to summarize older ones.
 *
 * Fires synchronously — adds ~1–2 s of latency but only when the threshold is
 * crossed (roughly every 5 turns after the first summarization).  Non-fatal:
 * errors are logged but do not surface to the user.
 */
export async function maybeSummarize(conversationId: string): Promise<void> {
  try {
    const chatSummaryTrigger = await getChatSummaryTrigger();
    const chatWindowSize = await getChatWindowSize();

    const [totalCount, conversation] = await Promise.all([
      prisma.message.count({ where: { conversationId } }),
      prisma.conversation.findUnique({
        where:  { id: conversationId },
        select: { summary: true },
      }),
    ]);

    if (totalCount <= chatSummaryTrigger) return;

    // Find messages outside the current window that haven't been summarized yet
    const allMessages = await prisma.message.findMany({
      where:   { conversationId },
      orderBy: { createdAt: 'asc' },
      select:  { id: true, role: true, content: true, summarized: true },
    });

    const preWindowMessages = allMessages.slice(0, -chatWindowSize);
    const unsummarized = preWindowMessages.filter((m) => !m.summarized);

    if (unsummarized.length === 0) return;

    const newSummary = await generateSummary(unsummarized, conversation?.summary ?? null);
    if (!newSummary) return;

    const now = new Date();
    await prisma.$transaction([
      prisma.message.updateMany({
        where: { id: { in: unsummarized.map((m) => m.id) } },
        data:  { summarized: true, summarizedAt: now },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data:  { summary: newSummary, summarizedAt: now },
      }),
    ]);
  } catch (err) {
    console.error('[context-manager] summarization failed (non-fatal):', err);
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Truncate very long message content before feeding it to the summarizer.
 * PDF-embedded messages can be 80k chars; we only need a representative excerpt.
 */
function truncateForSummary(content: string, maxChars = 2000): string {
  if (content.length <= maxChars) return content;
  const slice = content.slice(0, maxChars);
  const lastBreak = slice.lastIndexOf('\n');
  return (lastBreak > maxChars * 0.8 ? slice.slice(0, lastBreak) : slice)
    + ' […truncated…]';
}

async function generateSummary(
  messages:        DbMessage[],
  existingSummary: string | null,
): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role === 'USER' ? 'Client' : 'Coach'}: ${truncateForSummary(m.content)}`)
    .join('\n\n');

  const userContent = existingSummary
    ? `EXISTING SUMMARY (covers earlier exchanges):\n${existingSummary}\n\nNEW EXCHANGES TO INCORPORATE:\n${transcript}\n\nUpdate the summary to incorporate the new exchanges. Merge — do not just append.`
    : `CONVERSATION TRANSCRIPT:\n${transcript}\n\nWrite a concise summary of the above conversation.`;

  const model = (await getSetting('ANTHROPIC_MODEL')) ?? 'claude-sonnet-4-6';
  const client = await getAnthropicClient();

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: `You maintain a compressed conversation log for a personal training AI coach.
Summarize in 3–6 sentences, past tense, focusing on:
- Training plans or workouts discussed or created
- Injuries, limitations, or health updates
- Goals set or adjusted
- Progress metrics or milestones shared
- Key coaching decisions or commitments
Be specific (include numbers: weights, distances, reps when present).`,
    messages: [{ role: 'user', content: userContent }],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}
