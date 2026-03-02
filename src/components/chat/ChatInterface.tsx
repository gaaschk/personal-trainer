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

// Attachment metadata only — content stays on server after upload
export interface Attachment {
  id:       string;
  name:     string;
  kind:     'pdf' | 'text' | 'image';
  pages?:   number;
  mimeType?: string;
}

interface Message {
  role:         'user' | 'assistant';
  content:      string;
  statuses?:    string[];
  card?:        { type: 'workout_plan'; plan: WorkoutPlan } | null;
  attachments?: Pick<Attachment, 'name' | 'kind'>[];
  timestamp?:   number; // epoch ms — set when message is complete
  durationMs?:  number; // assistant only: total response time
  streamingAt?: number; // assistant only: epoch ms when streaming started (cleared on finish)
}

interface Props {
  conversationId?: string;
  initialMessages?: Message[];
}

const ACCEPTED_TYPES = '.pdf,.txt,.csv,.json,image/jpeg,image/png,image/gif,image/webp';

export default function ChatInterface({ conversationId: initialConversationId, initialMessages = [] }: Props) {
  const [messages, setMessages]         = useState<Message[]>(initialMessages);
  const [input, setInput]               = useState('');
  const [streaming, setStreaming]       = useState(false);
  const [attachments, setAttachments]   = useState<Attachment[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState('');
  const [conversationId, setConversationId] = useState(initialConversationId);

  const bottomRef       = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const abortRef        = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File too large (max 20 MB)');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json() as Attachment & { error?: string };
      if (!res.ok) {
        setUploadError((data as { error?: string }).error ?? 'Upload failed');
      } else {
        setAttachments((prev) => [...prev, data]);
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && !attachments.length) || streaming) return;

    const displayText = text || (attachments.length === 1
      ? `Please review the attached ${attachments[0].kind === 'pdf' ? 'document' : 'file'}: ${attachments[0].name}`
      : `Please review the ${attachments.length} attached files.`);

    const sentAttachments = [...attachments];
    const textAttachmentIds  = sentAttachments.filter((a) => a.kind !== 'image').map((a) => a.id);
    const imageAttachmentIds = sentAttachments.filter((a) => a.kind === 'image').map((a) => a.id);

    const userMsg: Message = {
      role:        'user',
      content:     displayText,
      statuses:    [],
      attachments: sentAttachments.map(({ name, kind }) => ({ name, kind })),
      timestamp:   Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setStreaming(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const streamStart = Date.now();
    const assistantMsg: Message = { role: 'assistant', content: '', statuses: [], streamingAt: streamStart };
    setMessages((prev) => [...prev, assistantMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  controller.signal,
        body: JSON.stringify({
          message:            text,
          conversationId,
          attachmentIds:      textAttachmentIds.length  ? textAttachmentIds  : undefined,
          imageAttachmentIds: imageAttachmentIds.length ? imageAttachmentIds : undefined,
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

            if (evt.t === 'ci') {
              // Server assigned a new conversation ID
              setConversationId(evt.v);
            } else if (evt.t === 's') {
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
    } catch (err) {
      // AbortError = user clicked Stop — keep whatever partial content arrived
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => {
          const copy = [...prev];
          const last = { ...copy[copy.length - 1] };
          const msg  = err instanceof Error ? err.message : 'Connection error';
          last.content = (last.content || '') + `<p style="color:#f87171">${msg}</p>`;
          copy[copy.length - 1] = last;
          return copy;
        });
      }
    } finally {
      abortRef.current = null;
      const endTime = Date.now();
      setStreaming(false);
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant' && last.streamingAt) {
          copy[copy.length - 1] = {
            ...last,
            timestamp:   endTime,
            durationMs:  endTime - last.streamingAt,
            streamingAt: undefined,
          };
        }
        return copy;
      });
    }
  }, [input, attachments, messages, streaming, conversationId]);

  function handleCancel() {
    abortRef.current?.abort();
  }

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

  const canSend = (input.trim().length > 0 || attachments.length > 0) && !streaming && !uploading;

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
              You can also attach PDFs and images to share schedules, plans, or photos.
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
        {/* Pending attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs"
              >
                <AttachmentIcon kind={att.kind} />
                <span className="max-w-[160px] truncate">{att.name}</span>
                {att.pages && <span className="text-indigo-500">({att.pages}p)</span>}
                <button
                  onClick={() => removeAttachment(i)}
                  className="ml-0.5 text-indigo-500 hover:text-indigo-300 transition-colors"
                  aria-label="Remove attachment"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <p className="text-xs text-red-400 mb-2">{uploadError}</p>
        )}

        <div className="flex items-end gap-2 bg-gray-800 rounded-xl border border-gray-700 focus-within:border-indigo-500 transition-colors px-3 py-2">
          {/* Attach button */}
          <button
            type="button"
            onClick={() => { setUploadError(''); fileInputRef.current?.click(); }}
            disabled={streaming || uploading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Attach PDF or image"
          >
            {uploading ? (
              <Spinner className="w-4 h-4" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileChange}
          />

          <textarea
            ref={inputRef}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm resize-none focus:outline-none min-h-[24px] max-h-32 overflow-y-auto"
            placeholder={attachments.length ? 'Add a message… (or just send)' : 'Message Coach…'}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
            onKeyDown={handleKeyDown}
            disabled={streaming}
          />

          {streaming ? (
            <button
              onClick={handleCancel}
              title="Stop response"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 transition-colors flex-shrink-0"
            >
              {/* Stop square */}
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!canSend}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>

        <p className="text-xs text-gray-600 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line · Attach PDFs and images with the paperclip
        </p>
      </div>
    </div>
  );
}

function AttachmentIcon({ kind }: { kind: string }) {
  if (kind === 'image') {
    return (
      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
