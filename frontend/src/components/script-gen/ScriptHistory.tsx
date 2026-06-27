'use client';

import { useState } from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { STYLES } from '@/lib/constants';

type HistoryScript = {
  id: string;
  script: string;
  caption: string;
  productName: string;
  style: string;
  duration: string;
  audience: string;
  createdAt: string;
};

type Props = {
  history: HistoryScript[];
  onUseInEditor: (script: HistoryScript) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
};

/** Map style value → display label */
function getStyleLabel(value: string): string {
  const found = STYLES.find((s) => s.value === value);
  return found?.label || value;
}

/** Map duration value → display label */
function getDurationLabel(value: string): string {
  const map: Record<string, string> = {
    '15': '15 detik',
    '30': '30 detik',
    '60': '60 detik',
    '90': '90 detik',
  };
  return map[value] || `${value} detik`;
}

/** Format ISO date → readable */
function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function ScriptHistory({ history, onUseInEditor, onDelete, onClearAll }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (history.length === 0) {
    return (
      <Card header="Riwayat Naskah" icon="📜">
        <div className="text-center py-6 text-[var(--text-muted)] text-sm">
          📭 Belum ada riwayat. Generate naskah dulu!
        </div>
      </Card>
    );
  }

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Card header={`Riwayat Naskah (${history.length})`} icon="📜">
      {history.length > 1 && (
        <div className="mb-2 text-right">
          <Button variant="outline" size="sm" onClick={onClearAll}>
            🗑️ Hapus Semua
          </Button>
        </div>
      )}

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {history.map((item) => {
          const isOpen = expanded.has(item.id);
          const preview = item.script.slice(0, 120);
          return (
            <div
              key={item.id}
              className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 transition-all"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {item.productName}
                    </span>
                    <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
                      {getStyleLabel(item.style)}
                    </span>
                    <span className="text-[0.65rem] text-[var(--text-muted)]">
                      {getDurationLabel(item.duration)}
                    </span>
                  </div>
                  <div className="text-[0.68rem] text-[var(--text-muted)]">
                    {formatDate(item.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => toggle(item.id)}>
                    {isOpen ? '▲' : '▼'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => onUseInEditor(item)}>
                    ➡️ Pakai
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onDelete(item.id)}>
                    🗑️
                  </Button>
                </div>
              </div>

              {/* Preview (collapsed) */}
              {!isOpen && (
                <div className="mt-1.5 text-xs text-[var(--text-muted)] line-clamp-2 italic">
                  &ldquo;{preview}{item.script.length > 120 ? '...' : ''}&rdquo;
                </div>
              )}

              {/* Expanded full content */}
              {isOpen && (
                <div className="mt-2 space-y-2">
                  <div className="bg-[var(--bg)] rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-[180px] overflow-y-auto">
                    {item.script}
                  </div>
                  {item.caption && (
                    <div className="text-[0.68rem] text-[var(--text-secondary)] bg-[var(--bg)] rounded-lg p-2">
                      <span className="font-semibold">📝 Caption: </span>
                      {item.caption}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
