'use client';

import { useState } from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';

type Props = {
  onClearFootage: () => void;
  onClearOutputs: () => void;
  onClearAudio: () => void;
  onResetAll: () => void;
};

export function DangerZone({ onClearFootage, onClearOutputs, onClearAudio, onResetAll }: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);

  function handle(action: string, fn: () => void) {
    if (confirming === action) {
      fn();
      setConfirming(null);
    } else {
      setConfirming(action);
      setTimeout(() => setConfirming(null), 4000);
    }
  }

  return (
    <Card
      header="Danger Zone"
      icon="⚠️"
      className="border-[var(--danger)]"
    >
      <p className="text-[var(--text-muted)] text-xs mb-3 leading-relaxed">
        Tindakan di bawah tidak bisa dibatalkan. Pastikan kamu sudah mendownload output sebelum menghapus.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--warning)]! text-[var(--warning)]!"
          onClick={() => handle('footage', onClearFootage)}
        >
          {confirming === 'footage' ? 'Klik lagi untuk konfirmasi' : '🗑️ Hapus footage'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--warning)]! text-[var(--warning)]!"
          onClick={() => handle('outputs', onClearOutputs)}
        >
          {confirming === 'outputs' ? 'Klik lagi untuk konfirmasi' : '🗑️ Hapus output'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-[var(--warning)]! text-[var(--warning)]!"
          onClick={() => handle('audio', onClearAudio)}
        >
          {confirming === 'audio' ? 'Klik lagi untuk konfirmasi' : '🎵 Hapus semua audio TTS'}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => handle('reset', onResetAll)}
        >
          {confirming === 'reset' ? '⚠️ Klik lagi untuk reset SEMUA' : '⚡ Reset semua'}
        </Button>
      </div>
    </Card>
  );
}
