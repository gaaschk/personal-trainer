import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function WorkoutHistoryPage() {
  const session = await auth();
  const userId = session!.user.id;

  const sessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      _count: { select: { workoutExercises: true } },
    },
  });

  const completed = sessions.filter((s) => s.status === 'COMPLETED');
  const planned   = sessions.filter((s) => s.status === 'PLANNED');

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Workouts</h1>
        <Link
          href="/workout/active"
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Start Workout
        </Link>
      </div>

      {planned.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-2">Planned</h2>
          <div className="space-y-2">
            {planned.map((s) => (
              <Link
                key={s.id}
                href={`/workout/active?sessionId=${s.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-750 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  {s.scheduledAt && (
                    <p className="text-xs text-gray-500">{formatDate(s.scheduledAt)}</p>
                  )}
                </div>
                <Badge variant="blue">Planned</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-2">History</h2>
        {completed.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No completed workouts yet</p>
              <Link href="/workout/active" className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-400">
                Start your first workout →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {completed.map((s) => (
              <Link
                key={s.id}
                href={`/workout/${s.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-750 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">{s.title}</p>
                  <p className="text-xs text-gray-500">
                    {s.completedAt ? formatDate(s.completedAt) : ''}
                    {s.durationMin ? ` · ${s.durationMin} min` : ''}
                    {s._count.workoutExercises > 0 ? ` · ${s._count.workoutExercises} exercises` : ''}
                  </p>
                </div>
                <Badge variant="green">Done</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
