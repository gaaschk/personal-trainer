import { cn } from '@/lib/utils';

export default function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-5 h-5 border-2 border-gray-600 border-t-indigo-500 rounded-full animate-spin',
        className,
      )}
    />
  );
}
