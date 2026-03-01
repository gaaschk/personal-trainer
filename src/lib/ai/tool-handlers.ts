import { prisma } from '@/lib/prisma';

async function getOrCreateProfile(userId: string) {
  return prisma.healthProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

// ── update_profile ───────────────────────────────────────────────────────────
export async function handleUpdateProfile(
  userId: string,
  input: {
    age?: number;
    weightKg?: number;
    heightCm?: number;
    fitnessLevel?: string;
    notes?: string;
    addInjury?: string;
  },
) {
  const profile = await getOrCreateProfile(userId);

  // Update profile fields
  const updateData: Record<string, unknown> = {};
  if (input.age !== undefined)          updateData.age = input.age;
  if (input.weightKg !== undefined)     updateData.weightKg = input.weightKg;
  if (input.heightCm !== undefined)     updateData.heightCm = input.heightCm;
  if (input.fitnessLevel !== undefined) updateData.fitnessLevel = input.fitnessLevel;
  if (input.notes !== undefined)        updateData.notes = input.notes;

  if (Object.keys(updateData).length > 0) {
    await prisma.healthProfile.update({ where: { id: profile.id }, data: updateData });
  }

  // Add injury if provided
  if (input.addInjury) {
    const tag = input.addInjury.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 50);
    await prisma.injury.create({
      data: { profileId: profile.id, description: input.addInjury, tag, active: true },
    });
  }

  const fields: string[] = [];
  if (input.age)          fields.push(`age: ${input.age}`);
  if (input.weightKg)     fields.push(`weight: ${input.weightKg}kg`);
  if (input.heightCm)     fields.push(`height: ${input.heightCm}cm`);
  if (input.fitnessLevel) fields.push(`fitness level: ${input.fitnessLevel.toLowerCase()}`);
  if (input.notes)        fields.push('notes updated');
  if (input.addInjury)    fields.push(`injury added: ${input.addInjury}`);

  return { success: true, updated: fields };
}

// ── generate_training_plan ────────────────────────────────────────────────────
export interface TrainingPlanInput {
  title: string;
  description?: string;
  weeks?: number;
  days: {
    dayOfWeek: number;
    weekNumber?: number;
    focusArea: string;
    notes?: string;
    exercises?: {
      name: string;
      sets?: number;
      reps?: string;
      weight?: string;
      duration?: string;
      notes?: string;
    }[];
  }[];
}

