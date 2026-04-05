export function Skeleton({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`anim-shimmer ${className}`} style={{ borderRadius: 3, ...style }} />;
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(count, 4)}, 1fr)`, gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
          <Skeleton style={{ width: 80, height: 8, marginBottom: 12 }} />
          <Skeleton style={{ width: 60, height: 22, marginBottom: 8 }} />
          <Skeleton style={{ width: 90, height: 8 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ padding: '14px 22px', borderBottom: i < rows - 1 ? '0.5px solid #f5f2ee' : 'none' }}>
          <Skeleton style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <div className="flex-1 space-y-1.5">
            <Skeleton style={{ width: '35%', height: 10 }} />
            <Skeleton style={{ width: '55%', height: 8 }} />
          </div>
          <Skeleton style={{ width: 50, height: 16, borderRadius: 3 }} />
        </div>
      ))}
    </div>
  );
}
