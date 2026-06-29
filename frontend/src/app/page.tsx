'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { UploadZone } from '@/components/editor/UploadZone';
import { ScriptTextarea } from '@/components/editor/ScriptTextarea';
import { ProgressPipeline } from '@/components/editor/ProgressPipeline';
import { AnalysisTable } from '@/components/editor/AnalysisTable';
import { Button } from '@/components/shared/Button';
import { analyzeFootage, trimFootage, concatFootage, renderVideo, saveOutputToHistory, loadPipelineState, savePipelineState, generateCaption, burnCaption, deleteAllFootage } from '@/lib/api';
import { BACKEND_URL } from '@/lib/constants';

export default function EditorPage() {
  const { state, dispatch, addToast } = useApp();
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ done: 0, total: 0 });
  const [trimming, setTrimming] = useState(false);
  const [concating, setConcating] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<{ output_url: string } | null>(null);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [showAudioWarning, setShowAudioWarning] = useState(false);

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
      if (data?.caption_srt) {
        dispatch({
          type: 'SET_CAPTION_SRT',
          srt: data.caption_srt,
          srtPath: data.caption_srt_path || null,
          text: null,
        });
      }
    }).catch(() => {});
  }, []);

  // Save pipeline state after key steps
  const savePipeline = (extra: Record<string, any>) => {
    savePipelineState(extra).catch(() => {});
  };

  const handleAddToQueue = async () => {
    if (state.uploadedFileIds.length === 0) {
      addToast('⚠️ Upload footage terlebih dahulu', 'warning');
      return;
    }
    if (!hasAudio) {
      setShowAudioWarning(true);
      return;
    }
    if (state.uploadedFileIds.length < state.uploadedFiles.length) {
      addToast('⚠️ Masih upload ke backend... tunggu selesai', 'warning');
      return;
    }
    
    const latestScript = state.scriptHistory[0];
    const caption = latestScript ? latestScript.caption : '';
    const duration = latestScript && latestScript.duration ? latestScript.duration : '—';
    
    const jobName = `Video - ${new Date().toLocaleTimeString('id-ID')}`;
    const job = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: jobName,
      fileIds: [...state.uploadedFileIds],
      audio: activeAudio,
      resolution: state.outputResolution,
      scriptText: state.scriptText,
      caption,
      targetDuration: duration,
      status: 'queued' as const,
      createdAt: new Date().toISOString(),
    };

    const newQueue = [...(state.renderQueue || []), job];
    dispatch({ type: 'ADD_TO_RENDER_QUEUE', job });
    
    savePipelineState({ render_queue: newQueue }).catch(() => {});

    addToast(`✅ "${jobName}" ditambahkan ke Antrean Render!`, 'success');

    // Reset
    dispatch({ type: 'CLEAR_FILES' });
    dispatch({ type: 'CLEAR_FILE_IDS' });
    dispatch({ type: 'SET_ANALYSIS', results: [] });
    dispatch({ type: 'SET_TRIM_SEGMENTS', segments: [] });
    dispatch({ type: 'SET_CONCAT_PATH', path: null });
    dispatch({ type: 'CLEAR_CAPTION' });
    dispatch({ type: 'SET_UPLOADED_AUDIO', file: null });
    dispatch({ type: 'SET_TTS_AUDIO', audio: null });
    dispatch({ type: 'SET_LIBRARY_AUDIO', audio: null });
    
    savePipeline({ 
      files: [], 
      analysis_results: [], 
      trim_segments: [], 
      concat_path: null, 
      caption_srt: null, 
      caption_srt_path: null 
    });
  };

  const isAutoProcessing = false;
  const currentProcessLabel = '🚀 Tambahkan ke Antrean';
  let overallProgress = 0;

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


      {/* Upload + Script */}
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4 mb-4">
        <UploadZone />
        <ScriptTextarea />
      </div>

      {/* Progress */}
      <ProgressPipeline>
        <div className="mt-5 border-t border-[var(--border)] pt-5">
          {isAutoProcessing ? (
            <div className="relative w-full h-14 rounded-xl overflow-hidden bg-[var(--bg-input)] border border-[var(--border)] shadow-inner">
              {/* Progress Fill */}
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
              {/* Animated Stripes/Glow on top of fill */}
              <div 
                className="absolute top-0 left-0 h-full w-full opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.25) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.25) 75%, transparent 75%, transparent)',
                  backgroundSize: '24px 24px',
                  animation: 'slide 1s linear infinite'
                }} 
              />
              {/* Text */}
              <div className="absolute inset-0 flex items-center justify-center font-bold text-white text-base drop-shadow-md z-10">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 shrink-0" />
                {currentProcessLabel} ({Math.round(overallProgress)}%)
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full text-base py-3 shadow-[0_0_20px_var(--accent-glow)] hover:shadow-[0_0_30px_var(--accent)] transition-all h-14"
              disabled={state.uploadedFileIds.length === 0}
              onClick={handleAddToQueue}
            >
              🚀 Tambahkan ke Antrean
            </Button>
          )}

          {renderResult && !isAutoProcessing && (
            <div className="mt-4 flex gap-2 justify-center">
              <Button
                variant="outline"
                size="md"
                className="border-[var(--accent)] text-[var(--accent)]"
                onClick={() => window.open(`${BACKEND_URL}${renderResult.output_url}`, '_blank')}
              >
                📥 Download Hasil Video
              </Button>
            </div>
          )}
        </div>
      </ProgressPipeline>

      {/* Analysis Table */}
      {(state.uploadedFiles.length > 0 || state.analysisResults.length > 0) && <AnalysisTable />}

      {/* Audio Warning Modal */}
      {showAudioWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-slide-in">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-4 mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-center mb-2 text-[var(--text-primary)]">Audio Belum Siap</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-6 leading-relaxed">
              Anda belum melakukan <strong>Generate TTS</strong> atau belum memilih audio dari <strong>Library</strong>. Sistem membutuhkan audio sebagai basis durasi video.
            </p>
            <div className="flex justify-center">
              <Button variant="primary" block onClick={() => setShowAudioWarning(false)}>
                Mengerti
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
