'use client';

import { useState } from 'react';

interface Set {
  id?: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
}

interface Props {
  set: Set;
  exerciseId: string;
  sessionId: string;
  onComplete: (setData: { weightKg: number | null; reps: number | null; rpe: number | null }) => void;
}

export default function SetRow({ set, onComplete }: Props) {
  const [weight, setWeight] = useState(set.weightKg?.toString() ?? '');
  const [reps, setReps]     = useState(set.reps?.toString() ?? '');
  const [rpe, setRpe]       = useState(set.rpe?.toString() ?? '');

  function handleComplete() {
    onComplete({
      weightKg: weight ? parseFloat(weight) : null,
      reps:     reps   ? parseInt(reps)     : null,
      rpe:      rpe    ? parseInt(rpe)      : null,
    });
  }

  if (set.completed) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-green-900/20 border border-green-800/30">
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-xs text-gray-400">Set {set.setNumber}</span>
        {set.weightKg && <span className="text-xs text-gray-400">{set.weightKg} kg</span>}
        {set.reps && <span className="text-xs text-gray-400">× {set.reps}</span>}
        {set.rpe && <span className="text-xs text-gray-500 ml-auto">RPE {set.rpe}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-gray-800 border border-gray-700">
      <span className="text-xs text-gray-500 w-12 flex-shrink-0">Set {set.setNumber}</span>
      <input
        type="number"
        step="0.5"
        min="0"
        placeholder="kg"
        className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
      />
      <span className="text-gray-600 text-xs">×</span>
      <input
        type="number"
        min="0"
        placeholder="reps"
        className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
      />
      <input
        type="number"
        min="1"
        max="10"
        placeholder="RPE"
        className="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
        value={rpe}
        onChange={(e) => setRpe(e.target.value)}
      />
      <button
        onClick={handleComplete}
        className="ml-auto w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors flex-shrink-0"
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  );
}
