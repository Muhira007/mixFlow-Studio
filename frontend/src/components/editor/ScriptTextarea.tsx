'use client';

import { useApp } from '@/contexts/AppContext';
import { VOICES } from '@/lib/constants';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { ScriptSourceToggle } from './ScriptSourceToggle';
import { AudioUploader } from './AudioUploader';
import { ResolutionSelector } from './ResolutionSelector';

export function ScriptTextarea() {
  const { state, dispatch, addToast } = useApp();

  return (
    <Card header="🎙️ Naskah Voice-Over & TTS" icon="🎙️">
      {/* Source Toggle */}
      <div className="mb-3.5">
        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
          Sumber Naskah
        </label>
        <ScriptSourceToggle
          source={state.scriptSource}
          onChange={(source) => dispatch({ type: 'SET_SCRIPT_SOURCE', source })}
        />
      </div>

      {/* Conditional: Text or Audio */}
      {state.scriptSource === 'text' ? (
        <>
          <div className="mb-3.5">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Paste naskah voice-over
            </label>
            <textarea
              className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit resize-y min-h-[110px] leading-relaxed outline-none transition-all"
              placeholder="Tempel naskah dari Script Generator di sini..."
              value={state.scriptText}
              onChange={(e) => dispatch({ type: 'SET_SCRIPT_TEXT', text: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3 mb-3">
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
        </>
      ) : (
        <div className="mb-3.5">
          <AudioUploader
            file={state.uploadedAudio}
            onChange={(file) => dispatch({ type: 'SET_UPLOADED_AUDIO', file })}
          />
          <div className="mt-3">
            <Button
              variant="primary"
              block
              size="sm"
              disabled={!state.uploadedAudio}
              onClick={() => {
                dispatch({ type: 'SET_PIPELINE_STEP', step: 'tts' });
                addToast('🎵 Audio siap — durasi akan diambil via FFprobe (backend dibutuhkan)', 'info');
              }}
            >
              🎵 Gunakan Audio Ini
            </Button>
          </div>
        </div>
      )}

      {/* Resolution Selector */}
      <ResolutionSelector
        resolution={state.outputResolution}
        onChange={(resolution) => dispatch({ type: 'SET_OUTPUT_RESOLUTION', resolution })}
      />
    </Card>
  );
}
