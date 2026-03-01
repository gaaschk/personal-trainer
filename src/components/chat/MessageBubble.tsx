import WorkoutPlanCard from './WorkoutPlanCard';

interface WorkoutPlan {
  id: string;
  title: string;
  description: string | null;
  planDays: {
    id: string;
    dayOfWeek: number;
    weekNumber: number;
    focusArea: string | null;
    plannedExercises: {
      id: string;
      name: string;
      sets: number | null;
      reps: string | null;
      weight: string | null;
      duration: string | null;
    }[];
  }[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  statuses?: string[];
  card?: { type: 'workout_plan'; plan: WorkoutPlan } | null;
}

export default function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-indigo-600 text-white text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <div className="flex-1 max-w-[85%]">
        {/* Status lines */}
        {message.statuses && message.statuses.length > 0 && (
          <div className="mb-2 space-y-1">
            {message.statuses.map((status, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-indigo-400">
                <div className="w-3 h-3 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
                {status}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        {message.content ? (
          <div
            className="ai-content text-sm text-gray-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        ) : message.statuses && message.statuses.length > 0 ? null : (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {/* Rich card */}
        {message.card?.type === 'workout_plan' && (
          <WorkoutPlanCard plan={message.card.plan} />
        )}
      </div>
    </div>
  );
}
