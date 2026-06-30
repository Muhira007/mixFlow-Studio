'use client';

import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { AI_PROVIDERS, DURATIONS, STYLES, AUDIENCES } from '@/lib/constants';

type Props = {
  provider: string;
  duration: string;
  style: string;
  audience: string;
  loading: boolean;
  onProviderChange: (v: string) => void;
  onDurationChange: (v: string) => void;
  onStyleChange: (v: string) => void;
  onAudienceChange: (v: string) => void;
  onGenerate: () => void;
};

export function ConfigSelects({
  provider, duration, style, audience, loading,
  onProviderChange, onDurationChange, onStyleChange, onAudienceChange,
  onGenerate,
}: Props) {
  return (
    <Card header="Konfigurasi Naskah" icon="⚙️">
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3 mb-3.5">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            AI Provider
          </label>
          <select
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-hidden transition-all cursor-pointer"
            value={provider}
            onChange={(e) => onProviderChange(e.target.value)}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Durasi Video
          </label>
          <select
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-hidden transition-all cursor-pointer"
            value={duration}
            onChange={(e) => onDurationChange(e.target.value)}
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3 mb-3.5">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Gaya Bahasa
          </label>
          <select
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-hidden transition-all cursor-pointer"
            value={style}
            onChange={(e) => onStyleChange(e.target.value)}
          >
            {STYLES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Target Audiens
          </label>
          <select
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-hidden transition-all cursor-pointer"
            value={audience}
            onChange={(e) => onAudienceChange(e.target.value)}
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      <Button variant="primary" size="lg" block loading={loading} onClick={onGenerate}>
        ✨ Generate Naskah
      </Button>
    </Card>
  );
}
