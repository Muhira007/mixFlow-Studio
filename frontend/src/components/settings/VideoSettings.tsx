'use client';

import { Card } from '@/components/shared/Card';
import { OUTPUT_FORMATS, CODECS } from '@/lib/constants';

type Props = {
  minKeepDuration: number;
  outputFormat: string;
  videoCodec: string;
  onMinKeepChange: (v: number) => void;
  onFormatChange: (v: string) => void;
  onCodecChange: (v: string) => void;
};

export function VideoSettings({
  minKeepDuration, outputFormat, videoCodec,
  onMinKeepChange, onFormatChange, onCodecChange,
}: Props) {
  return (
    <Card header="Pengaturan Video" icon="🎬">
      <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Min Keep Duration (detik)
          </label>
          <input
            type="number"
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-hidden transition-all"
            value={minKeepDuration}
            min={1}
            max={10}
            step={0.5}
            onChange={(e) => onMinKeepChange(parseFloat(e.target.value) || 3.0)}
          />
          <p className="text-[0.72rem] text-[var(--text-muted)] mt-1">
            Minimal tiap footage setelah trim
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Output Format
          </label>
          <select
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-hidden transition-all cursor-pointer"
            value={outputFormat}
            onChange={(e) => onFormatChange(e.target.value)}
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Video Codec
          </label>
          <select
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-hidden transition-all cursor-pointer"
            value={videoCodec}
            onChange={(e) => onCodecChange(e.target.value)}
          >
            {CODECS.map((c) => (
              <option key={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}
