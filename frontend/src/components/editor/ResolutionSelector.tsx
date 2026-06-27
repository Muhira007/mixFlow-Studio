'use client';

type Props = {
  resolution: '1080×1920' | '720×1280';
  onChange: (res: '1080×1920' | '720×1280') => void;
};

export function ResolutionSelector({ resolution, onChange }: Props) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
        Resolusi Output
      </label>
      <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-1">
        <button
          className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 border-none cursor-pointer ${
            resolution === '1080×1920'
              ? 'bg-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)]'
              : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => onChange('1080×1920')}
        >
          🎯 1080p
          <span className="block text-[0.6rem] opacity-70 font-normal">1080×1920</span>
        </button>
        <button
          className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 border-none cursor-pointer ${
            resolution === '720×1280'
              ? 'bg-[var(--accent)] text-white shadow-[0_0_12px_var(--accent-glow)]'
              : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => onChange('720×1280')}
        >
          ⚡ 720p
          <span className="block text-[0.6rem] opacity-70 font-normal">720×1280 — Lebih cepat</span>
        </button>
      </div>
    </div>
  );
}
