interface SectionHeaderProps {
  title: string;
  className?: string;
}

export function SectionHeader({ title, className = '' }: SectionHeaderProps) {
  return (
    <h2
      className={className}
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 1,
        color: '#c0bab2',
        textTransform: 'uppercase',
        marginBottom: 16,
      }}
    >
      {title}
    </h2>
  );
}
