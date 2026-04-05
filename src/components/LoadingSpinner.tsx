interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ message = 'Loading...', fullScreen = true }: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className="flex items-center justify-center"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: 'rgba(227, 28, 121, 0.06)',
          border: '0.5px solid rgba(227, 28, 121, 0.1)',
        }}
      >
        <svg className="animate-spin" width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="8" stroke="rgba(227, 28, 121, 0.15)" strokeWidth="2" />
          <path d="M19 11a8 8 0 00-8-8" stroke="#e31c79" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[13px] font-medium" style={{ color: 'var(--we-text-3)' }}>
        {message}
      </p>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--we-bg)' }}
    >
      {content}
    </div>
  );
}
