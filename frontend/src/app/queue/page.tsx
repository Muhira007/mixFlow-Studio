'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { Play, Trash2, CheckSquare, Square } from 'lucide-react';
import {
  analyzeFootage,
  generateCaption,
  trimFootage,
  concatFootage,
  burnCaption,
  renderVideo,
  saveOutputToHistory,
  savePipelineState,
  deleteAllFootage
} from '@/lib/api';

export default function QueuePage() {
  const { state, dispatch, addToast } = useApp();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processStatus, setProcessStatus] = useState<string>('');
  
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === state.renderQueue.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(state.renderQueue.map(j => j.id));
    }
  };

  const removeJob = (id: string) => {
    dispatch({ type: 'REMOVE_FROM_RENDER_QUEUE', id });
    const newQueue = state.renderQueue.filter(j => j.id !== id);
    savePipelineState({ render_queue: newQueue }).catch(() => {});
  };

  const deleteSelectedJobs = () => {
    if (selectedIds.length === 0) return;
    
    const newQueue = state.renderQueue.filter(j => !selectedIds.includes(j.id));
    dispatch({ type: 'SET_RENDER_QUEUE', queue: newQueue });
    savePipelineState({ render_queue: newQueue }).catch(() => {});
    setSelectedIds([]);
    addToast(`🗑️ ${selectedIds.length} antrean dihapus`, 'success');
  };

  const processJobs = async () => {
    if (selectedIds.length === 0) {
      addToast('⚠️ Pilih minimal 1 antrean untuk dirender', 'warning');
      return;
    }

    const jobsToProcess = state.renderQueue.filter(j => selectedIds.includes(j.id) && j.status !== 'done');
    
    if (jobsToProcess.length === 0) {
      addToast('⚠️ Tidak ada antrean baru yang dipilih', 'warning');
      return;
    }

    // Create a local copy to track updates for syncing to backend
    let currentQueue = [...state.renderQueue];

    for (const job of jobsToProcess) {
      setProcessingId(job.id);
      dispatch({ type: 'UPDATE_RENDER_QUEUE_JOB', id: job.id, updates: { status: 'processing', progress: 0, error: undefined } });
      
      currentQueue = currentQueue.map(q => q.id === job.id ? { ...q, status: 'processing', progress: 0, error: undefined } : q);
      
      try {
        // 1. Analyze
        setProcessStatus('Menganalisis footage...');
        const allResults: any[] = [];
        const batchSize = 3;
        for (let i = 0; i < job.fileIds.length; i += batchSize) {
          const batch = job.fileIds.slice(i, i + batchSize);
          const results = await analyzeFootage(batch);
          allResults.push(...results);
          const progress = 10 + (Math.min(i + batchSize, job.fileIds.length) / job.fileIds.length) * 20;
          dispatch({ type: 'UPDATE_RENDER_QUEUE_JOB', id: job.id, updates: { progress } });
          currentQueue = currentQueue.map(q => q.id === job.id ? { ...q, progress } : q);
        }

        // 2. Caption
        let srt = null;
        let srtPath = null;
        if (state.apiKeys.openai && job.audio) {
          setProcessStatus('Transcribing (Whisper)...');
          dispatch({ type: 'UPDATE_RENDER_QUEUE_JOB', id: job.id, updates: { progress: 45 } });
          currentQueue = currentQueue.map(q => q.id === job.id ? { ...q, progress: 45 } : q);
          
          const result = await generateCaption(job.audio.filename, state.apiKeys.openai);
          srt = result.srt;
          srtPath = result.srt_path;
        }

        // 3. Trim
        setProcessStatus('Memotong footage...');
        dispatch({ type: 'UPDATE_RENDER_QUEUE_JOB', id: job.id, updates: { progress: 65 } });
        currentQueue = currentQueue.map(q => q.id === job.id ? { ...q, progress: 65 } : q);
        const targetDur = job.audio?.duration || 60;
        const trimResult = await trimFootage(allResults, targetDur);
        
        // 4. Concat
        setProcessStatus('Menggabungkan footage...');
        dispatch({ type: 'UPDATE_RENDER_QUEUE_JOB', id: job.id, updates: { progress: 80 } });
        currentQueue = currentQueue.map(q => q.id === job.id ? { ...q, progress: 80 } : q);
        const concatResult = await concatFootage(trimResult.segments, job.fileIds);
        let videoPath = concatResult.output_path;

        // 5. Render
        setProcessStatus('Merender Final...');
        dispatch({ type: 'UPDATE_RENDER_QUEUE_JOB', id: job.id, updates: { progress: 95 } });
        currentQueue = currentQueue.map(q => q.id === job.id ? { ...q, progress: 95 } : q);
        const w = job.resolution === '720×1280' ? 720 : 1080;
        const h = job.resolution === '720×1280' ? 1280 : 1920;

        if (srt && job.audio) {
          const burnResult = await burnCaption(videoPath, srt, job.audio.filename);
          videoPath = burnResult.output_path;
        }

        if (job.audio) {
          const renderRes = await renderVideo(videoPath, job.audio.filename, w, h);
          const outputName = renderRes.output_path.split('/').pop() || 'output.mp4';
          const now = new Date().toISOString();
          
          const outputData = await saveOutputToHistory({
            name: outputName,
            duration: job.targetDuration || '—',
            size: '—',
            caption: job.caption || '',
            created_at: now,
          }).catch(() => null);

          dispatch({
            type: 'ADD_OUTPUT',
            video: outputData || { name: outputName, duration: job.targetDuration || '—', size: '—', caption: job.caption || '', createdAt: now },
          });
        }

        dispatch({ type: 'UPDATE_RENDER_QUEUE_JOB', id: job.id, updates: { status: 'done', progress: 100 } });
        currentQueue = currentQueue.map(q => q.id === job.id ? { ...q, status: 'done', progress: 100 } : q);
        addToast(`✅ ${job.name} selesai dirender!`, 'success');

      } catch (err: any) {
        dispatch({ type: 'UPDATE_RENDER_QUEUE_JOB', id: job.id, updates: { status: 'error', error: err.message } });
        currentQueue = currentQueue.map(q => q.id === job.id ? { ...q, status: 'error', error: err.message } : q);
        addToast(`❌ ${job.name} gagal: ${err.message}`, 'error');
      }

      // Sync queue to backend after each job completes
      savePipelineState({ render_queue: currentQueue }).catch(() => {});
    }

    setProcessingId(null);
    setProcessStatus('');
    setSelectedIds([]);
  };

  return (
    <div className="animate-fade-slide-in space-y-6">
      <div className="flex flex-wrap justify-between items-end mb-5 gap-4">
        <div>
          <h1 className="text-[1.4rem] font-bold mb-0.5 leading-tight">Antrean Render</h1>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            Daftar video yang siap diproses secara massal (Bulk Render).
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              onClick={deleteSelectedJobs}
              disabled={processingId !== null}
              className="text-red-400 hover:bg-red-500 hover:text-white border-red-500/20"
            >
              <Trash2 size={16} className="mr-2" />
              Hapus Terpilih
            </Button>
          )}
          <Button
            variant="primary"
            onClick={processJobs}
            disabled={selectedIds.length === 0 || processingId !== null}
            className="shadow-[0_0_15px_var(--accent-glow)] hover:shadow-[0_0_20px_var(--accent)]"
          >
            <Play size={16} className="mr-2" />
            {processingId ? 'Memproses...' : `Render Terpilih (${selectedIds.length})`}
          </Button>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-0 ring-1 ring-[var(--border)] p-0 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr className="bg-[var(--bg-secondary)]/80 border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="py-4 px-5 font-semibold w-12 text-center">
                  <button onClick={selectAll} className="hover:text-[var(--text-primary)] transition-colors">
                    {selectedIds.length === state.renderQueue.length && state.renderQueue.length > 0 ? (
                      <CheckSquare size={16} className="text-[var(--accent)]" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="py-4 px-5 font-semibold">Nama Antrean</th>
                <th className="py-4 px-5 font-semibold text-center">Footage</th>
                <th className="py-4 px-5 font-semibold text-center">Resolusi</th>
                <th className="py-4 px-5 font-semibold text-center">Status</th>
                <th className="py-4 px-5 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {state.renderQueue.length > 0 ? (
                state.renderQueue.map((job) => (
                  <tr key={job.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-card)] transition-colors">
                    <td className="py-4 px-5 text-center">
                      <button 
                        onClick={() => toggleSelect(job.id)}
                        disabled={job.status === 'processing' || processingId !== null}
                        className="disabled:opacity-50"
                      >
                        {selectedIds.includes(job.id) ? (
                          <CheckSquare size={16} className="text-[var(--accent)]" />
                        ) : (
                          <Square size={16} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-[var(--text-primary)]">{job.name}</div>
                      <div className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                        {new Date(job.createdAt).toLocaleString('id-ID')}
                      </div>
                      {processingId === job.id && (
                        <div className="mt-2 relative w-full h-1.5 rounded-full bg-[var(--bg-input)] overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-[var(--accent)] transition-all duration-300" 
                            style={{ width: `${job.progress || 0}%` }} 
                          />
                        </div>
                      )}
                      {processingId === job.id && (
                        <div className="text-[0.65rem] text-[var(--accent)] mt-1 font-medium">
                          {processStatus}
                        </div>
                      )}
                      {job.error && (
                        <div className="text-[0.65rem] text-red-400 mt-1 font-medium">
                          Gagal: {job.error}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center text-[var(--text-secondary)]">
                      {job.fileIds.length} klip
                    </td>
                    <td className="py-4 px-5 text-center text-[var(--text-secondary)]">
                      {job.resolution}
                    </td>
                    <td className="py-4 px-5 text-center">
                      {job.status === 'queued' && <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded font-medium">Antre</span>}
                      {job.status === 'processing' && <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs rounded font-medium">Memproses...</span>}
                      {job.status === 'done' && <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs rounded font-medium">Selesai</span>}
                      {job.status === 'error' && <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs rounded font-medium">Gagal</span>}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 hover:bg-red-500 hover:text-white border-red-500/20 px-2 h-8"
                        onClick={() => removeJob(job.id)}
                        disabled={job.status === 'processing' || processingId !== null}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center opacity-80">
                      <div className="w-16 h-16 rounded-full bg-[var(--bg-input)] flex items-center justify-center mb-4">
                        <span className="text-3xl">⏳</span>
                      </div>
                      <p className="text-base font-semibold text-[var(--text-primary)] mb-1">Antrean Kosong</p>
                      <p className="text-sm text-[var(--text-secondary)] max-w-xs leading-relaxed">
                        Tambahkan video dari Video Editor ke antrean untuk merender secara massal.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
