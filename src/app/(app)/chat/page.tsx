import ChatInterface from '@/components/chat/ChatInterface';

export const metadata = { title: 'AI Coach — AI Trainer' };

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">Coach</h1>
          <p className="text-xs text-green-400">Online</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