export async function handleGenerateTrainingPlan(
  userId: string,
  input: TrainingPlanInput,
) {
  const profile = await getOrCreateProfile(userId);

  // Archive existing active plans
  await prisma.trainingPlan.updateMany({
    where: { profileId: profile.id, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });

  // Create new plan
  const plan = await prisma.trainingPlan.create({
    data: {
      profileId:   profile.id,
      title:       input.title,
      description: input.description ?? null,
      status:      'ACTIVE',
      rawJson:     JSON.stringify(input),
      planDays: {
        create: input.days.map((day, idx) => ({
          dayOfWeek:  day.dayOfWeek,
          weekNumber: day.weekNumber ?? 1,
          focusArea:  day.focusArea,
          notes:      day.notes ?? null,
          order:      idx,
          plannedExercises: day.exercises ? {
            create: day.exercises.map((ex, exIdx) => ({
              name:     ex.name,
              sets:     ex.sets ?? null,
              reps:     ex.reps ?? null,
              weight:   ex.weight ?? null,
              duration: ex.duration ?? null,
              notes:    ex.notes ?? null,
              order:    exIdx,
            })),
          } : undefined,
        })),
      },
    },
    include: {
      planDays: {
        include: { plannedExercises: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  return {
    success: true,
    planId:  plan.id,
    title:   plan.title,
    days:    plan.planDays.length,
    message: `Training plan "${plan.title}" created with ${plan.planDays.length} training days.`,
  };
}

// ── log_workout ───────────────────────────────────────────────────────────────
export async function handleLogWorkout(
  userId: string,
  input: {
    title: string;
    durationMin?: number;
    notes?: string;
    exercises?: {
      name: string;
      sets?: { reps?: number; weightKg?: number; durationSec?: number; distanceM?: number; rpe?: number }[];
    }[];
  },
) {
  const now = new Date();

  const session = await prisma.workoutSession.create({
    data: {
      userId,
      title:       input.title,
      status:      'COMPLETED',
      startedAt:   now,
      completedAt: now,
      durationMin: input.durationMin ?? null,
      notes:       input.notes ?? null,
      workoutExercises: input.exercises ? {
        create: input.exercises.map((ex, exIdx) => ({
          name:  ex.name,
          order: exIdx,
          sets: ex.sets ? {
            create: ex.sets.map((s, sIdx) => ({
              setNumber:   sIdx + 1,
              reps:        s.reps ?? null,
              weightKg:    s.weightKg ?? null,
              durationSec: s.durationSec ?? null,
              distanceM:   s.distanceM ?? null,
              rpe:         s.rpe ?? null,
              completed:   true,
              completedAt: now,
            })),
          } : undefined,
        })),
      } : undefined,
    },
  });

  return {
    success:   true,
    sessionId: session.id,
    message:   `Workout "${input.title}" logged successfully.`,
  };
}

// ── schedule_workout ──────────────────────────────────────────────────────────
export async function handleScheduleWorkout(
  userId: string,
  input: { title: string; scheduledAt: string; notes?: string },
) {
  const session = await prisma.workoutSession.create({
    data: {
      userId,
      title:       input.title,
      status:      'PLANNED',
      scheduledAt: new Date(input.scheduledAt),
      notes:       input.notes ?? null,
    },
  });

  return {
    success:   true,
    sessionId: session.id,
    message:   `Workout "${input.title}" scheduled.`,
  };
}

// ── update_equipment ──────────────────────────────────────────────────────────
export async function handleUpdateEquipment(
  userId: string,
  input: {
    addEquipment?: { name: string; category?: string }[];
    removeEquipmentNames?: string[];
    addGym?: { gymName: string; equipment?: string };
  },
) {
  const profile = await getOrCreateProfile(userId);
  const results: string[] = [];

  if (input.addEquipment?.length) {
    for (const eq of input.addEquipment) {
      await prisma.equipmentItem.create({
        data: { profileId: profile.id, name: eq.name, category: eq.category ?? null },
      });
      results.push(`Added: ${eq.name}`);
    }
  }

  if (input.removeEquipmentNames?.length) {
    for (const name of input.removeEquipmentNames) {
      await prisma.equipmentItem.deleteMany({
        where: { profileId: profile.id, name: { contains: name } },
      });
      results.push(`Removed: ${name}`);
    }
  }

  if (input.addGym) {
    await prisma.gymMembership.create({
      data: {
        profileId: profile.id,
        gymName:   input.addGym.gymName,
        equipment: input.addGym.equipment ?? null,
        active:    true,
      },
    });
    results.push(`Added gym: ${input.addGym.gymName}`);
  }

  return { success: true, changes: results };
}

// ── get_progress ──────────────────────────────────────────────────────────────
export async function handleGetProgress(userId: string, input: { days?: number }) {
  const days = input.days ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [metrics, sessions] = await Promise.all([
    prisma.bodyMetric.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    }),
    prisma.workoutSession.findMany({
      where: { userId, status: 'COMPLETED', completedAt: { gte: since } },
      orderBy: { completedAt: 'asc' },
      include: {
        workoutExercises: {
          include: { sets: { where: { completed: true } } },
          orderBy: { order: 'asc' },
        },
      },
    }),
  ]);

  // Compute PRs per exercise
  const prs: Record<string, { maxWeight: number; maxReps: number }> = {};
  for (const session of sessions) {
    for (const ex of session.workoutExercises) {
      if (!prs[ex.name]) prs[ex.name] = { maxWeight: 0, maxReps: 0 };
      for (const set of ex.sets) {
        if (set.weightKg && set.weightKg > prs[ex.name].maxWeight) {
          prs[ex.name].maxWeight = set.weightKg;
        }
        if (set.reps && set.reps > prs[ex.name].maxReps) {
          prs[ex.name].maxReps = set.reps;
        }
      }
    }
  }

  return {
    period: `${days} days`,
    workoutsCompleted: sessions.length,
    bodyMetrics: metrics.map((m) => ({
      date:       m.date.toISOString().split('T')[0],
      weightKg:   m.weightKg,
      bodyFatPct: m.bodyFatPct,
    })),
    exercisePRs: Object.entries(prs)
      .filter(([, v]) => v.maxWeight > 0 || v.maxReps > 0)
      .map(([name, v]) => ({ exercise: name, ...v }))
      .slice(0, 15),
    sessionsLog: sessions.slice(-10).map((s) => ({
      title:       s.title,
      date:        s.completedAt?.toISOString().split('T')[0],
      durationMin: s.durationMin,
    })),
  };
}
