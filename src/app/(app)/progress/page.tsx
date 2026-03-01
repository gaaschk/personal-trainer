import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import WeightChart from '@/components/progress/WeightChart';
import VolumeChart from '@/components/progress/VolumeChart';
import StrengthChart from '@/components/progress/StrengthChart';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const session = await auth();
  const userId = session!.user.id;

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [metrics, sessions] = await Promise.all([
    prisma.bodyMetric.findMany({
      where: { userId, date: { gte: ninetyDaysAgo } },
      orderBy: { date: 'asc' },
    }),
    prisma.workoutSession.findMany({
      where: { userId, status: 'COMPLETED', completedAt: { gte: ninetyDaysAgo } },
      orderBy: { completedAt: 'asc' },
      include: {
        workoutExercises: {
          include: { sets: { where: { completed: true } } },
        },
      },
    }),
  ]);

  // Compute volume per session
  const volumeData = sessions.map((s) => ({
    date: (s.completedAt ?? s.createdAt).toISOString().split('T')[0],
    volume: s.workoutExercises.reduce(
      (total, ex) => total + ex.sets.reduce(
        (setTotal, set) => setTotal + (set.reps && set.weightKg ? set.reps * set.weightKg : 0),
        0,
      ),
      0,
    ),
  }));

  // Compute strength PRs
  const prs: Record<string, { maxWeight: number; maxReps: number }> = {};
  for (const s of sessions) {
    for (const ex of s.workoutExercises) {
      if (!prs[ex.name]) prs[ex.name] = { maxWeight: 0, maxReps: 0 };
      for (const set of ex.sets) {
        if (set.weightKg && set.weightKg > prs[ex.name].maxWeight) prs[ex.name].maxWeight = set.weightKg;
        if (set.reps && set.reps > prs[ex.name].maxReps) prs[ex.name].maxReps = set.reps;
      }
    }
  }
  const prList = Object.entries(prs).map(([exercise, v]) => ({ exercise, ...v }));

  // Weight trend
  const weightData = metrics.map((m) => ({
    date:     m.date.toISOString().split('T')[0],
    weightKg: m.weightKg,
  }));

  const totalWorkouts = sessions.length;
  const totalVolumeKg = volumeData.reduce((s, d) => s + d.volume, 0);
  const latestWeight  = metrics.at(-1)?.weightKg ?? null;
  const firstWeight   = metrics[0]?.weightKg ?? null;
  const weightChange  = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <Link
          href="/chat"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          Discuss with Coach →
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="text-center">
          <p className="text-2xl font-bold text-white">{totalWorkouts}</p>
          <p className="text-xs text-gray-500">workouts (90d)</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-white">{Math.round(totalVolumeKg / 1000)}k</p>
          <p className="text-xs text-gray-500">kg volume</p>
        </Card>
        {latestWeight && (
          <Card className="text-center">
            <p className="text-2xl font-bold text-white">{latestWeight}</p>
            <p className="text-xs text-gray-500">kg current</p>
          </Card>
        )}
        {weightChange !== null && (
          <Card className="text-center">
            <p className={`text-2xl font-bold ${weightChange < 0 ? 'text-green-400' : 'text-yellow-400'}`}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
            </p>
            <p className="text-xs text-gray-500">kg change (90d)</p>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        {/* Weight chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weight Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart data={weightData} />
          </CardContent>
        </Card>

        {/* Volume chart */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <VolumeChart data={volumeData} />
          </CardContent>
        </Card>

        {/* Strength PRs */}
        <Card>
          <CardHeader>
            <CardTitle>Strength PRs</CardTitle>
          </CardHeader>
          <CardContent>
            <StrengthChart prs={prList} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
