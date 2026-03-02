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
    locationName?: string;
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

  // Geocode and save location if provided
  if (input.locationName) {
    const geo = await geocodeLocation(input.locationName);
    if (geo) {
      await prisma.healthProfile.update({
        where: { id: profile.id },
        data: { locationName: geo.display, latitude: geo.lat, longitude: geo.lon },
      });
    }
  }

  const fields: string[] = [];
  if (input.age)          fields.push(`age: ${input.age}`);
  if (input.weightKg)     fields.push(`weight: ${input.weightKg}kg`);
  if (input.heightCm)     fields.push(`height: ${input.heightCm}cm`);
  if (input.fitnessLevel) fields.push(`fitness level: ${input.fitnessLevel.toLowerCase()}`);
  if (input.notes)        fields.push('notes updated');
  if (input.addInjury)    fields.push(`injury added: ${input.addInjury}`);
  if (input.locationName) fields.push(`location: ${input.locationName}`);

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

// ── Geocoding helper (Open-Meteo, free, no API key) ───────────────────────────
async function geocodeLocation(
  name: string,
): Promise<{ lat: number; lon: number; display: string } | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
    const res  = await fetch(url);
    const data = await res.json() as { results?: { latitude: number; longitude: number; name: string; country: string; admin1?: string }[] };
    const r    = data.results?.[0];
    if (!r) return null;
    const parts = [r.name, r.admin1, r.country].filter(Boolean);
    return { lat: r.latitude, lon: r.longitude, display: parts.join(', ') };
  } catch {
    return null;
  }
}

// ── WMO weather code → description ───────────────────────────────────────────
function wmoDescription(code: number): string {
  if (code === 0)               return 'Clear sky';
  if (code <= 3)                return 'Partly cloudy';
  if (code <= 48)               return 'Foggy';
  if (code <= 55)               return 'Drizzle';
  if (code <= 65)               return 'Rain';
  if (code <= 75)               return 'Snow';
  if (code <= 77)               return 'Snow grains';
  if (code <= 82)               return 'Rain showers';
  if (code <= 86)               return 'Snow showers';
  if (code === 95)              return 'Thunderstorm';
  return 'Thunderstorm with hail';
}

// ── get_weather ───────────────────────────────────────────────────────────────

const WEATHER_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Fetch fresh forecast from Open-Meteo and upsert into WeatherCache.
// Exported so system-prompt.ts can also refresh on first load.
export async function refreshWeatherCache(userId: string): Promise<object | null> {
  const profile = await prisma.healthProfile.findUnique({
    where: { userId },
    select: { locationName: true, latitude: true, longitude: true },
  });
  if (!profile?.latitude || !profile?.longitude) return null;

  const { latitude: lat, longitude: lon, locationName } = profile;
  const url = [
    'https://api.open-meteo.com/v1/forecast',
    `?latitude=${lat}&longitude=${lon}`,
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m',
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
    '&timezone=auto',
    '&forecast_days=7',
  ].join('');

  const res  = await fetch(url);
  const data = await res.json() as {
    current: {
      temperature_2m: number;
      apparent_temperature: number;
      relative_humidity_2m: number;
      precipitation: number;
      weather_code: number;
      wind_speed_10m: number;
      wind_gusts_10m: number;
    };
    daily: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_sum: number[];
      precipitation_probability_max: number[];
      wind_speed_10m_max: number[];
    };
  };

  const c = data.current;
  const d = data.daily;

  const result = {
    location: locationName ?? `${lat}, ${lon}`,
    current: {
      conditions:   wmoDescription(c.weather_code),
      temperatureC: Math.round(c.temperature_2m),
      feelsLikeC:   Math.round(c.apparent_temperature),
      humidity:     c.relative_humidity_2m,
      precipMm:     c.precipitation,
      windKph:      Math.round(c.wind_speed_10m),
      gustsKph:     Math.round(c.wind_gusts_10m),
    },
    forecast: d.time.map((date, i) => ({
      date,
      conditions:        wmoDescription(d.weather_code[i]),
      highC:             Math.round(d.temperature_2m_max[i]),
      lowC:              Math.round(d.temperature_2m_min[i]),
      precipMm:          Math.round(d.precipitation_sum[i] * 10) / 10,
      precipProbability: d.precipitation_probability_max[i],
      maxWindKph:        Math.round(d.wind_speed_10m_max[i]),
    })),
  };

  await prisma.weatherCache.upsert({
    where:  { userId },
    create: { userId, fetchedAt: new Date(), locationName: locationName ?? null, data: JSON.stringify(result) },
    update: { fetchedAt: new Date(), locationName: locationName ?? null, data: JSON.stringify(result) },
  });

  return result;
}

export async function handleGetWeather(userId: string) {
  const profile = await prisma.healthProfile.findUnique({
    where: { userId },
    select: { latitude: true, longitude: true },
  });

  if (!profile?.latitude || !profile?.longitude) {
    return {
      error: 'No location set. Ask the client to set their location — either here in chat ("My location is Denver, Colorado") or on their profile page.',
    };
  }

  try {
    // Return cached data if it was fetched today; otherwise refresh.
    const cache = await prisma.weatherCache.findUnique({ where: { userId } });
    const stale = !cache || (Date.now() - cache.fetchedAt.getTime()) > WEATHER_CACHE_TTL_MS;

    if (!stale && cache) {
      return { ...JSON.parse(cache.data), cached: true, fetchedAt: cache.fetchedAt };
    }

    const fresh = await refreshWeatherCache(userId);
    return fresh ?? { error: 'Weather unavailable — no location configured.' };
  } catch (err) {
    return { error: `Weather fetch failed: ${err instanceof Error ? err.message : 'unknown error'}` };
  }
}
