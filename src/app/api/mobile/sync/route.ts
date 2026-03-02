import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_PER_TYPE = 500;

interface ActivityItem {
  date: string;
  steps?: number;
  activeCalories?: number;
  exerciseMinutes?: number;
  source?: string;
}

interface VitalsItem {
  date: string;
  restingHR?: number;
  hrvMs?: number;
  vo2MaxMl?: number;
  spo2Pct?: number;
  source?: string;
}

interface SleepItem {
  startTime: string;
  endTime: string;
  durationHrs: number;
  efficiencyPct?: number;
  source?: string;
  deviceId?: string;
}

interface BodyItem {
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  notes?: string;
}

interface WorkoutItem {
  startTime: string;
  endTime: string;
  activityType: string;
  title?: string;
  durationMin?: number;
  distanceM?: number;
  caloriesBurned?: number;
  avgHR?: number;
  source?: string;
  deviceId?: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const body = await req.json() as {
    activity?: ActivityItem[];
    vitals?: VitalsItem[];
    sleep?: SleepItem[];
    body?: BodyItem[];
    workouts?: WorkoutItem[];
  };

  // Reject arrays that are too large
  for (const [key, arr] of Object.entries(body)) {
    if (Array.isArray(arr) && arr.length > MAX_PER_TYPE) {
      return NextResponse.json(
        { error: `${key} array exceeds maximum of ${MAX_PER_TYPE} items` },
        { status: 400 },
      );
    }
  }

  const counts = { activity: 0, vitals: 0, sleep: 0, body: 0, workouts: 0 };
  const cursorDates: Record<string, Date> = {};

  // ── activity ─────────────────────────────────────────────────────────────
  if (body.activity?.length) {
    for (const item of body.activity) {
      const date = new Date(item.date);
      await prisma.dailyActivity.upsert({
        where:  { userId_date: { userId, date } },
        create: { userId, date, steps: item.steps ?? null, activeCalories: item.activeCalories ?? null, exerciseMinutes: item.exerciseMinutes ?? null, source: item.source ?? null },
        update: { steps: item.steps ?? null, activeCalories: item.activeCalories ?? null, exerciseMinutes: item.exerciseMinutes ?? null, source: item.source ?? null },
      });
      if (!cursorDates.activity || date > cursorDates.activity) cursorDates.activity = date;
    }
    counts.activity = body.activity.length;
  }

  // ── vitals ────────────────────────────────────────────────────────────────
  if (body.vitals?.length) {
    for (const item of body.vitals) {
      const date = new Date(item.date);
      await prisma.vitals.upsert({
        where:  { userId_date: { userId, date } },
        create: { userId, date, restingHR: item.restingHR ?? null, hrvMs: item.hrvMs ?? null, vo2MaxMl: item.vo2MaxMl ?? null, spo2Pct: item.spo2Pct ?? null, source: item.source ?? null },
        update: { restingHR: item.restingHR ?? null, hrvMs: item.hrvMs ?? null, vo2MaxMl: item.vo2MaxMl ?? null, spo2Pct: item.spo2Pct ?? null, source: item.source ?? null },
      });
      if (!cursorDates.vitals || date > cursorDates.vitals) cursorDates.vitals = date;
    }
    counts.vitals = body.vitals.length;
  }

  // ── sleep ─────────────────────────────────────────────────────────────────
  if (body.sleep?.length) {
    for (const item of body.sleep) {
      const startTime = new Date(item.startTime);
      await prisma.sleepLog.upsert({
        where:  { userId_startTime: { userId, startTime } },
        create: { userId, startTime, endTime: new Date(item.endTime), durationHrs: item.durationHrs, efficiencyPct: item.efficiencyPct ?? null, source: item.source ?? null, deviceId: item.deviceId ?? null },
        update: { endTime: new Date(item.endTime), durationHrs: item.durationHrs, efficiencyPct: item.efficiencyPct ?? null, source: item.source ?? null, deviceId: item.deviceId ?? null },
      });
      if (!cursorDates.sleep || startTime > cursorDates.sleep) cursorDates.sleep = startTime;
    }
    counts.sleep = body.sleep.length;
  }

  // ── body metrics ──────────────────────────────────────────────────────────
  if (body.body?.length) {
    for (const item of body.body) {
      const date = new Date(item.date);
      await prisma.bodyMetric.upsert({
        where:  { userId_date: { userId, date } },
        create: { userId, date, weightKg: item.weightKg ?? null, bodyFatPct: item.bodyFatPct ?? null, notes: item.notes ?? null },
        update: { weightKg: item.weightKg ?? null, bodyFatPct: item.bodyFatPct ?? null, notes: item.notes ?? null },
      });
      if (!cursorDates.body || date > cursorDates.body) cursorDates.body = date;
    }
    counts.body = body.body.length;
  }

  // ── device workouts ───────────────────────────────────────────────────────
  if (body.workouts?.length) {
    for (const item of body.workouts) {
      const startTime = new Date(item.startTime);
      await prisma.deviceWorkout.upsert({
        where:  { userId_startTime: { userId, startTime } },
        create: { userId, startTime, endTime: new Date(item.endTime), activityType: item.activityType, title: item.title ?? null, durationMin: item.durationMin ?? null, distanceM: item.distanceM ?? null, caloriesBurned: item.caloriesBurned ?? null, avgHR: item.avgHR ?? null, source: item.source ?? null, deviceId: item.deviceId ?? null },
        update: { endTime: new Date(item.endTime), activityType: item.activityType, title: item.title ?? null, durationMin: item.durationMin ?? null, distanceM: item.distanceM ?? null, caloriesBurned: item.caloriesBurned ?? null, avgHR: item.avgHR ?? null, source: item.source ?? null, deviceId: item.deviceId ?? null },
      });
      if (!cursorDates.workouts || startTime > cursorDates.workouts) cursorDates.workouts = startTime;
    }
    counts.workouts = body.workouts.length;
  }

  // ── update SyncCursor for each synced type ────────────────────────────────
  const updatedCursors: Record<string, string | null> = { activity: null, vitals: null, sleep: null, body: null, workouts: null };
  for (const [dataType, lastSyncAt] of Object.entries(cursorDates)) {
    await prisma.syncCursor.upsert({
      where:  { userId_dataType: { userId, dataType } },
      create: { userId, dataType, lastSyncAt },
      update: { lastSyncAt },
    });
    updatedCursors[dataType] = lastSyncAt.toISOString();
  }

  // Fill in existing cursors for untouched types
  const existing = await prisma.syncCursor.findMany({ where: { userId } });
  for (const row of existing) {
    if (!cursorDates[row.dataType]) {
      updatedCursors[row.dataType] = row.lastSyncAt.toISOString();
    }
  }

  return NextResponse.json({ synced: counts, cursors: updatedCursors });
}
