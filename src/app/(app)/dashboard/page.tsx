import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { getDayName, formatDateShort } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session!.user.name?.split(' ')[0] ?? 'there';

  // Parallel data fetches
  const [profile, recentSessions, recentMetrics] = await Promise.all([
    prisma.healthProfile.findUnique({
      where: { userId },
      include: {
        goals: { where: { active: true }, orderBy: { createdAt: 'desc' } },
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
      take: 5,
    }),
    prisma.bodyMetric.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 7,
    }),
  ]);

  const activePlan = profile?.trainingPlans[0] ?? null;
  const todayDow = new Date().getDay();
  const todayPlanDay = activePlan?.planDays.find((d) => d.dayOfWeek === todayDow) ?? null;
  const latestWeight = recentMetrics[0]?.weightKg ?? profile?.weightKg ?? null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Good morning, {firstName}! 👋</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Today's workout + recent sessions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Today's Workout Card */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">Today&apos;s Workout</h2>
              {activePlan && (
                <Link href="/plan" className="text-xs text-indigo-400 hover:text-indigo-300">
                  View full plan →
                </Link>
              )}
            </div>
            <CardContent>
              {todayPlanDay ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-300 text-xs font-medium">
                      {todayPlanDay.focusArea ?? 'Training'}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4">
                    {todayPlanDay.plannedExercises.slice(0, 5).map((ex) => (
                      <div key={ex.id} className="flex items-center gap-2 text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                        <span>{ex.name}</span>
                        {ex.sets && ex.reps && (
                          <span className="text-gray-500 ml-auto">{ex.sets}×{ex.reps}</span>
                        )}
                      </div>
                    ))}
                    {todayPlanDay.plannedExercises.length > 5 && (
                      <p className="text-xs text-gray-500 pl-3.5">
                        +{todayPlanDay.plannedExercises.length - 5} more exercises
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/workout/active?planDayId=${todayPlanDay.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Workout
                  </Link>
                </div>
              ) : activePlan ? (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-3">Rest day — no workout scheduled today</p>
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Ask Coach for guidance
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-3">No active training plan</p>
                  <Link
                    href="/chat"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Ask Coach to create a plan
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Plan Grid */}
          {activePlan && (
            <Card>
              <h2 className="font-semibold text-white mb-3">This Week</h2>
              <div className="grid grid-cols-7 gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
                  const planDay = activePlan.planDays.find((d) => d.dayOfWeek === dow);
                  const isToday = dow === todayDow;
                  return (
                    <div
                      key={dow}
                      className={`flex flex-col items-center p-2 rounded-lg text-center ${
                        isToday ? 'bg-indigo-900/50 border border-indigo-700' : 'bg-gray-800/50'
                      }`}
                    >
                      <span className={`text-xs font-medium mb-1 ${isToday ? 'text-indigo-300' : 'text-gray-400'}`}>
                        {getDayName(dow)}
                      </span>
                      {planDay ? (
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-700" />
                      )}
                      {planDay?.focusArea && (
                        <span className="text-xs text-gray-500 mt-1 truncate w-full" title={planDay.focusArea}>
                          {planDay.focusArea.substring(0, 4)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white">Recent Workouts</h2>
                <Link href="/workout" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
              </div>
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/workout/${session.id}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{session.title}</p>
                      <p className="text-xs text-gray-500">
                        {session.completedAt ? formatDateShort(session.completedAt) : ''}
                        {session.durationMin ? ` · ${session.durationMin} min` : ''}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 text-xs">Done</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Metrics summary */}
          <Card>
            <h2 className="font-semibold text-white mb-3">Quick Stats</h2>
            <div className="space-y-3">
              {latestWeight && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Weight</span>
                  <span className="text-sm font-medium text-white">{latestWeight} kg</span>
                </div>
              )}
              {profile?.heightCm && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Height</span>
                  <span className="text-sm font-medium text-white">{profile.heightCm} cm</span>
                </div>
              )}
              {profile?.fitnessLevel && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Level</span>
                  <span className="text-sm font-medium text-indigo-300 capitalize">
                    {profile.fitnessLevel.toLowerCase()}
                  </span>
                </div>
              )}
              {recentSessions.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Workouts (7d)</span>
                  <span className="text-sm font-medium text-white">
                    {recentSessions.filter((s) => {
                      const d = s.completedAt ? new Date(s.completedAt) : null;
                      return d && (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
                    }).length}
                  </span>
                </div>
              )}
            </div>
            <Link
              href="/progress"
              className="mt-3 flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
            >
              View progress →
            </Link>
          </Card>

          {/* Goals */}
          {profile?.goals && profile.goals.length > 0 && (
            <Card>
              <h2 className="font-semibold text-white mb-3">Active Goals</h2>
              <div className="space-y-2">
                {profile.goals.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="p-2 rounded-lg bg-gray-800/50">
                    <p className="text-sm font-medium text-white">{goal.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {goal.type.toLowerCase().replace('_', ' ')}
                      {goal.targetDate && ` · ${formatDateShort(goal.targetDate)}`}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* AI Coach CTA */}
          <Card className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-700/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">AI Coach</p>
                <p className="text-xs text-gray-400 mt-0.5">Ask for workout adjustments, advice, or a new plan</p>
              </div>
            </div>
            <Link
              href="/chat"
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Chat with Coach
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
