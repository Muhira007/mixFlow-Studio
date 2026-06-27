'use client';

import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';

type Script = {
  versionA: string;
  versionB: string;
  caption: string;
};

type Props = {
  script: Script | null;
  onCopyVersionA: () => void;
  onCopyVersionB: () => void;
  onCopyCaption: () => void;
  onUseInEditor: () => void;
};

export function ScriptOutput({ script, onCopyVersionA, onCopyVersionB, onCopyCaption, onUseInEditor }: Props) {
  if (!script) {
    return (
      <Card header="📦 Output Naskah" icon="📦">
        <div className="text-center py-8 text-[var(--text-muted)]">
          🤖 Generate naskah dulu untuk melihat output
        </div>
      </Card>
    );
  }

  return (
    <Card header="📦 Output Naskah" icon="📦">
      <div className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[350px] overflow-y-auto relative">
        <button
          className="absolute top-2.5 right-2.5"
          onClick={() => {
            navigator.clipboard.writeText(
              `VERSION A:\n${script.versionA}\n\nVERSION B:\n${script.versionB}\n\nCAPTION:\n${script.caption}`
            );
          }}
          title="Copy all"
        >
          <Button variant="outline" size="sm">📋 Copy All</Button>
        </button>

        <div className="inline-block px-2.5 py-1 rounded text-[0.68rem] font-bold mb-2 tracking-[0.05em] bg-[#f97316] text-black">
          VERSION A — Hard Selling
        </div>
        <div className="mb-4">{script.versionA}</div>

        <div className="inline-block px-2.5 py-1 rounded text-[0.68rem] font-bold mb-2 tracking-[0.05em] bg-[#a855f7] text-white">
          VERSION B — Storytelling
        </div>
        <div className="mb-4">{script.versionB}</div>

        <div className="inline-block px-2.5 py-1 rounded text-[0.68rem] font-bold mb-2 tracking-[0.05em] bg-[#10b981] text-black">
          CAPTION + HASHTAGS
        </div>
        <div>{script.caption}</div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={onCopyVersionA}>📋 Copy Ver. A</Button>
        <Button variant="outline" size="sm" onClick={onCopyVersionB}>📋 Copy Ver. B</Button>
        <Button variant="outline" size="sm" onClick={onCopyCaption}>📋 Copy Caption</Button>
        <Button variant="primary" size="sm" className="ml-auto" onClick={onUseInEditor}>
          ➡️ Pakai di Editor
        </Button>
      </div>
    </Card>
  );
}
