'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SetRow from './SetRow';
import RestTimer from './RestTimer';
import Button from '@/components/ui/Button';

interface PlannedExercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  notes: string | null;
}

interface PlanDay {
  id: string;
  focusArea: string | null;
  plannedExercises: PlannedExercise[];
}

interface WorkoutSet {
  id?: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
}

interface WorkoutExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

type WorkoutState = 'IDLE' | 'ACTIVE' | 'RESTING' | 'COMPLETED';

interface Props {
  planDay: PlanDay | null;
  sessionTitle: string;
}

const REST_SECONDS = 90;

export default function ActiveWorkoutTracker({ planDay, sessionTitle }: Props) {
  const router = useRouter();
  const [state, setState]               = useState<WorkoutState>('IDLE');
  const [sessionId, setSessionId]       = useState<string | null>(null);
  const [exercises, setExercises]       = useState<WorkoutExercise[]>([]);
  const [elapsedSec, setElapsedSec]     = useState(0);
  const [showRest, setShowRest]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Elapsed timer
  useEffect(() => {
    if (state === 'ACTIVE' || state === 'RESTING') {
      timerRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  async function startWorkout() {
    // Create session in DB
    const res = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:     sessionTitle,
        planDayId: planDay?.id ?? null,
      }),
    });
    const session = await res.json() as { id: string };

    // PATCH to IN_PROGRESS
    await fetch(`/api/workouts/${session.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS', startedAt: new Date().toISOString() }),
    });

    setSessionId(session.id);

    // Initialize exercises from plan
    if (planDay?.plannedExercises.length) {
      const initialExercises: WorkoutExercise[] = [];
      for (const pe of planDay.plannedExercises) {
        const res = await fetch(`/api/workouts/${session.id}/exercises`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: pe.name }),
        });
        const ex = await res.json() as { id: string; name: string };
        const setCount = pe.sets ?? 3;
        const sets: WorkoutSet[] = Array.from({ length: setCount }, (_, i) => ({
          setNumber: i + 1,
          weightKg:  null,
          reps:      pe.reps ? parseInt(pe.reps) : null,
          rpe:       null,
          completed: false,
        }));
        initialExercises.push({ id: ex.id, name: ex.name, sets });
      }
      setExercises(initialExercises);
    }

    startTimeRef.current = Date.now();
    setState('ACTIVE');
  }

  function addExercise(name: string) {
    if (!name.trim() || !sessionId) return;
    fetch(`/api/workouts/${sessionId}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    }).then((res) => res.json()).then((ex: { id: string; name: string }) => {
      setExercises((prev) => [
        ...prev,
        { id: ex.id, name: ex.name, sets: [{ setNumber: 1, weightKg: null, reps: null, rpe: null, completed: false }] },
      ]);
    });
  }

  function addSet(exerciseIdx: number) {
    setExercises((prev) => {
      const copy = [...prev];
      const ex   = { ...copy[exerciseIdx] };
      ex.sets = [...ex.sets, {
        setNumber: ex.sets.length + 1,
        weightKg:  null,
        reps:      null,
        rpe:       null,
        completed: false,
      }];
      copy[exerciseIdx] = ex;
      return copy;
    });
  }

  const handleSetComplete = useCallback(async (
    exerciseIdx: number,
    setIdx: number,
    data: { weightKg: number | null; reps: number | null; rpe: number | null },
  ) => {
    if (!sessionId) return;
    const exercise = exercises[exerciseIdx];

    // POST set to DB
    const res = await fetch(`/api/workouts/${sessionId}/exercises/${exercise.id}/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, setNumber: setIdx + 1, completed: true }),
    });
    const savedSet = await res.json() as { id: string };

    setExercises((prev) => {
      const copy = [...prev];
      const ex = { ...copy[exerciseIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], ...data, id: savedSet.id, completed: true };
      ex.sets = sets;
      copy[exerciseIdx] = ex;
      return copy;
    });

    // Show rest timer
    setShowRest(true);
    setState('RESTING');
  }, [sessionId, exercises]);

  function handleRestComplete() {
    setShowRest(false);
    setState('ACTIVE');
  }

  async function finishWorkout() {
    if (!sessionId) return;
    setSaving(true);
    try {
      const durationMin = Math.round(elapsedSec / 60);
      await fetch(`/api/workouts/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:      'COMPLETED',
          completedAt: new Date().toISOString(),
          durationMin,
        }),
      });
      setState('COMPLETED');
      router.push(`/workout/${sessionId}`);
    } finally {
      setSaving(false);
    }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // IDLE state
  if (state === 'IDLE') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">{sessionTitle}</h2>
        {planDay && (
          <p className="text-gray-400 text-sm mb-1">{planDay.focusArea}</p>
        )}
        {planDay && (
          <p className="text-gray-500 text-xs mb-6">
            {planDay.plannedExercises.length} exercises planned
          </p>
        )}
        <Button size="lg" onClick={startWorkout}>
          Start Workout
        </Button>
      </div>
    );
  }

  // Rest timer overlay
  if (showRest) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-lg font-semibold text-white mb-2">Rest Time</h2>
        <RestTimer
          seconds={REST_SECONDS}
          onComplete={handleRestComplete}
          onSkip={handleRestComplete}
        />
      </div>
    );
  }

  // Active workout
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-white">{sessionTitle}</h2>
          <p className="text-xs text-indigo-400">{formatTime(elapsedSec)}</p>
        </div>
        <Button variant="danger" size="sm" onClick={finishWorkout} disabled={saving}>
          {saving ? 'Saving…' : 'Finish'}
        </Button>
      </div>

      {/* Exercises */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {exercises.map((exercise, exIdx) => (
          <div key={exercise.id} className="rounded-xl bg-gray-800 border border-gray-700 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">{exercise.name}</h3>
            </div>
            <div className="px-3 py-2 space-y-2">
              {exercise.sets.map((set, setIdx) => (
                <SetRow
                  key={setIdx}
                  set={set}
                  exerciseId={exercise.id}
                  sessionId={sessionId ?? ''}
                  onComplete={(data) => handleSetComplete(exIdx, setIdx, data)}
                />
              ))}
            </div>
            <div className="px-3 pb-2">
              <button
                onClick={() => addSet(exIdx)}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                + Add set
              </button>
            </div>
          </div>
        ))}

        {/* Add exercise */}
        <AddExerciseInput onAdd={addExercise} />
      </div>
    </div>
  );
}

function AddExerciseInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [value, setValue] = useState('');
  const [open, setOpen]   = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600 text-sm transition-colors"
      >
        + Add Exercise
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        className="flex-1 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Exercise name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
      />
      <Button type="submit" size="sm">Add</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  );
}
