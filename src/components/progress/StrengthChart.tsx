'use client';

interface PR {
  exercise: string;
  maxWeight: number;
  maxReps: number;
}

export default function StrengthChart({ prs }: { prs: PR[] }) {
  if (prs.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        No strength data yet. Complete workouts to see PRs.
      </div>
    );
  }

  const sorted = [...prs].filter((p) => p.maxWeight > 0).sort((a, b) => b.maxWeight - a.maxWeight).slice(0, 8);

  return (
    <div className="space-y-2">
      {sorted.map((pr) => (
        <div key={pr.exercise} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-36 truncate flex-shrink-0" title={pr.exercise}>
            {pr.exercise}
          </span>
          <div className="flex-1 h-5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((pr.maxWeight / sorted[0].maxWeight) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-white w-16 text-right flex-shrink-0">
            {pr.maxWeight} kg
          </span>
        </div>
      ))}
    </div>
  );
}
