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
  displayContent?: string;
  statuses?: string[];
  card?: { type: 'workout_plan'; plan: WorkoutPlan } | null;
  attachments?: { name: string; kind: string }[];
}

export default function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-1">
          {message.attachments?.map((att, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800/60 text-indigo-200 text-xs justify-end">
              {att.kind === 'image' ? (
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span className="truncate max-w-[200px]">{att.name}</span>
            </div>
          ))}
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-indigo-600 text-white text-sm">
            {message.displayContent ?? message.content}
          </div>
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
