import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/auth';
import { anthropic } from '@/lib/ai/client';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { buildTrainerTools } from '@/lib/ai/tools';
import {
  handleUpdateProfile,
  handleGenerateTrainingPlan,
  handleLogWorkout,
  handleScheduleWorkout,
  handleUpdateEquipment,
  handleGetProgress,
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

  const body = await req.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    conversationId?: string;
  };

  if (!body.messages?.length) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  const model   = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  const tools   = buildTrainerTools();

  const stream = new ReadableStream({
    async start(controller) {
      // Heartbeat prevents 524 timeouts on Lightsail
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encode({ t: 'k' })); } catch { /* stream closed */ }
      }, 5000);

      try {
        // Build system prompt fresh from DB
        const system = await buildSystemPrompt(userId);

        const messages: Anthropic.MessageParam[] = body.messages.map((m) => ({
          role:    m.role,
          content: m.content,
        }));

        const MAX_ITERATIONS = 8;
        let iterations = 0;

        while (iterations < MAX_ITERATIONS) {
          iterations++;

          const response = await anthropic.messages.create({
            model,
            max_tokens: 4096,
            system,
            tools,
            messages,
          });

          if (response.stop_reason === 'end_turn') {
            const text = response.content
              .filter((b) => b.type === 'text')
              .map((b) => (b as { type: 'text'; text: string }).text)
              .join('');
            controller.enqueue(encode({ t: 'd', v: text }));
            break;
          }

          if (response.stop_reason === 'tool_use') {
            const toolBlocks = response.content.filter(
              (b) => b.type === 'tool_use',
            ) as Anthropic.ToolUseBlock[];
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const tb of toolBlocks) {
              const input = tb.input as Record<string, unknown>;

              // Emit status to client
              const statusMap: Record<string, string> = {
                update_profile:          'Updating your profile…',
                generate_training_plan:  'Generating training plan…',
                log_workout:             'Logging your workout…',
                schedule_workout:        'Scheduling workout…',
                update_equipment:        'Updating equipment…',
                get_progress:            'Fetching your progress data…',
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
                    // Emit rich card for the new plan
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

            // Add assistant turn + tool results to message history
            messages.push({ role: 'assistant', content: response.content });
            messages.push({ role: 'user',      content: toolResults });
          }
        }

        // Save conversation to DB if conversationId provided
        if (body.conversationId) {
          const lastUser    = body.messages.at(-1);
          const allMessages = messages.filter((m) => typeof m.content === 'string');
          const lastAssist  = allMessages.findLast((m) => m.role === 'assistant');
          if (lastUser && lastAssist) {
            await prisma.message.createMany({
              data: [
                {
                  conversationId: body.conversationId,
                  role:           'USER',
                  content:        lastUser.content as string,
                },
                {
                  conversationId: body.conversationId,
                  role:           'ASSISTANT',
                  content:        lastAssist.content as string,
                },
              ],
            });
          }
        }

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
