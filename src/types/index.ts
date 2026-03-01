import type { DefaultSession } from 'next-auth';

// ── NextAuth type augmentation ──────────────────────────────────────────────
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

// next-auth/jwt augmentation handled via next-auth package

// ── Enums ────────────────────────────────────────────────────────────────────
export type FitnessLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type GoalType = 'MAINTENANCE' | 'EVENT' | 'SEASONAL';
export type PlanStatus = 'ACTIVE' | 'ARCHIVED';
export type SessionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type MessageRole = 'USER' | 'ASSISTANT' | 'TOOL';

// ── Domain types ─────────────────────────────────────────────────────────────
export interface HealthProfileData {
  id: string;
  userId: string;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  fitnessLevel: FitnessLevel;
  notes: string | null;
}

export interface InjuryData {
  id: string;
  profileId: string;
  description: string;
  tag: string;
  active: boolean;
}

export interface GoalData {
  id: string;
  profileId: string;
  type: GoalType;
  title: string;
  targetDate: string | null;
  seasonStart: string | null;
  seasonEnd: string | null;
  active: boolean;
}

export interface EquipmentItemData {
  id: string;
  profileId: string;
  name: string;
  category: string | null;
  notes: string | null;
}

export interface GymMembershipData {
  id: string;
  profileId: string;
  gymName: string;
  address: string | null;
  notes: string | null;
  equipment: string | null;
  active: boolean;
}

export interface TrainingPlanData {
  id: string;
  profileId: string;
  title: string;
  description: string | null;
  status: PlanStatus;
  startDate: string | null;
  endDate: string | null;
  planDays: TrainingPlanDayData[];
}

export interface TrainingPlanDayData {
  id: string;
  planId: string;
  dayOfWeek: number;
  weekNumber: number;
  focusArea: string | null;
  notes: string | null;
  order: number;
  plannedExercises: PlannedExerciseData[];
}

export interface PlannedExerciseData {
  id: string;
  planDayId: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  duration: string | null;
  notes: string | null;
  order: number;
}

export interface WorkoutSessionData {
  id: string;
  userId: string;
  planDayId: string | null;
  title: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMin: number | null;
  status: SessionStatus;
  notes: string | null;
  workoutExercises?: WorkoutExerciseData[];
}

export interface WorkoutExerciseData {
  id: string;
  sessionId: string;
  name: string;
  order: number;
  notes: string | null;
  sets: ExerciseSetData[];
}

export interface ExerciseSetData {
  id: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  distanceM: number | null;
  rpe: number | null;
  completed: boolean;
  completedAt: string | null;
}

export interface BodyMetricData {
  id: string;
  userId: string;
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  notes: string | null;
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  statuses?: string[];
  card?: WorkoutPlanCard | null;
}

export interface WorkoutPlanCard {
  type: 'workout_plan';
  plan: TrainingPlanData;
}
