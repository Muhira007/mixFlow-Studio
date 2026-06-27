'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { VideoStats } from '@/components/editor/VideoStats';
import { UploadZone } from '@/components/editor/UploadZone';
import { ScriptTextarea } from '@/components/editor/ScriptTextarea';
import { ProgressPipeline } from '@/components/editor/ProgressPipeline';
import { AnalysisTable } from '@/components/editor/AnalysisTable';
import { Button } from '@/components/shared/Button';
import { analyzeFootage, trimFootage, concatFootage, renderVideo, saveOutputToHistory, loadPipelineState, savePipelineState } from '@/lib/api';
import { BACKEND_URL } from '@/lib/constants';

export default function EditorPage() {
  const { state, dispatch, addToast } = useApp();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ done: 0, total: 0 });
  const [trimming, setTrimming] = useState(false);
  const [concating, setConcating] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<{ output_url: string } | null>(null);

  const hasAudio = !!(state.ttsAudio || state.libraryAudio);
  const activeAudio = state.ttsAudio || state.libraryAudio;

  // Resume pipeline state from SQLite on mount
  useEffect(() => {
    loadPipelineState().then(data => {
      if (data?.files?.length > 0) {
        const ids = data.files.map((f: any) => f.file_id);
        dispatch({ type: 'ADD_FILE_IDS', ids });
      }
      if (data?.analysis_results) {
        dispatch({ type: 'SET_ANALYSIS', results: data.analysis_results });
      }
      if (data?.trim_segments) {
        dispatch({ type: 'SET_TRIM_SEGMENTS', segments: data.trim_segments });
      }
      if (data?.concat_path) {
        dispatch({ type: 'SET_CONCAT_PATH', path: data.concat_path });
      }
    }).catch(() => {});
  }, []);

  // Save pipeline state after key steps
  const savePipeline = (extra: Record<string, any>) => {
    savePipelineState(extra).catch(() => {});
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
      <div className="flex flex-wrap items-end gap-2 mt-1 sticky bottom-0 bg-[var(--bg-primary)] py-3 z-[5] max-md:flex-col">
        <div>
          <Button
            variant="outline"
            size="lg"
            loading={analyzing}
            disabled={state.uploadedFileIds.length === 0 || analyzing}
            title="Cek kualitas footage (blur, shake, good segment)"
          onClick={async () => {
            if (state.uploadedFileIds.length === 0) {
              addToast('⚠️ Upload footage terlebih dahulu', 'warning');
              return;
            }
            if (state.uploadedFileIds.length < state.uploadedFiles.length) {
              addToast('⚠️ Masih upload ke backend... tunggu selesai', 'warning');
              return;
            }
            setAnalyzing(true);
            setAnalyzeProgress({ done: 0, total: state.uploadedFileIds.length });
            dispatch({ type: 'SET_PIPELINE_STEP', step: 'analyze' });

            // Analisis per file — progress tracking
            const allResults: any[] = [];
            const batchSize = 3; // 3 file per request
            const ids = [...state.uploadedFileIds];

            try {
              for (let i = 0; i < ids.length; i += batchSize) {
                const batch = ids.slice(i, i + batchSize);
                const results = await analyzeFootage(batch);
                allResults.push(...results);
                setAnalyzeProgress({ done: Math.min(i + batchSize, ids.length), total: ids.length });
              }
              dispatch({ type: 'SET_ANALYSIS', results: allResults });
              dispatch({ type: 'SET_PIPELINE_STEP', step: 'analyze' });
              savePipeline({ analysis_results: allResults });
              addToast(`✅ Analisis selesai — ${allResults.length} footage`, 'success');
            } catch (err: any) {
              addToast(`❌ Gagal analisis: ${err.message}`, 'error');
              dispatch({ type: 'SET_PIPELINE_STEP', step: 'idle' });
            }
            setAnalyzing(false);
          }}
        >
          {analyzing
            ? `🔍 Menganalisis... ${analyzeProgress.done}/${analyzeProgress.total}`
            : `🔍 Analyze Footage${state.uploadedFileIds.length > 0 ? ` (${state.uploadedFileIds.length})` : ''}`
          }
          </Button>
          <p className="text-[0.6rem] text-[var(--text-muted)] mt-0.5">Cek blur, shake, good segment</p>
        </div>

        <div>
          <Button
            variant="primary"
            size="lg"
            loading={trimming || concating}
            disabled={state.analysisResults.length === 0 || !hasAudio || trimming || concating}
            title={!state.analysisResults.length ? 'Butuh hasil Analyze dulu' : !hasAudio ? 'Butuh Generate TTS atau pilih audio dari library' : 'Potong footage sesuai durasi audio, lalu gabung jadi 1 video'}
          onClick={async () => {
            if (state.analysisResults.length === 0) {
              addToast('⚠️ Analisis footage dulu', 'warning');
              return;
            }
            if (!hasAudio) {
              addToast('⚠️ Generate TTS atau pilih audio dari library', 'warning');
              return;
            }
            const targetDur = state.ttsAudio?.duration || 60;
            setTrimming(true);
            dispatch({ type: 'SET_PIPELINE_STEP', step: 'trim' });
            try {
              const result = await trimFootage(state.analysisResults, targetDur);
              dispatch({ type: 'SET_TRIM_SEGMENTS', segments: result.segments });
              dispatch({ type: 'SET_PIPELINE_STEP', step: 'trim' });
              savePipeline({ trim_segments: result.segments });
              addToast(`✂️ Trim selesai — total ${result.total_duration}s dari target ${result.target_duration}s`, 'success');
              // Auto-lanjut ke concat
              setConcating(true);
              dispatch({ type: 'SET_PIPELINE_STEP', step: 'concat' });
              const concatResult = await concatFootage(result.segments, state.uploadedFileIds);
              dispatch({ type: 'SET_CONCAT_PATH', path: concatResult.output_path });
              dispatch({ type: 'SET_PIPELINE_STEP', step: 'concat' });
              savePipeline({ concat_path: concatResult.output_path, trim_segments: result.segments });
              addToast(`🔗 Concat selesai — durasi ${concatResult.duration}s`, 'success');
            } catch (err: any) {
              addToast(`❌ Gagal: ${err.message}`, 'error');
              dispatch({ type: 'SET_PIPELINE_STEP', step: 'analyze' });
            }
            setTrimming(false);
            setConcating(false);
          }}
        >
          {trimming ? '✂️ Trimming...' : concating ? '🔗 Concating...' : '✂️ Trim + Concat'}
          </Button>
          <p className="text-[0.6rem] text-[var(--text-muted)] mt-0.5">
            {!state.analysisResults.length ? '⏳ Butuh Analyze' : !hasAudio ? '⏳ Butuh TTS / Audio Library' : 'Potong + gabung footage'}
          </p>
        </div>

        <div>
          <Button
            variant="success"
            size="lg"
          loading={rendering}
          disabled={!state.concatPath || rendering}
          title={!state.concatPath ? 'Butuh Trim + Concat dulu' : 'Gabung video + audio jadi final .mp4'}
          onClick={async () => {
            if (!state.concatPath) {
              addToast('⚠️ Jalankan Trim + Concat dulu', 'warning');
              return;
            }
            if (!activeAudio) {
              addToast('⚠️ Generate TTS atau pilih audio dari library', 'warning');
              return;
            }
            setRendering(true);
            dispatch({ type: 'SET_PIPELINE_STEP', step: 'render' });
            try {
              const w = state.outputResolution === '720×1280' ? 720 : 1080;
              const h = state.outputResolution === '720×1280' ? 1280 : 1920;
              const audioPath = activeAudio.filename; // backend resolves from outputs/
              const result = await renderVideo(state.concatPath, audioPath, w, h);
              setRenderResult(result);
              dispatch({ type: 'SET_PIPELINE_STEP', step: 'done' });
              const outputName = result.output_path.split('/').pop() || 'output.mp4';
              const now = new Date().toISOString();
              dispatch({
                type: 'ADD_OUTPUT',
                video: { name: outputName, duration: '—', size: '—', createdAt: now },
              });
              // Simpan ke SQLite backend
              saveOutputToHistory({
                name: outputName,
                duration: '—',
                size: '—',
                created_at: now,
              }).catch(() => {});
              addToast('🎬 Render selesai! Cek di Output Videos', 'success');
            } catch (err: any) {
              addToast(`❌ Render gagal: ${err.message}`, 'error');
              dispatch({ type: 'SET_PIPELINE_STEP', step: 'concat' });
            }
            setRendering(false);
          }}
        >
          {rendering ? '🎬 Merender...' : '🎬 Render Final'}
          </Button>
          <p className="text-[0.6rem] text-[var(--text-muted)] mt-0.5">
            {!state.concatPath ? '⏳ Butuh Trim + Concat' : 'Gabung video + audio → final .mp4'}
          </p>
        </div>

        <div>
          <Button
            variant="outline"
            size="lg"
            className="border-[var(--accent)]! text-[var(--accent)]!"
            disabled={!renderResult || rendering}
            onClick={() => {
              if (!renderResult) return;
              window.open(`${BACKEND_URL}${renderResult.output_url}`, '_blank');
            }}
          >
            📥 Download
          </Button>
          <p className="text-[0.6rem] text-[var(--text-muted)] mt-0.5">
            {!renderResult ? '⏳ Butuh Render dulu' : 'Download hasil final'}
          </p>
        </div>
      </div>
    </div>
  );
}
