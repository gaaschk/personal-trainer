import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/auth';
import { getAnthropicClient } from '@/lib/ai/client';
import { getSetting } from '@/lib/settings';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildTrainerTools } from '@/lib/ai/tools';
import { buildClaudeContext, maybeSummarize } from '@/lib/ai/context-manager';
import {
  handleUpdateProfile,
  handleGenerateTrainingPlan,
  handleLogWorkout,
  handleScheduleWorkout,
  handleUpdateEquipment,
  handleGetProgress,
  handleGetWeather,
  type TrainingPlanInput,
} from '@/lib/ai/tool-handlers';
import { prisma } from '@/lib/prisma';

export const dynamic    = 'force-dynamic';
export const maxDuration = 120;

// ── NDJSON helpers ────────────────────────────────────────────────────────────
function encode(obj: object) {
  return new TextEncoder().encode(JSON.stringify(obj) + '\n');
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const raw = JSON.parse(await req.text() || '{}') as Record<string, unknown>;

  // Support legacy format: { messages: [{ role, content }] }
  // The legacy client sends full conversation history in each request.
  type LegacyMsg = { role: string; content: string };
  const legacyMessages = Array.isArray(raw.messages)
    ? (raw.messages as LegacyMsg[])
    : undefined;

  let message: string = (raw.message as string) ?? '';
  if (!message && legacyMessages) {
    message = legacyMessages.filter((m) => m.role === 'user').at(-1)?.content ?? '';
  }

  const body = {
    message,
    conversationId: raw.conversationId as string | undefined,
    attachmentIds:      Array.isArray(raw.attachmentIds)      ? (raw.attachmentIds as string[])      : undefined,
    imageAttachmentIds: Array.isArray(raw.imageAttachmentIds) ? (raw.imageAttachmentIds as string[]) : undefined,
  };

  if (!body.message?.trim() && !body.attachmentIds?.length && !body.imageAttachmentIds?.length) {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  const model = (await getSetting('ANTHROPIC_MODEL')) ?? 'claude-sonnet-4-6';
  const tools = buildTrainerTools();

  const stream = new ReadableStream({
    async start(controller) {
      // Heartbeat prevents 524 timeouts on Lightsail
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encode({ t: 'k' })); } catch { /* stream closed */ }
      }, 5000);

      try {
        // ── 1. Load or create conversation ───────────────────────────────────
        let conversationId = body.conversationId;

        if (!conversationId) {
          const conv = await prisma.conversation.create({
            data: { userId, title: body.message.slice(0, 80) },
          });
          conversationId = conv.id;
          controller.enqueue(encode({ t: 'ci', v: conversationId }));
        }

        // ── 2. Fetch attachment content by ID ────────────────────────────────
        const textAttachments = body.attachmentIds?.length
          ? await prisma.fileAttachment.findMany({
              where: { id: { in: body.attachmentIds }, userId },
            })
          : [];

        const imageAttachments = body.imageAttachmentIds?.length
          ? await prisma.fileAttachment.findMany({
              where: { id: { in: body.imageAttachmentIds }, userId },
            })
          : [];

        // ── 3. Build full user content (embed text attachments) ───────────────
        const displayText = body.message || (
          (textAttachments.length + imageAttachments.length) === 1
            ? `Please review the attached ${[...textAttachments, ...imageAttachments][0].kind === 'pdf' ? 'document' : 'file'}: ${[...textAttachments, ...imageAttachments][0].name}`
            : `Please review the ${textAttachments.length + imageAttachments.length} attached files.`
        );

        let fullContent = displayText;
        for (const att of textAttachments) {
          const label = att.kind === 'pdf'
            ? `[Attached PDF: "${att.name}"${att.pages ? ` — ${att.pages} pages` : ''}]`
            : `[Attached file: "${att.name}"]`;
          fullContent = `${label}\n\`\`\`\n${att.content}\n\`\`\`\n\n${fullContent}`;
        }

        // ── 4. Build new user content block (images become vision blocks) ─────
        let newUserContent: string | Anthropic.ContentBlockParam[];
        if (imageAttachments.length > 0) {
          const contentBlocks: Anthropic.ContentBlockParam[] = imageAttachments.map((img) => ({
            type: 'image' as const,
            source: {
              type:       'base64' as const,
              media_type: (img.mimeType ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data:       img.content,
            },
          }));
          contentBlocks.push({ type: 'text', text: fullContent });
          newUserContent = contentBlocks;
        } else {
          newUserContent = fullContent;
        }

        // ── 5. Build sliding-window context + system prompt ───────────────────
        let claudeMessages: Anthropic.MessageParam[];
        let systemSuffix = '';
        const baseSystem = await buildSystemPrompt(userId);

        if (legacyMessages && legacyMessages.length > 0) {
          // Legacy format: full history supplied by client — use it directly
          claudeMessages = legacyMessages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
          // Ensure the last message is from the user (it should already be)
          if (claudeMessages.at(-1)?.role !== 'user') {
            claudeMessages.push({ role: 'user', content: newUserContent });
          }
        } else {
          ({ messages: claudeMessages, systemSuffix } = await buildClaudeContext(conversationId, newUserContent));
        }

        const system = baseSystem + systemSuffix;

        // ── 6. Tool loop ──────────────────────────────────────────────────────
        const MAX_ITERATIONS = 8;
        let iterations = 0;
        let assistantText = '';

        while (iterations < MAX_ITERATIONS) {
          iterations++;

          const response = await (await getAnthropicClient()).messages.create({
            model,
            max_tokens: 4096,
            system,
            tools,
            messages: claudeMessages,
          });

          if (response.stop_reason === 'end_turn') {
            assistantText = response.content
              .filter((b) => b.type === 'text')
              .map((b) => (b as { type: 'text'; text: string }).text)
              .join('');
            controller.enqueue(encode({ t: 'd', v: assistantText }));
            break;
          }

          if (response.stop_reason === 'tool_use') {
            const toolBlocks = response.content.filter(
              (b) => b.type === 'tool_use',
            ) as Anthropic.ToolUseBlock[];
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const tb of toolBlocks) {
              const input = tb.input as Record<string, unknown>;

              const statusMap: Record<string, string> = {
                update_profile:          'Updating your profile…',
                generate_training_plan:  'Generating training plan…',
                log_workout:             'Logging your workout…',
                schedule_workout:        'Scheduling workout…',
                update_equipment:        'Updating equipment…',
                get_progress:            'Fetching your progress data…',
                get_weather:             'Checking the weather…',
              };
              controller.enqueue(encode({ t: 's', v: statusMap[tb.name] ?? `Running ${tb.name}…` }));

              let result: unknown;
              try {
                switch (tb.name) {
                  case 'update_profile':
                    result = await handleUpdateProfile(userId, input as Parameters<typeof handleUpdateProfile>[1]);
                    break;

                  case 'generate_training_plan': {
                    result = await handleGenerateTrainingPlan(userId, input as unknown as TrainingPlanInput);
                    if ((result as { success: boolean; planId?: string }).planId) {
                      const plan = await prisma.trainingPlan.findUnique({
                        where: { id: (result as { planId: string }).planId },
                        include: {
                          planDays: {
                            include: { plannedExercises: { orderBy: { order: 'asc' } } },
                            orderBy: { order: 'asc' },
                          },
                        },
                      });
                      if (plan) {
                        controller.enqueue(encode({ t: 'c', v: JSON.stringify({ type: 'workout_plan', plan }) }));
                      }
                    }
                    break;
                  }

                  case 'log_workout':
                    result = await handleLogWorkout(userId, input as Parameters<typeof handleLogWorkout>[1]);
                    break;

                  case 'schedule_workout':
                    result = await handleScheduleWorkout(userId, input as Parameters<typeof handleScheduleWorkout>[1]);
                    break;

                  case 'update_equipment':
                    result = await handleUpdateEquipment(userId, input as Parameters<typeof handleUpdateEquipment>[1]);
                    break;

                  case 'get_progress':
                    result = await handleGetProgress(userId, input as { days?: number });
                    break;

                  case 'get_weather':
                    result = await handleGetWeather(userId);
                    break;

                  default:
                    result = { error: 'Unknown tool' };
                }
              } catch (err) {
                result = { error: err instanceof Error ? err.message : 'Tool error' };
              }

              toolResults.push({
                type:        'tool_result',
                tool_use_id: tb.id,
                content:     JSON.stringify(result),
              });
            }

            claudeMessages.push({ role: 'assistant', content: response.content });
            claudeMessages.push({ role: 'user',      content: toolResults });
          }
        }

        // ── 7. Save messages to DB ────────────────────────────────────────────
        await prisma.message.createMany({
          data: [
            {
              conversationId,
              role:           'USER',
              content:        fullContent,
              displayContent: displayText !== fullContent ? displayText : null,
            },
            {
              conversationId,
              role:    'ASSISTANT',
              content: assistantText,
            },
          ],
        });

        // Update conversation timestamp + conditionally summarize old messages
        await prisma.conversation.update({
          where: { id: conversationId },
          data:  { updatedAt: new Date() },
        });

        // Non-fatal: summarization failure is logged but doesn't break the response
        await maybeSummarize(conversationId);

        controller.enqueue(encode({ t: 'x' }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Chat error';
        controller.enqueue(encode({ t: 'e', v: msg }));
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  });
}
