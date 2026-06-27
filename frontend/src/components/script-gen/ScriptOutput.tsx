'use client';

import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';

type Script = {
  script: string;
  caption: string;
};

type Props = {
  script: Script | null;
  onCopyScript: () => void;
  onCopyCaption: () => void;
  onUseInEditor: () => void;
};

export function ScriptOutput({ script, onCopyScript, onCopyCaption, onUseInEditor }: Props) {
  if (!script) {
    return (
      <Card header="Output Naskah" icon="📦">
        <div className="text-center py-8 text-[var(--text-muted)]">
          🤖 Generate naskah dulu untuk melihat output
        </div>
      </Card>
    );
  }

  return (
    <Card header="Output Naskah" icon="📦">
      {/* Naskah */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">🎙️ Naskah Voice-Over</span>
          <Button variant="outline" size="sm" onClick={onCopyScript}>📋 Copy</Button>
        </div>
        <div className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[250px] overflow-y-auto">
          {script.script}
        </div>
      </div>

      {/* Caption */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">📝 Caption + Hashtags</span>
          <Button variant="outline" size="sm" onClick={onCopyCaption}>📋 Copy</Button>
        </div>
        <div className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto text-[var(--text-secondary)]">
          {script.caption}
        </div>
      </div>

      <Button variant="primary" size="lg" block onClick={onUseInEditor}>
        ➡️ Pakai Naskah di Video Editor
      </Button>
    </Card>
  );
}
