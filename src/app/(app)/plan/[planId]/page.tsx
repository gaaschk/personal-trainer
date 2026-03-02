import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate, getDayFullName } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

type Params = { params: Promise<{ planId: string }> };

export const dynamic = 'force-dynamic';

export default async function PlanDetailPage({ params }: Params) {
  const session = await auth();
  const userId = session!.user.id;
  const { planId } = await params;

  const profile = await prisma.healthProfile.findUnique({ where: { userId } });
  if (!profile) notFound();

  const plan = await prisma.trainingPlan.findFirst({
    where: { id: planId, profileId: profile.id },
    include: {
      planDays: {
        orderBy: [{ weekNumber: 'asc' }, { order: 'asc' }],
        include: { plannedExercises: { orderBy: { order: 'asc' } } },
      },
    },
  });

  if (!plan) notFound();

  // Group days by weekNumber
  const weeks = new Map<number, typeof plan.planDays>();
  for (const day of plan.planDays) {
    const wk = day.weekNumber ?? 1;
    if (!weeks.has(wk)) weeks.set(wk, []);
    weeks.get(wk)!.push(day);
  }
  const weekNumbers = Array.from(weeks.keys()).sort((a, b) => a - b);
  const isMultiWeek = weekNumbers.length > 1;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/plan" className="text-gray-400 hover:text-white transition-colors mt-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{plan.title}</h1>
            <Badge variant={plan.status === 'ACTIVE' ? 'green' : 'default'}>
              {plan.status === 'ACTIVE' ? 'Active' : 'Archived'}
            </Badge>
          </div>
          {plan.description && (
            <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">Created {formatDate(plan.createdAt)}</p>
        </div>
      </div>

      {/* Plan weeks */}
      <div className="space-y-6">
        {weekNumbers.map((wk) => {
          const days = weeks.get(wk)!;
          return (
            <div key={wk}>
              {isMultiWeek && (
                <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                  Week {wk}
                </h2>
              )}
              <div className="space-y-2">
                {days.map((day) => {
                  const isToday = !isMultiWeek && day.dayOfWeek === new Date().getDay();
                  return (
                    <Card
                      key={day.id}
                      className={isToday ? 'border-indigo-600' : ''}
                    >
                      {/* Day header */}
                      <div className="flex items-start gap-3">
                        <div className={`w-10 flex-shrink-0 text-center pt-0.5 ${isToday ? 'text-indigo-400' : 'text-gray-500'}`}>
                          <p className="text-xs font-medium">{getDayFullName(day.dayOfWeek).substring(0, 3)}</p>
                          {isToday && <p className="text-xs text-indigo-400">Today</p>}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {day.focusArea && (
                              <span className="text-sm font-medium text-white">{day.focusArea}</span>
                            )}
                            <Badge variant="blue">{day.plannedExercises.length} exercises</Badge>
                          </div>

                          {/* Exercises */}
                          {day.plannedExercises.length > 0 ? (
                            <div className="space-y-2">
                              {day.plannedExercises.map((ex) => (
                                <div key={ex.id} className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0 mt-1.5" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm text-gray-300">{ex.name}</span>
                                      {ex.sets && ex.reps && (
                                        <span className="text-xs text-gray-500 font-mono">{ex.sets}×{ex.reps}</span>
                                      )}
                                      {ex.weight && (
                                        <span className="text-xs text-gray-600">@ {ex.weight}</span>
                                      )}
                                      {ex.duration && (
                                        <span className="text-xs text-gray-600">{ex.duration}</span>
                                      )}
                                    </div>
                                    {ex.notes && (
                                      <p className="text-xs text-gray-600 mt-0.5">{ex.notes}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600 italic">Rest day</p>
                          )}

                          {/* Day notes */}
                          {day.notes && (
                            <p className="text-xs text-gray-500 mt-2 italic">{day.notes}</p>
                          )}

                          {/* Start workout */}
                          {day.plannedExercises.length > 0 && (
                            <Link
                              href={`/workout/active?planDayId=${day.id}`}
                              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              Start {getDayFullName(day.dayOfWeek)} workout →
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {plan.planDays.length === 0 && (
        <Card className="text-center py-10">
          <CardContent>
            <p className="text-gray-500 text-sm">This plan has no days yet.</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <Link
          href="/chat"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Ask Coach to modify this plan →
        </Link>
      </div>
    </div>
  );
}
