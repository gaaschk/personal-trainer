import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import WorkoutActions from '@/components/workout/WorkoutActions';

type Params = { params: Promise<{ sessionId: string }> };

export const dynamic = 'force-dynamic';

export default async function WorkoutSummaryPage({ params }: Params) {
  const session = await auth();
  const userId = session!.user.id;
  const { sessionId } = await params;

  const workoutSession = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      workoutExercises: {
        include: { sets: { orderBy: { setNumber: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!workoutSession) notFound();

  const totalSets = workoutSession.workoutExercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0,
  );
  const totalVolume = workoutSession.workoutExercises.reduce(
    (sum, ex) => sum + ex.sets.reduce(
      (s, set) => s + (set.completed && set.reps && set.weightKg ? set.reps * set.weightKg : 0),
      0,
    ),
    0,
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/workout" className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{workoutSession.title}</h1>
          <p className="text-gray-400 text-sm">
            {workoutSession.completedAt ? formatDate(workoutSession.completedAt) : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={workoutSession.status === 'COMPLETED' ? 'green' : 'yellow'}>
            {workoutSession.status.toLowerCase()}
          </Badge>
          <WorkoutActions
            sessionId={workoutSession.id}
            title={workoutSession.title}
            completedAt={workoutSession.completedAt?.toISOString() ?? null}
            durationMin={workoutSession.durationMin}
            notes={workoutSession.notes}
            status={workoutSession.status}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {workoutSession.durationMin && (
          <Card className="text-center">
            <p className="text-2xl font-bold text-white">{workoutSession.durationMin}</p>
            <p className="text-xs text-gray-500">minutes</p>
          </Card>
        )}
        <Card className="text-center">
          <p className="text-2xl font-bold text-white">{workoutSession.workoutExercises.length}</p>
          <p className="text-xs text-gray-500">exercises</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-white">{totalSets}</p>
          <p className="text-xs text-gray-500">sets done</p>
        </Card>
        {totalVolume > 0 && (
          <Card className="text-center">
            <p className="text-xl font-bold text-white">{Math.round(totalVolume)}</p>
            <p className="text-xs text-gray-500">kg volume</p>
          </Card>
        )}
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        {workoutSession.workoutExercises.map((ex) => {
          const completedSets = ex.sets.filter((s) => s.completed);
          return (
            <Card key={ex.id}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">{ex.name}</h3>
                <span className="text-xs text-gray-500">{completedSets.length} sets</span>
              </div>
              <CardContent>
                {completedSets.length > 0 ? (
                  <div className="space-y-1">
                    {completedSets.map((set) => (
                      <div key={set.id} className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="w-12">Set {set.setNumber}</span>
                        {set.weightKg && <span>{set.weightKg} kg</span>}
                        {set.reps && <span>× {set.reps} reps</span>}
                        {set.rpe && <span className="ml-auto text-gray-500">RPE {set.rpe}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">No sets recorded</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {workoutSession.notes && (
        <Card className="mt-4">
          <h3 className="text-sm font-semibold text-white mb-1">Notes</h3>
          <p className="text-sm text-gray-400">{workoutSession.notes}</p>
        </Card>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Back to Dashboard
        </Link>
        <Link
          href="/chat"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Tell Coach
        </Link>
      </div>
    </div>
  );
}
