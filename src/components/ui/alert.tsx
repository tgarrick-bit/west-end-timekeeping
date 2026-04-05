import React from 'react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const VARIANTS: Record<string, React.CSSProperties> = {
  default: { background: '#FAFAF8', borderColor: '#e8e4df', color: '#1a1a1a' },
  success: { background: '#ecfdf5', borderColor: '#e8e4df', color: '#2d9b6e' },
  warning: { background: '#FFF8E1', borderColor: '#e8e4df', color: '#c4983a' },
  destructive: { background: '#fef2f2', borderColor: '#e8e4df', color: '#b91c1c' },
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'default', style, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={className}
      style={{
        width: '100%',
        borderRadius: 7,
        border: '0.5px solid #e8e4df',
        padding: '12px 16px',
        fontSize: 12,
        ...VARIANTS[variant],
        ...style,
      }}
      {...props}
    />
  )
);
Alert.displayName = 'Alert';

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{ fontSize: 12, lineHeight: 1.5, ...style }}
      {...props}
    />
  )
);
AlertDescription.displayName = 'AlertDescription';
