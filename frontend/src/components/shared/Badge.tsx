export function Badge({ label, variant = 'default' }: { label: string; variant?: 'default' | 'good' | 'warn' | 'bad' | 'version-a' | 'version-b' | 'version-caption' }) {
  const variants: Record<string, string> = {
    default: 'bg-[var(--accent)] text-white',
    good: 'bg-[rgba(16,185,129,0.2)] text-[var(--success)]',
    warn: 'bg-[rgba(245,158,11,0.2)] text-[var(--warning)]',
    bad: 'bg-[rgba(239,68,68,0.2)] text-[var(--danger)]',
    'version-a': 'bg-[#f97316] text-black',
    'version-b': 'bg-[#a855f7] text-white',
    'version-caption': 'bg-[#10b981] text-black',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[0.62rem] font-semibold whitespace-nowrap ${variants[variant] || variants.default}`}>
      {label}
    </span>
  );
}
