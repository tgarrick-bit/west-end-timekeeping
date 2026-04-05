interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'stat';
}

export function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  const baseClass = 'anim-shimmer rounded';

  switch (variant) {
    case 'card':
      return (
        <div
          className={`rounded-xl p-5 ${className}`}
          style={{
            background: 'var(--we-bg-white)',
            border: '0.5px solid var(--we-border)',
          }}
        >
          <div className={`${baseClass} w-full h-4 mb-3`} />
          <div className={`${baseClass} w-3/4 h-3 mb-2`} />
          <div className={`${baseClass} w-1/2 h-3`} />
        </div>
      );
    case 'avatar':
      return <div className={`${baseClass} w-9 h-9 rounded-lg ${className}`} />;
    case 'stat':
      return (
        <div
          className={`rounded-xl p-5 ${className}`}
          style={{
            background: 'var(--we-bg-white)',
            border: '0.5px solid var(--we-border)',
            boxShadow: 'var(--we-shadow-card)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`${baseClass} w-9 h-9 rounded-lg`} />
            <div className={`${baseClass} w-16 h-3`} />
          </div>
          <div className={`${baseClass} w-20 h-7 mb-2`} />
          <div className={`${baseClass} w-24 h-3`} />
        </div>
      );
    default:
      return <div className={`${baseClass} h-4 ${className}`} />;
  }
}

/** Row of skeleton stat cards */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="stat" />
      ))}
    </div>
  );
}

/** Skeleton list rows */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-xl"
          style={{
            background: 'var(--we-bg-white)',
            border: '0.5px solid var(--we-border)',
          }}
        >
          <Skeleton variant="avatar" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-1/3 h-4" />
            <Skeleton className="w-1/2 h-3" />
          </div>
          <Skeleton className="w-16 h-6 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
