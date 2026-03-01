import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import ActiveWorkoutTracker from '@/components/workout/ActiveWorkoutTracker';
import { getDayFullName } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ planDayId?: string }>;
}

export default async function ActiveWorkoutPage({ searchParams }: Props) {
  const session = await auth();
  const userId = session!.user.id;
  const { planDayId } = await searchParams;

  let planDay = null;
  let sessionTitle = 'Workout';

  if (planDayId) {
    planDay = await prisma.trainingPlanDay.findFirst({
      where: {
        id: planDayId,
        plan: { profile: { userId } },
      },
      include: {
        plannedExercises: { orderBy: { order: 'asc' } },
      },
    });
    if (planDay) {
      const dayName = getDayFullName(planDay.dayOfWeek);
      sessionTitle = planDay.focusArea ? `${dayName} — ${planDay.focusArea}` : `${dayName} Workout`;
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <ActiveWorkoutTracker
        planDay={planDay}
        sessionTitle={sessionTitle}
      />
    </div>
  );
}
