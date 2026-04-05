import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'default', style, ...props }, ref) => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 150ms ease',
      border: 'none',
      borderRadius: 7,
    };

    const variants: Record<string, React.CSSProperties> = {
      primary: { background: '#e31c79', color: '#fff' },
      secondary: { background: '#fff', border: '0.5px solid #e0dcd7', color: '#777' },
      destructive: { background: '#b91c1c', color: '#fff' },
      ghost: { background: 'transparent', color: '#999' },
      link: { background: 'transparent', color: '#e31c79', textDecoration: 'none' },
    };

    const sizes: Record<string, React.CSSProperties> = {
      default: { height: 36, padding: '0 16px', fontSize: 12 },
      sm: { height: 30, padding: '0 12px', fontSize: 11 },
      lg: { height: 42, padding: '0 24px', fontSize: 13 },
      icon: { height: 36, width: 36, padding: 0, fontSize: 12 },
    };

    return (
      <button
        className={className}
        style={{ ...base, ...variants[variant], ...sizes[size], ...style }}
        ref={ref}
        onMouseEnter={(e) => {
          if (variant === 'primary') e.currentTarget.style.background = '#cc1069';
          if (variant === 'secondary') e.currentTarget.style.borderColor = '#ccc';
          if (variant === 'ghost') e.currentTarget.style.background = '#FAFAF8';
          if (variant === 'link') e.currentTarget.style.textDecoration = 'underline';
          props.onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          if (variant === 'primary') e.currentTarget.style.background = '#e31c79';
          if (variant === 'secondary') e.currentTarget.style.borderColor = '#e0dcd7';
          if (variant === 'ghost') e.currentTarget.style.background = 'transparent';
          if (variant === 'link') e.currentTarget.style.textDecoration = 'none';
          props.onMouseLeave?.(e);
        }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
