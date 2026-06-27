'use client';

import { useApp } from '@/contexts/AppContext';
import { VOICES } from '@/lib/constants';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';

export function ScriptTextarea() {
  const { state, dispatch, addToast } = useApp();

  return (
    <Card header="🎙️ Naskah Voice-Over & TTS" icon="🎙️">
      <div className="mb-3.5">
        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
          Paste naskah voice-over
        </label>
        <textarea
          className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit resize-y min-h-[120px] leading-relaxed outline-none transition-all"
          placeholder="Tempel naskah dari Script Generator di sini..."
          value={state.scriptText}
          onChange={(e) => dispatch({ type: 'SET_SCRIPT_TEXT', text: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Suara TTS
          </label>
          <select
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-none transition-all cursor-pointer appearance-none"
            value={state.selectedVoice}
            onChange={(e) => dispatch({ type: 'SET_VOICE', voice: e.target.value })}
          >
            {VOICES.map((v) => (
              <option key={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button
            variant="primary"
            block
            onClick={() => {
              if (!state.scriptText.trim()) {
                addToast('⚠️ Masukkan naskah terlebih dahulu', 'warning');
                return;
              }
              dispatch({ type: 'SET_PIPELINE_STEP', step: 'tts' });
              addToast('🔊 Memproses TTS... (backend dibutuhkan untuk produksi)', 'info');
            }}
          >
            🔊 Generate TTS
          </Button>
        </div>
      </div>
    </Card>
  );
}
