import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'pink';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--we-pink)] disabled:pointer-events-none disabled:opacity-50';

    const variants: Record<string, string> = {
      default: 'bg-[var(--we-navy)] text-white hover:opacity-90 rounded-[var(--we-radius-sm)]',
      primary: 'bg-black text-white hover:bg-[#1a1a1a] hover:-translate-y-[1px] hover:shadow-we-md rounded-[10px]',
      pink: 'bg-[var(--we-pink)] text-white hover:bg-[var(--we-pink-hover)] rounded-[var(--we-radius-sm)]',
      destructive: 'bg-red-600 text-white hover:bg-red-700 rounded-[var(--we-radius-sm)]',
      outline: 'border border-[0.5px] border-[var(--we-border)] bg-white hover:bg-[var(--we-bg-subtle)] hover:border-[var(--we-border-hover)] rounded-[var(--we-radius-sm)]',
      secondary: 'bg-[var(--we-bg-muted)] hover:bg-[rgba(0,0,0,0.06)] rounded-[var(--we-radius-sm)]',
      ghost: 'hover:bg-[var(--we-bg-subtle)] rounded-[var(--we-radius-sm)]',
      link: 'text-[var(--we-pink)] underline-offset-4 hover:underline',
    };

    const sizes: Record<string, string> = {
      default: 'h-10 px-4 py-2 text-[14px]',
      sm: 'h-8 px-3 text-[13px]',
      lg: 'h-12 px-6 text-[15px]',
      icon: 'h-10 w-10',
    };

    return (
      <button
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
