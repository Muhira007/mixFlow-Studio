'use client';

import { useApp } from '@/contexts/AppContext';
import { estimateDuration } from '@/lib/utils';

export function VideoStats() {
  const { state } = useApp();
  const estimatedDur = estimateDuration(state.scriptText);

  return (
    <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3 mb-3.5">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[rgba(108,92,231,0.2)] flex items-center justify-center text-lg shrink-0">
          📁
        </div>
        <div>
          <div className="text-lg font-bold leading-tight">{state.uploadedFiles.length || state.uploadedFileMeta.length}</div>
          <div className="text-[0.72rem] text-[var(--text-muted)]">Footage terupload</div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[rgba(249,115,22,0.2)] flex items-center justify-center text-lg shrink-0">
          ⏱️
        </div>
        <div>
          <div className="text-lg font-bold leading-tight">{estimatedDur.toFixed(1)}s</div>
          <div className="text-[0.72rem] text-[var(--text-muted)]">Estimasi durasi audio</div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[rgba(16,185,129,0.2)] flex items-center justify-center text-lg shrink-0">
          ✅
        </div>
        <div>
          <div className="text-lg font-bold leading-tight">
            {state.outputResolution === '720×1280' ? '720p ⚡' : '1080p'}
          </div>
          <div className="text-[0.72rem] text-[var(--text-muted)]">
            {state.outputResolution === '720×1280' ? '720×1280 — lebih cepat' : '1080×1920'} · H.264
          </div>
        </div>
      </div>
    </div>
  );
}
