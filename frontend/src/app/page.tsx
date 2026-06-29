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

  const handleAutoProcess = async () => {
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
    
    let currentAnalysis = state.analysisResults;
    let currentTrimSegments = state.trimSegments;
    let currentConcatPath = state.concatPath;
    let currentCaptionSrt = state.captionSrt;

    try {
      // 1. ANALYZE
      if (currentAnalysis.length === 0) {
        setAnalyzing(true);
        setAnalyzeProgress({ done: 0, total: state.uploadedFileIds.length });
        dispatch({ type: 'SET_PIPELINE_STEP', step: 'analyze' });

        const allResults: any[] = [];
        const batchSize = 3;
        const ids = [...state.uploadedFileIds];
        for (let i = 0; i < ids.length; i += batchSize) {
          const batch = ids.slice(i, i + batchSize);
          const results = await analyzeFootage(batch);
          allResults.push(...results);
          setAnalyzeProgress({ done: Math.min(i + batchSize, ids.length), total: ids.length });
        }
        dispatch({ type: 'SET_ANALYSIS', results: allResults });
        savePipeline({ analysis_results: allResults });
        currentAnalysis = allResults;
        setAnalyzing(false);
      }

      // 2. CAPTION (Optional)
      if (!currentCaptionSrt && state.apiKeys.openai) {
        setGeneratingCaption(true);
        dispatch({ type: 'SET_PIPELINE_STEP', step: 'caption' });
        const result = await generateCaption(activeAudio!.filename, state.apiKeys.openai);
        dispatch({
          type: 'SET_CAPTION_SRT',
          srt: result.srt,
          srtPath: result.srt_path,
          text: result.text,
        });
        savePipeline({ caption_srt: result.srt, caption_srt_path: result.srt_path });
        currentCaptionSrt = result.srt;
        setGeneratingCaption(false);
      } else if (!currentCaptionSrt) {
        addToast('⚠️ OpenAI Key kosong, melewati proses pembuatan caption SRT.', 'info');
      }

      // 3. TRIM
      if (currentTrimSegments.length === 0) {
        setTrimming(true);
        dispatch({ type: 'SET_PIPELINE_STEP', step: 'trim' });
        const targetDur = state.ttsAudio?.duration || 60;
        const trimResult = await trimFootage(currentAnalysis, targetDur);
        dispatch({ type: 'SET_TRIM_SEGMENTS', segments: trimResult.segments });
        savePipeline({ trim_segments: trimResult.segments });
        currentTrimSegments = trimResult.segments;
        setTrimming(false);
      }

      // 4. CONCAT
      if (!currentConcatPath) {
        setConcating(true);
        dispatch({ type: 'SET_PIPELINE_STEP', step: 'concat' });
        const concatResult = await concatFootage(currentTrimSegments, state.uploadedFileIds);
        dispatch({ type: 'SET_CONCAT_PATH', path: concatResult.output_path });
        savePipeline({ concat_path: concatResult.output_path });
        currentConcatPath = concatResult.output_path;
        setConcating(false);
      }

      // 5. RENDER
      setRendering(true);
      dispatch({ type: 'SET_PIPELINE_STEP', step: 'render' });
      const w = state.outputResolution === '720×1280' ? 720 : 1080;
      const h = state.outputResolution === '720×1280' ? 1280 : 1920;

      let videoPath = currentConcatPath;
      if (currentCaptionSrt) {
        addToast('💬 Membakar subtitle ke video...', 'info');
        const burnResult = await burnCaption(videoPath, currentCaptionSrt, activeAudio!.filename);
        videoPath = burnResult.output_path;
      }

      const audioPath = activeAudio!.filename;
      const renderRes = await renderVideo(videoPath, audioPath, w, h);
      setRenderResult(renderRes);
      dispatch({ type: 'SET_PIPELINE_STEP', step: 'done' });
      
      const outputName = renderRes.output_path.split('/').pop() || 'output.mp4';
      const now = new Date().toISOString();
      const latestScript = state.scriptHistory[0];
      const caption = latestScript ? latestScript.caption : '';
      const duration = latestScript && latestScript.duration ? latestScript.duration : '—';
      
      saveOutputToHistory({
        name: outputName,
        duration: duration,
        size: '—',
        caption,
        created_at: now,
      }).then(res => {
        dispatch({
          type: 'ADD_OUTPUT',
          video: { id: res.id, name: outputName, duration: duration, size: res.size, caption, createdAt: now },
        });
      }).catch(() => {
        dispatch({
          type: 'ADD_OUTPUT',
          video: { name: outputName, duration: duration, size: '—', caption, createdAt: now },
        });
      });
      addToast('🎬 Render selesai! Cek di Output Videos', 'success');

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
      deleteAllFootage().catch(() => {});
      
    } catch (err: any) {
      addToast(`❌ Gagal: ${err.message}`, 'error');
      dispatch({ type: 'SET_PIPELINE_STEP', step: 'idle' });
      setAnalyzing(false);
      setGeneratingCaption(false);
      setTrimming(false);
      setConcating(false);
      setRendering(false);
    }
    setRendering(false); // just in case
  };

  const isAutoProcessing = analyzing || generatingCaption || trimming || concating || rendering;
  const currentProcessLabel = analyzing ? `Menganalisis... ${analyzeProgress.done}/${analyzeProgress.total}`
    : generatingCaption ? 'Transcribing (Whisper)...'
    : trimming ? 'Memotong footage...'
    : concating ? 'Menggabungkan footage...'
    : rendering ? 'Merender Final...'
    : '🚀 1-Click Auto Process';

  let overallProgress = 0;
  if (isAutoProcessing) {
    if (analyzing) {
      overallProgress = 10 + (analyzeProgress.total > 0 ? (analyzeProgress.done / analyzeProgress.total) * 20 : 0);
    } else if (generatingCaption) {
      overallProgress = 45;
    } else if (trimming) {
      overallProgress = 65;
    } else if (concating) {
      overallProgress = 80;
    } else if (rendering) {
      overallProgress = 95;
    }
  }

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
              onClick={handleAutoProcess}
            >
              🚀 1-Click Auto Process
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
