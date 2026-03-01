import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'green' | 'yellow' | 'red' | 'blue';
}

export default function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-gray-700 text-gray-300':   variant === 'default',
          'bg-green-900 text-green-300': variant === 'green',
          'bg-yellow-900 text-yellow-300': variant === 'yellow',
          'bg-red-900 text-red-300':     variant === 'red',
          'bg-blue-900 text-blue-300':   variant === 'blue',
        },
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
