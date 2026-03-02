import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getDayFullName } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const session = await auth();
  const userId = session!.user.id;

  const profile = await prisma.healthProfile.findUnique({ where: { userId } });

  const plans = profile ? await prisma.trainingPlan.findMany({
    where: { profileId: profile.id },
    include: {
      planDays: {
        include: { plannedExercises: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  }) : [];

  const activePlan = plans.find((p) => p.status === 'ACTIVE');
  const archivedPlans = plans.filter((p) => p.status === 'ARCHIVED');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Training Plan</h1>
        <Link
          href="/chat"
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Ask Coach for a new plan
        </Link>
      </div>

      {!activePlan ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-14 h-14 rounded-2xl bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No active training plan</h2>
            <p className="text-gray-400 text-sm mb-4">
              Ask Coach to create a personalized plan based on your goals and available equipment.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create with AI Coach
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h2 className="text-lg font-semibold text-white">{activePlan.title}</h2>
            <Badge variant="green">Active</Badge>
            <Link
              href={`/plan/${activePlan.id}`}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors ml-auto"
            >
              View details →
            </Link>
          </div>
          {activePlan.description && (
            <p className="text-gray-400 text-sm mb-4">{activePlan.description}</p>
          )}

          {/* Weekly grid */}
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
              const planDay = activePlan.planDays.find((d) => d.dayOfWeek === dow);
              const isToday = dow === new Date().getDay();
              return (
                <Card
                  key={dow}
                  className={isToday ? 'border-indigo-600' : ''}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 flex-shrink-0 text-center pt-0.5 ${isToday ? 'text-indigo-400' : 'text-gray-500'}`}>
                      <p className="text-xs font-medium">{getDayFullName(dow).substring(0, 3)}</p>
                      {isToday && <p className="text-xs text-indigo-400">Today</p>}
                    </div>
                    {planDay ? (
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-white">{planDay.focusArea}</span>
                          <Badge variant="blue">{planDay.plannedExercises.length} exercises</Badge>
                        </div>
                        <div className="space-y-1">
                          {planDay.plannedExercises.map((ex) => (
                            <div key={ex.id} className="flex items-center gap-2 text-sm text-gray-400">
                              <div className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
                              <span>{ex.name}</span>
                              {ex.sets && ex.reps && (
                                <span className="ml-auto text-xs text-gray-500">{ex.sets}×{ex.reps}</span>
                              )}
                              {ex.weight && (
                                <span className="text-xs text-gray-600">@ {ex.weight}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {isToday && (
                          <Link
                            href={`/workout/active?planDayId=${planDay.id}`}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Start Workout →
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1">
                        <span className="text-sm text-gray-600 italic">Rest day</span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Archived plans */}
      {archivedPlans.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-400 mb-3">Previous Plans</h2>
          <div className="space-y-2">
            {archivedPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/plan/${plan.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-300">{plan.title}</p>
                  <p className="text-xs text-gray-500">{plan.planDays.length} days</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Archived</Badge>
                  <span className="text-xs text-gray-500">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
