import { prisma } from '@/lib/prisma';
import { calculateBMI } from '@/lib/metrics';
import { getDayFullName, formatDateShort } from '@/lib/utils';

export async function buildSystemPrompt(userId: string): Promise<string> {
  const [user, profile, recentSessions, recentMetrics] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.healthProfile.findUnique({
      where: { userId },
      include: {
        injuries:       { where: { active: true }, orderBy: { createdAt: 'desc' } },
        goals:          { where: { active: true }, orderBy: { createdAt: 'desc' } },
        equipmentItems: { orderBy: { createdAt: 'asc' } },
        gymMemberships: { where: { active: true }, orderBy: { createdAt: 'asc' } },
        trainingPlans: {
          where: { status: 'ACTIVE' },
          include: {
            planDays: {
              include: { plannedExercises: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' },
            },
          },
          take: 1,
        },
      },
    }),
    prisma.workoutSession.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: {
        workoutExercises: {
          include: { sets: { where: { completed: true } } },
          orderBy: { order: 'asc' },
        },
      },
    }),
    prisma.bodyMetric.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 7,
    }),
  ]);

  const name = user?.name?.split(' ')[0] ?? user?.email ?? 'Client';
  const p = profile;

  // Profile section
  let profileSection = `## Client Profile\n`;
  if (p) {
    const bmi = p.weightKg && p.heightCm ? calculateBMI(p.weightKg, p.heightCm) : null;
    profileSection += `Name: ${name}\n`;
    if (p.age)          profileSection += `Age: ${p.age}\n`;
    if (p.weightKg)     profileSection += `Weight: ${p.weightKg} kg\n`;
    if (p.heightCm)     profileSection += `Height: ${p.heightCm} cm\n`;
    if (bmi)            profileSection += `BMI: ${bmi}\n`;
    profileSection += `Fitness Level: ${p.fitnessLevel.toLowerCase()}\n`;
    if (p.locationName) profileSection += `Location: ${p.locationName}\n`;
    if (p.notes)        profileSection += `Notes: ${p.notes}\n`;
  } else {
    profileSection += `Name: ${name}\nProfile not yet set up.\n`;
  }

  // Injuries section
  let injuriesSection = '';
  if (p?.injuries.length) {
    injuriesSection = `\n## Active Injuries / Limitations\n`;
    p.injuries.forEach((i) => { injuriesSection += `- ${i.description}\n`; });
  }

  // Goals section
  let goalsSection = '';
  if (p?.goals.length) {
    goalsSection = `\n## Current Goals\n`;
    p.goals.forEach((g) => {
      goalsSection += `- [${g.type}] ${g.title}`;
      if (g.targetDate) goalsSection += ` (target: ${formatDateShort(g.targetDate)})`;
      if (g.seasonStart && g.seasonEnd) {
        goalsSection += ` (season: ${formatDateShort(g.seasonStart)} – ${formatDateShort(g.seasonEnd)})`;
      }
      goalsSection += '\n';
    });
  }

  // Equipment section
  let equipmentSection = '';
  if (p?.equipmentItems.length || p?.gymMemberships.length) {
    equipmentSection = `\n## Available Equipment\n`;
    if (p.equipmentItems.length) {
      equipmentSection += `Home: ${p.equipmentItems.map((e) => e.name).join(', ')}\n`;
    } else {
      equipmentSection += `Home: bodyweight only\n`;
    }
    p.gymMemberships.forEach((gym) => {
      equipmentSection += `Gym (${gym.gymName}): ${gym.equipment ?? 'standard gym equipment'}\n`;
    });
  } else {
    equipmentSection = `\n## Available Equipment\nBodyweight only (no equipment listed)\n`;
  }

  // Active training plan section
  let planSection = '';
  const activePlan = p?.trainingPlans[0];
  if (activePlan) {
    planSection = `\n## Active Training Plan: ${activePlan.title}\n`;
    const days = activePlan.planDays.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    days.forEach((day) => {
      planSection += `${getDayFullName(day.dayOfWeek)}: ${day.focusArea ?? 'Training'}`;
      if (day.plannedExercises.length) {
        const exList = day.plannedExercises.slice(0, 4).map((e) => {
          let s = e.name;
          if (e.sets && e.reps) s += ` ${e.sets}×${e.reps}`;
          return s;
        });
        planSection += ` — ${exList.join(', ')}`;
        if (day.plannedExercises.length > 4) planSection += `, +${day.plannedExercises.length - 4} more`;
      }
      planSection += '\n';
    });
  }

  // Recent history
  let historySection = '';
  if (recentSessions.length || recentMetrics.length) {
    historySection = `\n## Recent History (last 7 days)\n`;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCompleted = recentSessions.filter(
      (s) => s.completedAt && new Date(s.completedAt) >= sevenDaysAgo,
    );
    if (recentCompleted.length) {
      recentCompleted.forEach((s) => {
        historySection += `- ${s.title}`;
        if (s.completedAt) historySection += ` (${formatDateShort(s.completedAt)})`;
        if (s.durationMin) historySection += ` — ${s.durationMin} min`;
        historySection += '\n';
      });
    } else {
      historySection += 'No workouts in the past 7 days.\n';
    }
    if (recentMetrics.length) {
      historySection += `Weight trend: ${recentMetrics
        .slice(0, 5)
        .map((m) => `${m.weightKg}kg`)
        .join(' → ')}\n`;
    }
  }

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  return `You are an expert personal trainer named "Coach" working with ${name}.

Today's date: ${today}

${profileSection}${injuriesSection}${goalsSection}${equipmentSection}${planSection}${historySection}
## Instructions
- Only program exercises using available equipment — never suggest equipment not listed
- Always account for all injuries/limitations in every recommendation
- Reference the client by first name (${name})
- Format your responses as HTML — use <p>, <ul>, <li>, <strong>, <h3> with Tailwind classes
- When presenting workout plans or schedules, use clear structured HTML tables or lists
- Use tools to actually make changes (update profile, generate plans, log workouts) — never just describe changes
- Call get_weather at most once per response, only when the user is actively planning an outdoor workout or asking about conditions — do not call it speculatively or multiple times
- The weather forecast covers 7 days ahead; use it for near-term planning only
- If the client's location is not set and weather is relevant, ask for it and use update_profile to save it
- Be warm, encouraging, and specific — like a real personal trainer who knows this client well
- If you don't have enough information about the client's profile, ask before generating a plan`;
}
