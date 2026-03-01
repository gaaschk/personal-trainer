import { getDayFullName } from '@/lib/utils';
import Link from 'next/link';

interface PlannedExercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  duration: string | null;
}

interface PlanDay {
  id: string;
  dayOfWeek: number;
  weekNumber: number;
  focusArea: string | null;
  plannedExercises: PlannedExercise[];
}

interface Plan {
  id: string;
  title: string;
  description: string | null;
  planDays: PlanDay[];
}

export default function WorkoutPlanCard({ plan }: { plan: Plan }) {
  const daysByWeek: Record<number, PlanDay[]> = {};
  plan.planDays.forEach((day) => {
    const week = day.weekNumber ?? 1;
    if (!daysByWeek[week]) daysByWeek[week] = [];
    daysByWeek[week].push(day);
  });

  const weeks = Object.keys(daysByWeek).map(Number).sort((a, b) => a - b);
  const showWeeks = weeks.length > 1;

  return (
    <div className="mt-3 border border-indigo-700 rounded-xl overflow-hidden bg-indigo-950/30">
      <div className="px-4 py-3 bg-indigo-900/40 border-b border-indigo-700/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-indigo-200">{plan.title}</h3>
          {plan.description && (
            <p className="text-xs text-indigo-400 mt-0.5">{plan.description}</p>
          )}
        </div>
        <Link
          href="/plan"
          className="text-xs text-indigo-300 hover:text-indigo-100 px-2 py-1 rounded bg-indigo-800/50 hover:bg-indigo-800 transition-colors"
        >
          View full plan →
        </Link>
      </div>

      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {showWeeks ? (
          weeks.slice(0, 2).map((week) => (
            <div key={week}>
              <p className="text-xs font-medium text-indigo-400 mb-2">Week {week}</p>
              <div className="space-y-1.5">
                {daysByWeek[week].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((day) => (
                  <DayRow key={day.id} day={day} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-1.5">
            {plan.planDays.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((day) => (
              <DayRow key={day.id} day={day} />
            ))}
          </div>
        )}
        {weeks.length > 2 && (
          <p className="text-xs text-indigo-500 text-center">+{weeks.length - 2} more weeks</p>
        )}
      </div>
    </div>
  );
}

function DayRow({ day }: { day: PlanDay }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-800/40">
      <span className="text-xs font-medium text-indigo-300 w-8 flex-shrink-0">
        {getDayFullName(day.dayOfWeek).substring(0, 3)}
      </span>
      <div className="flex-1">
        <span className="text-xs font-medium text-gray-200">{day.focusArea}</span>
        {day.plannedExercises.length > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">
            {day.plannedExercises.slice(0, 3).map((e) => e.name).join(', ')}
            {day.plannedExercises.length > 3 && `, +${day.plannedExercises.length - 3}`}
          </p>
        )}
      </div>
    </div>
  );
}
