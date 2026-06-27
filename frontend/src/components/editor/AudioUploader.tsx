'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, X, Music } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
};

export function AudioUploader({ file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (f: File) => {
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/wave'];
      const validExt = f.name.match(/\.(mp3|wav)$/i);
      if (!validTypes.includes(f.type) && !validExt) {
        return; // silently ignore — handled by accept attribute
      }
      if (f.size > 50 * 1024 * 1024) {
        return; // >50MB
      }
      onChange(f);
    },
    [onChange]
  );

  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
        Upload Audio Voice-Over (.mp3 / .wav)
      </label>

      {file ? (
        <div className="flex items-center gap-3 p-3 bg-[var(--bg-input)] border border-[var(--accent)] rounded-lg">
          <Music size={18} className="text-[var(--accent)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] truncate">{file.name}</p>
            <p className="text-[0.68rem] text-[var(--text-muted)]">{formatFileSize(file.size)}</p>
          </div>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-full bg-none border-none text-[var(--danger)] cursor-pointer hover:bg-[var(--bg-card)] shrink-0"
            onClick={() => onChange(null)}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 bg-[var(--bg-input)] ${
            dragOver ? 'border-[var(--accent)] bg-[var(--bg-card)]' : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-card)]'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
        >
          <Upload size={24} className="mx-auto mb-1.5 text-[var(--text-muted)]" />
          <p className="text-xs text-[var(--text-muted)]">
            Klik atau drag & drop — Maks 50MB
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          e.target.value = '';
        }}
      />

      <p className="text-[0.68rem] text-[var(--text-muted)] mt-1">
        🎵 Audio akan dipakai langsung untuk render — tidak perlu TTS
      </p>
    </div>
  );
}
