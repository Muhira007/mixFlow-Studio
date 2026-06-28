'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { cloneVoice, createVoice as apiCreateVoice, type CloneVoiceResult } from '@/lib/api';

export function CloneVoice() {
  const { state, dispatch, addToast } = useApp();

  const [name, setName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [cloning, setCloning] = useState(false);
  const [result, setResult] = useState<CloneVoiceResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasApiKey = !!state.apiKeys.elevenlabs;

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const validExts = ['.mp3', '.wav', '.ogg', '.m4a', '.webm', '.mp4', '.aac', '.flac'];
    const arr = Array.from(newFiles).filter((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return validExts.includes(ext);
    });
    if (arr.length === 0) {
      addToast('⚠️ Format audio tidak didukung (MP3, WAV, OGG, M4A)', 'warning');
      return;
    }
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const fresh = arr.filter((f) => !existing.has(f.name + f.size));
      const combined = [...prev, ...fresh].slice(0, 25); // max 25
      if (combined.length >= 25) addToast('⚠️ Maks 25 file', 'warning');
      return combined;
    });
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClone = async () => {
    if (!name.trim()) {
      addToast('⚠️ Masukkan nama untuk suara kamu', 'warning');
      return;
    }
    if (files.length === 0) {
      addToast('⚠️ Upload minimal 1 sample audio suara kamu', 'warning');
      return;
    }
    if (!hasApiKey) {
      addToast('⚠️ Isi ElevenLabs API Key dulu di atas', 'warning');
      return;
    }

    setCloning(true);
    setResult(null);
    try {
      const res = await cloneVoice(name.trim(), files, {
        description: '',
        removeBackgroundNoise: false,
        language: 'Indonesia',
        gender: 'Neutral',
        label: 'My Voice',
      });
      setResult(res);

      // Auto-add to Voice Manager state
      dispatch({
        type: 'ADD_TTS_VOICE',
        voice: {
          name: res.name,
          voiceId: res.voice_id,
          language: 'Indonesia',
          gender: 'Neutral',
          label: 'My Voice',
          hasSample: true,
        },
      });

      // Also save to backend SQLite via existing API
      apiCreateVoice({
        name: res.name,
        voice_id: res.voice_id,
        language: 'Indonesia',
        gender: 'Neutral',
        label: 'My Voice',
      }).catch(() => {});

      addToast(`🎤 Suara "${res.name}" berhasil di-clone! Siap digunakan.`, 'success');
      // Reset form
      setName('');
      setFiles([]);
    } catch (err: any) {
      addToast(`❌ Clone gagal: ${err.message}`, 'error');
    }
    setCloning(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card header="🎤 Clone My Voice" icon="🎙️">
      <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
        Rekam suara kamu ~1-5 menit (suara natural, tanpa background noise), upload di sini,
        dan ElevenLabs akan mengkloning suara kamu. Hasil clone langsung tersimpan di Voice Manager.
      </p>

      {!hasApiKey && (
        <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl p-3 mb-4">
          <p className="text-xs text-[var(--warning)]">
            ⚠️ Isi <strong>ElevenLabs API Key</strong> di bagian atas halaman Settings terlebih dahulu.
          </p>
        </div>
      )}

      {/* Voice Name */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">
          Nama Suara <span className="text-[var(--danger)]">*</span>
        </label>
        <input
          type="text"
          className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl
                     text-[var(--text-primary)] text-sm outline-none transition-all
                     focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20"
          placeholder="Misal: Suara Gua, Voice Over Andi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={cloning}
        />
      </div>

      {/* File Upload */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">
          Sample Audio <span className="text-[var(--danger)]">*</span>
          <span className="font-normal text-[var(--text-muted)] ml-1">
            (min 1, rekomendasi 3-5 file, @1-5 menit)
          </span>
        </label>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
            dragOver
              ? 'border-[var(--accent)] bg-[var(--accent)]/5'
              : 'border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-input)]'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <p className="text-2xl mb-1">🎵</p>
          <p className="text-sm text-[var(--text-secondary)] font-medium">
            Drag & drop file audio di sini
          </p>
          <p className="text-[0.65rem] text-[var(--text-muted)] mt-0.5">
            MP3, WAV, OGG, M4A, FLAC, AAC, WEBM
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={cloning}
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-2 space-y-1 max-h-[160px] overflow-y-auto">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border)]
                           rounded-lg px-3 py-1.5 text-xs"
              >
                <span className="text-[var(--accent)]">🎵</span>
                <span className="flex-1 truncate text-[var(--text-primary)]">{f.name}</span>
                <span className="text-[var(--text-muted)] shrink-0">{formatSize(f.size)}</span>
                <button
                  className="text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-md w-5 h-5
                             flex items-center justify-center shrink-0 transition-all"
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  disabled={cloning}
                  title="Hapus"
                >
                  ✕
                </button>
              </div>
            ))}
            <p className="text-[0.6rem] text-[var(--text-muted)] text-right">
              {files.length} file · {formatSize(files.reduce((s, f) => s + f.size, 0))} total
            </p>
          </div>
        )}
      </div>

      {/* Tips */}
      <details className="mb-4">
        <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] transition-colors">
          💡 Tips rekaman suara yang bagus
        </summary>
        <ul className="mt-2 text-[0.65rem] text-[var(--text-muted)] space-y-1 pl-4 list-disc">
          <li>Rekam di ruangan sunyi — hindari kipas angin, AC, suara jalan</li>
          <li>Durasi total 1-5 menit (bisa gabungan beberapa file pendek)</li>
          <li>Bicara natural seperti sehari-hari — jangan monoton kayak baca berita</li>
          <li>Gunakan variasi intonasi (senang, serius, excited) biar hasil clone ekspresif</li>
          <li>Format MP3 atau WAV, mono, sample rate 22050Hz atau 44100Hz</li>
          <li>Jangan pakai efek suara, musik latar, atau echo</li>
          <li>Clone membutuhkan ~1 menit, sabar ya 🤙</li>
        </ul>
      </details>

      {/* Clone Button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={cloning}
        disabled={cloning || !hasApiKey}
        onClick={handleClone}
      >
        {cloning ? '🔄 Mengkloning suara... (1-2 menit)' : '🎤 Clone Suara Saya'}
      </Button>

      {/* Result */}
      {result && (
        <div className="mt-3 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl p-3">
          <p className="text-sm font-semibold text-[var(--success)]">
            ✅ {result.message}
          </p>
          <p className="text-[0.65rem] text-[var(--text-muted)] mt-1">
            Voice ID: <code className="bg-[var(--bg-card)] px-1.5 py-0.5 rounded text-[var(--accent)]">{result.voice_id}</code>
          </p>
          {result.requires_verification && (
            <p className="text-[0.65rem] text-[var(--warning)] mt-1">
              ⚠️ ElevenLabs perlu verifikasi manual suara ini. Cek dashboard ElevenLabs.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
