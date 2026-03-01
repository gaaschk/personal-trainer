'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import Spinner from '@/components/ui/Spinner';

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

interface Props {
  conversationId?: string;
  initialMessages?: Message[];
}

export default function ChatInterface({ conversationId, initialMessages = [] }: Props) {
  const [messages, setMessages]   = useState<Message[]>(initialMessages);
  const [input, setInput]         = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const textareaId = 'chat-input';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text, statuses: [] };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setStreaming(true);

    // Placeholder assistant message
    const assistantMsg: Message = { role: 'assistant', content: '', statuses: [] };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
        }),
      });

      if (!res.ok || !res.body) {
        let errMsg = 'Something went wrong. Please try again.';
        try {
          const errBody = await res.json() as { error?: string };
          if (errBody.error) errMsg = errBody.error;
        } catch { /* ignore */ }
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: `<p style="color:#f87171">${errMsg}</p>` };
          return copy;
        });
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line) as { t: string; v?: string };

            if (evt.t === 's') {
              setMessages((prev) => {
                const copy = [...prev];
                const last = { ...copy[copy.length - 1] };
                last.statuses = [...(last.statuses ?? []), evt.v!];
                copy[copy.length - 1] = last;
                return copy;
              });
            } else if (evt.t === 'd') {
              setMessages((prev) => {
                const copy = [...prev];
                const last = { ...copy[copy.length - 1] };
                last.content = (last.content ?? '') + (evt.v ?? '');
                copy[copy.length - 1] = last;
                return copy;
              });
            } else if (evt.t === 'c') {
              // Rich card event
              try {
                const card = JSON.parse(evt.v ?? '{}') as { type: 'workout_plan'; plan: WorkoutPlan };
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = { ...copy[copy.length - 1] };
                  last.card = card;
                  copy[copy.length - 1] = last;
                  return copy;
                });
              } catch { /* ignore */ }
            } else if (evt.t === 'e') {
              setMessages((prev) => {
                const copy = [...prev];
                const last = { ...copy[copy.length - 1] };
                last.content = `<p style="color:#f87171">${evt.v ?? 'Error'}</p>`;
                copy[copy.length - 1] = last;
                return copy;
              });
            }
          } catch { /* ignore malformed */ }
        }
      }
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, conversationId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const suggestions = [
    'Create a training plan for me',
    'I just completed a workout',
    'How is my progress going?',
    'I have a knee injury',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Coach is ready</h2>
            <p className="text-gray-400 text-sm max-w-sm mb-6">
              Ask me anything about training, nutrition, or your goals. I know your full profile and history.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm text-left transition-colors border border-gray-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-800 px-4 py-3">
        <div className="flex items-end gap-2 bg-gray-800 rounded-xl border border-gray-700 focus-within:border-indigo-500 transition-colors px-3 py-2">
          <textarea
            ref={inputRef}
            id={textareaId}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm resize-none focus:outline-none min-h-[24px] max-h-32 overflow-y-auto"
            placeholder="Message Coach…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
            onKeyDown={handleKeyDown}
            disabled={streaming}
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {streaming ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
