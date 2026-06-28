'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { PIPELINE_STEPS } from '@/lib/constants';
import { Card } from '@/components/shared/Card';

export function ProgressPipeline({ children }: { children?: React.ReactNode }) {
  const { state } = useApp();
  const [showPlayer, setShowPlayer] = useState(false);
  const [showSrt, setShowSrt] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stepIndex = state.pipelineStep === 'idle' ? -1
    : state.pipelineStep === 'done' ? PIPELINE_STEPS.length
    : PIPELINE_STEPS.findIndex((s) => s.id === state.pipelineStep);

  const ttsReady = state.ttsAudio !== null || state.libraryAudio !== null;
  const captionReady = state.captionSrt !== null;

  const isStepDone = (stepId: string) => {
    if (state.pipelineStep === 'done') return true;
    switch (stepId) {
      case 'upload': return state.uploadedFileIds.length > 0;
      case 'tts': return ttsReady;
      case 'caption': return captionReady;
      case 'analyze': return state.analysisResults.length > 0;
      case 'trim': return state.trimSegments.length > 0;
      case 'concat': return state.concatPath !== null;
      case 'render': return false;
      default: return false;
    }
  };

  return (
    <Card header="Progress Pipeline" icon="🔄">
      <div className="flex items-start gap-0 my-4 flex-nowrap">
        {PIPELINE_STEPS.map((step, i) => {
          const isTts = step.id === 'tts';
          const isCaption = step.id === 'caption';
          const isDone = isStepDone(step.id);
          const isActive = i === stepIndex || (state.pipelineStep === 'idle' && !isDone && (i === 0 || isStepDone(PIPELINE_STEPS[i-1].id)));
          const canClickTts = isTts && ttsReady && isActive;
          const canClickCaption = isCaption && captionReady && isActive;

          const isClickable = canClickTts || canClickCaption;

          return (
          <div key={step.id} className="flex items-start gap-0 flex-1 min-w-0">
            {/* Step */}
            <div className="flex-1 text-center min-w-0">
              <div
                className={`w-8 h-8 max-md:w-7 max-md:h-7 max-[400px]:w-6 max-[400px]:h-6 rounded-full border-2 flex items-center justify-center mx-auto mb-1.5 text-xs transition-all shrink-0 ${
                  isDone && !isActive
                    ? 'bg-[var(--success)] border-[var(--success)] text-white'
                    : isActive
                    ? isClickable
                      ? 'bg-[var(--accent)] border-[var(--accent)] shadow-[0_0_14px_var(--accent-glow)] cursor-pointer hover:scale-110 text-white'
                      : 'bg-[var(--accent)] border-[var(--accent)] shadow-[0_0_14px_var(--accent-glow)] text-white'
                    : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'
                }`}
                onClick={() => {
                  if (canClickTts) setShowPlayer(!showPlayer);
                  if (canClickCaption) setShowSrt(!showSrt);
                }}
                title={
                  canClickTts ? 'Klik untuk preview audio' :
                  canClickCaption ? 'Klik untuk preview SRT caption' :
                  step.label
                }
              >
                {isDone && !isActive ? '✓' : canClickTts ? '▶' : canClickCaption ? '📄' : step.icon}
              </div>
              <span
                className={`text-[0.65rem] font-medium leading-tight ${
                  isDone && !isActive ? 'text-[var(--success)]'
                    : isActive ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {canClickTts ? 'Preview' : canClickCaption ? 'Preview' : step.label}
              </span>
            </div>

            {/* Connector */}
            {i < PIPELINE_STEPS.length - 1 && (
              <div
                className={`flex-[0_0_24px] max-md:flex-[0_0_12px] max-[400px]:flex-[0_0_8px] h-0.5 self-center mb-5 min-w-[6px] ${
                  isDone && !isActive ? 'bg-[var(--success)]'
                    : isActive ? 'bg-[var(--accent)]'
                    : 'bg-[var(--border)]'
                }`}
              />
            )}
          </div>
        )})}
      </div>

      {/* TTS Audio Player Popup */}
      {showPlayer && state.ttsAudio && (
        <div className="bg-[var(--bg-input)] border border-[var(--accent)] rounded-xl p-3 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--accent)]">
              🔊 Preview TTS — {state.ttsAudio.duration} detik
            </span>
            <button
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm"
              onClick={() => {
                audioRef.current?.pause();
                setShowPlayer(false);
              }}
            >
              ✕
            </button>
          </div>
          <audio
            ref={audioRef}
            controls
            className="w-full h-8 rounded"
            src={state.ttsAudio.url}
          />
        </div>
      )}

      {/* SRT Caption Preview Popup */}
      {showSrt && state.captionSrt && (
        <div className="bg-[var(--bg-input)] border border-[var(--accent)] rounded-xl p-3 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--accent)]">
              💬 Caption SRT — {state.captionText ? `${state.captionText.split(/\s+/).length} kata` : ''}
            </span>
            <button
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm"
              onClick={() => setShowSrt(false)}
            >
              ✕
            </button>
          </div>
          <pre className="text-xs text-[var(--text-primary)] bg-[var(--bg-card)] rounded-lg p-3
                         max-h-40 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed
                         border border-[var(--border)]">
            {state.captionSrt.slice(0, 500)}{state.captionSrt.length > 500 ? '\n\n... (truncated)' : ''}
          </pre>
        </div>
      )}
      
      {children}
    </Card>
  );
}
