'use client';

import { useApp } from '@/contexts/AppContext';
import { VideoStats } from '@/components/editor/VideoStats';
import { UploadZone } from '@/components/editor/UploadZone';
import { ScriptTextarea } from '@/components/editor/ScriptTextarea';
import { ProgressPipeline } from '@/components/editor/ProgressPipeline';
import { AnalysisTable } from '@/components/editor/AnalysisTable';
import { Button } from '@/components/shared/Button';

export default function EditorPage() {
  const { state, dispatch, addToast } = useApp();

  const simulatePipeline = () => {
    const steps = ['upload', 'tts', 'analyze', 'trim', 'concat', 'render'] as const;
    let i = 0;
    function next() {
      if (i >= steps.length) {
        dispatch({ type: 'SET_PIPELINE_STEP', step: 'done' });
        addToast('🎬 Pipeline selesai! Video siap render.');
        return;
      }
      dispatch({ type: 'SET_PIPELINE_STEP', step: steps[i] });
      addToast(`🔄 ${steps[i].charAt(0).toUpperCase() + steps[i].slice(1)}...`, 'info');
      i++;
      setTimeout(next, 500);
    }
    next();
  };

  return (
    <div className="animate-fade-slide-in">
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-[1.4rem] font-bold mb-0.5 leading-tight">
          🎞️ Video Editor
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          Upload footage, generate TTS, adaptive trim, dan render jadi video 9:16 siap upload ke TikTok / Shopee.
        </p>
      </div>

      {/* Stats */}
      <VideoStats />

      {/* Upload + Script */}
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4 mb-4">
        <UploadZone />
        <ScriptTextarea />
      </div>

      {/* Progress */}
      <ProgressPipeline />

      {/* Analysis Table */}
      <AnalysisTable />

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2 mt-1 sticky bottom-0 bg-[var(--bg-primary)] py-3 z-[5] max-md:flex-col">
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            if (state.uploadedFiles.length === 0) {
              addToast('⚠️ Upload footage terlebih dahulu', 'warning');
              return;
            }
            dispatch({ type: 'SET_PIPELINE_STEP', step: 'analyze' });
            addToast('🔍 Menganalisis footage... (backend dibutuhkan untuk produksi)', 'info');
          }}
        >
          🔍 Analyze Footage
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            dispatch({ type: 'SET_PIPELINE_STEP', step: 'trim' });
            addToast('✂️ Menjalankan adaptive trim... (backend dibutuhkan untuk produksi)', 'info');
          }}
        >
          ✂️ Adaptive Trim
        </Button>

        <Button
          variant="success"
          size="lg"
          onClick={() => {
            dispatch({ type: 'SET_PIPELINE_STEP', step: 'render' });
            const name = 'mixflow_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.mp4';
            dispatch({
              type: 'ADD_OUTPUT',
              video: { name, duration: '—', size: '—', createdAt: new Date().toISOString() },
            });
            addToast('🎬 Render dimulai... (backend dibutuhkan untuk produksi)', 'info');
          }}
        >
          🎬 Render Final
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="border-[var(--accent)]! text-[var(--accent)]!"
          onClick={() => {
            if (state.uploadedFiles.length === 0) {
              addToast('⚠️ Upload footage terlebih dahulu', 'warning');
              return;
            }
            const hasSource = state.scriptSource === 'text'
              ? state.scriptText.trim().length > 0
              : state.uploadedAudio !== null;
            if (!hasSource) {
              addToast('⚠️ Masukkan naskah atau upload audio terlebih dahulu', 'warning');
              return;
            }
            simulatePipeline();
          }}
        >
          ▶️ Simulasi Pipeline
        </Button>
      </div>
    </div>
  );
}
