import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-indigo-600 hover:bg-indigo-700 text-white':             variant === 'primary',
            'bg-gray-700 hover:bg-gray-600 text-gray-100':              variant === 'secondary',
            'hover:bg-gray-700 text-gray-300':                          variant === 'ghost',
            'bg-red-600 hover:bg-red-700 text-white':                   variant === 'danger',
            'px-3 py-1.5 text-sm':                                      size === 'sm',
            'px-4 py-2 text-sm':                                        size === 'md',
            'px-6 py-3 text-base':                                      size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export default Button;
