'use client';

type Props = {
  source: 'text' | 'audio';
  onChange: (source: 'text' | 'audio') => void;
};

export function ScriptSourceToggle({ source, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-1">
      <button
        className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 border-none cursor-pointer ${
          source === 'text'
            ? 'bg-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)] hover:brightness-110'
            : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        onClick={() => onChange('text')}
      >
        📝 Dari Teks
      </button>
      <button
        className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 border-none cursor-pointer ${
          source === 'audio'
            ? 'bg-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)] hover:brightness-110'
            : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        onClick={() => onChange('audio')}
      >
        🎵 Dari Audio
      </button>
    </div>
  );
}
