'use client';

import { useState, useEffect, useRef } from 'react';
import { listTTSFiles, deleteTTSAudio, BACKEND_URL, type AudioFileInfo } from '@/lib/api';
import { Button } from '@/components/shared/Button';
import { X } from 'lucide-react';

type Props = {
  selectedUrl: string | null;
  onSelect: (url: string, filename: string) => void;
};

export function AudioLibrary({ selectedUrl, onSelect }: Props) {
  const [files, setFiles] = useState<AudioFileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchFiles = () => {
    listTTSFiles()
      .then((data) => { setFiles(data.files); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Expose fetchFiles via an event or use an imperative handle if needed. 
  // For now, if the parent deletes all, we can just trigger a custom event or let the parent force a re-render.
  useEffect(() => {
    const handleRefresh = () => fetchFiles();
    window.addEventListener('refreshAudioLibrary', handleRefresh);
    return () => window.removeEventListener('refreshAudioLibrary', handleRefresh);
  }, []);

  const handleDelete = async (filename: string) => {
    try {
      await deleteTTSAudio(filename);
      setFiles((prev) => prev.filter(f => f.filename !== filename));
    } catch (e) {
      console.error('Failed to delete audio', e);
    }
  };

  const playPause = (filename: string) => {
    if (playing === filename) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(`${BACKEND_URL}/api/tts/audio/${filename}`);
    audio.onended = () => setPlaying(null);
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlaying(filename);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <p className="text-xs text-[var(--text-muted)] py-4 text-center">⏳ Memuat daftar audio...</p>;
  if (error) return <p className="text-xs text-[var(--danger)] py-4 text-center">❌ Gagal: {error}</p>;
  if (files.length === 0) return (
    <div className="text-center py-5">
      <p className="text-xs text-[var(--text-muted)] mb-2">📭 Belum ada file audio</p>
      <p className="text-[0.65rem] text-[var(--text-muted)]">
        Generate TTS dulu di tab "Tulis Naskah"
      </p>
    </div>
  );

  return (
    <div className="max-h-[250px] overflow-y-auto space-y-1.5">
      {files.map((f) => {
        const url = `${BACKEND_URL}/api/tts/audio/${f.filename}`;
        const isSelected = selectedUrl === url;
        const isPlaying = playing === f.filename;
        return (
          <div
            key={f.filename}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              isSelected
                ? 'bg-[var(--accent)]/10 border-[var(--accent)]'
                : 'bg-[var(--bg-input)] border-[var(--border)] hover:border-[var(--accent)]/30'
            }`}
          >
            <button
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 transition-all ${
                isPlaying
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--accent)]'
              }`}
              onClick={() => playPause(f.filename)}
              title="Preview"
            >
              {isPlaying ? '⏹' : '▶'}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{f.filename}</p>
              <p className="text-[0.6rem] text-[var(--text-muted)]">{f.size_mb} MB · {formatDate(f.created)}</p>
            </div>
            <Button
              variant={isSelected ? 'primary' : 'outline'}
              size="sm"
              className="text-[0.65rem] shrink-0"
              onClick={() => onSelect(url, f.filename)}
            >
              {isSelected ? '✓ Dipilih' : 'Pakai'}
            </Button>
            <button
              onClick={() => handleDelete(f.filename)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 shrink-0 transition-colors"
              title="Hapus"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
