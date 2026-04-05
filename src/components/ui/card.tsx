import React from 'react';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{
        background: '#fff',
        border: '0.5px solid #e8e4df',
        borderRadius: 10,
        ...style,
      }}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{
        padding: '14px 22px',
        borderBottom: '0.5px solid #f0ece7',
        ...style,
      }}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', style, ...props }, ref) => (
    <h3
      ref={ref}
      className={className}
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: '#1a1a1a',
        margin: 0,
        ...style,
      }}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', style, ...props }, ref) => (
    <p
      ref={ref}
      className={className}
      style={{
        fontSize: 12,
        color: '#999',
        margin: '2px 0 0',
        ...style,
      }}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={className}
      style={{ padding: '16px 22px', ...style }}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center ${className}`}
      style={{ padding: '14px 22px', borderTop: '0.5px solid #f0ece7', ...style }}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';
