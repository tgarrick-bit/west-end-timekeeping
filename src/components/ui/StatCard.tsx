interface StatCardProps {
  label: string;
  value: string | number;
  desc?: string;
  color?: 'default' | 'pink' | 'gold' | 'green';
  loading?: boolean;
}

const VALUE_COLORS = {
  default: '#1a1a1a',
  pink: '#e31c79',
  gold: '#c4a96a',
  green: '#2d9b6e',
};

export function StatCard({ label, value, desc, color = 'default', loading }: StatCardProps) {
  if (loading) {
    return (
      <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
        <div className="anim-shimmer" style={{ width: 80, height: 8, borderRadius: 3, marginBottom: 12 }} />
        <div className="anim-shimmer" style={{ width: 60, height: 22, borderRadius: 3, marginBottom: 8 }} />
        <div className="anim-shimmer" style={{ width: 90, height: 8, borderRadius: 3 }} />
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', border: '0.5px solid #e8e4df', borderRadius: 10, padding: '20px 22px' }}>
      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: 1.2, color: '#c0bab2', textTransform: 'uppercase' as const, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: VALUE_COLORS[color], lineHeight: 1 }}>
        {value}
      </div>
      {desc && (
        <div style={{ fontSize: 10, fontWeight: 400, color: '#d0cbc4', marginTop: 6 }}>
          {desc}
        </div>
      )}
    </div>
  );
}
