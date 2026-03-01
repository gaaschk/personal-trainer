# AI Personal Trainer — Claude Code Notes

## Stack
- **Framework:** Next.js 15 (App Router) + TypeScript
- **Auth:** next-auth@^5.0.0-beta.30 (Credentials + Google OAuth)
- **ORM:** Prisma 6 + PostgreSQL
- **AI:** @anthropic-ai/sdk — claude-sonnet-4-6, NDJSON streaming, tool use
- **Styling:** Tailwind CSS 3 (dark theme, slate-950 background)

## Key Architecture Decisions

### Auth split (Edge safety)
- `src/auth.config.ts` — Edge-safe, used by middleware
- `src/auth.ts` — Node.js, PrismaAdapter + Credentials + Google
- `src/lib/auth.ts` — `requireAuth()` helper for API routes

### AI Chat (NDJSON streaming)
- `src/app/api/chat/route.ts` — POST handler with MAX_ITERATIONS=8 tool loop
- NDJSON events: `{ t: 'k' }` heartbeat, `{ t: 's' }` status, `{ t: 'd' }` text, `{ t: 'c' }` card, `{ t: 'e' }` error, `{ t: 'x' }` done
- System prompt rebuilt fresh each request from DB (no caching)
- Tool handlers write to DB immediately

### Tools (6 total)
1. `update_profile` — age, weight, height, fitness level, injury
2. `generate_training_plan` — archives existing, creates new, emits `{ t: 'c' }` card
3. `log_workout` — records completed session
4. `schedule_workout` — creates PLANNED session
5. `update_equipment` — add/remove home gear or gym
6. `get_progress` — body metrics + PRs

## Commands

```bash
# Development
npm run dev

# Database
npx prisma migrate dev --name <name>
npx prisma studio

# Production deploy
./restart.sh
```

## Environment Variables
See `.env.local.example`

## Project Structure
```
src/
├── app/
│   ├── (auth)/login + signup
│   ├── (app)/dashboard, chat, profile, plan, workout, progress
│   └── api/ — REST + chat streaming
├── components/
│   ├── ui/           — Button, Card, Input, Badge, Spinner, Modal
│   ├── chat/         — ChatInterface, MessageBubble, WorkoutPlanCard
│   ├── workout/      — ActiveWorkoutTracker, SetRow, RestTimer
│   ├── progress/     — WeightChart, StrengthChart, VolumeChart
│   ├── profile/      — ProfileForm, InjuryTags, GoalEditor, EquipmentPicker
│   └── layout/       — Sidebar, BottomNav
├── lib/
│   ├── ai/           — client, system-prompt, tools, tool-handlers
│   ├── prisma.ts     — singleton
│   ├── auth.ts       — requireAuth()
│   ├── metrics.ts    — BMI calc, volume
│   └── utils.ts      — cn(), formatDate()
└── types/index.ts
```
