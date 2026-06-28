'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { ScriptSourceToggle } from './ScriptSourceToggle';
import { AudioUploader } from './AudioUploader';
import { AudioLibrary } from './AudioLibrary';
import { ResolutionSelector } from './ResolutionSelector';
import { getVoiceSampleUrl, generateTTS, BACKEND_URL, uploadAudioFile, deleteAllTTSAudio } from '@/lib/api';
import { Trash2, Eye, Send } from 'lucide-react';
import { jsPDF } from 'jspdf';

export function ScriptTextarea() {
  const { state, dispatch, addToast } = useApp();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showScriptPopup, setShowScriptPopup] = useState(false);

  const handlePlayPreview = () => {
    // Try blob URL first, fallback to backend URL
    let url = state.audioSamples[state.selectedVoice];
    if (!url) url = getVoiceSampleUrl(state.selectedVoice);

    if (playingId === state.selectedVoice) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) audioRef.current.pause();

    const audio = new Audio(url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlayingId(state.selectedVoice);
  };

  const handleSendToTelegram = async () => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      doc.setFontSize(12);
      
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxLineWidth = pageWidth - margin * 2;
      
      const paragraphs = state.scriptText.replace(/([.?!])\s+/g, "$1\n\n").split('\n');
      
      let y = 20;
      paragraphs.forEach((p) => {
        if (!p.trim()) return;
        const lines = doc.splitTextToSize(p.trim(), maxLineWidth);
        lines.forEach((line: string) => {
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, margin, y);
          y += 7;
        });
        y += 3; // jarak antar paragraf
      });
      
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], 'Naskah_Voice_Over.pdf', { type: 'application/pdf' });
      
      // Cara 2: Gunakan Web Share API (otomatis attach file tanpa drag & drop)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Naskah Voice-Over',
          text: 'Berikut naskah voice-over dalam bentuk PDF.',
        });
        addToast('📤 Membuka menu Share. Silakan pilih Telegram Desktop.', 'success');
      } else {
        // Fallback jika OS tidak mendukung Share API
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Naskah_Voice_Over.pdf';
        a.click();
        URL.revokeObjectURL(url);
        
        try {
          await navigator.clipboard.writeText(state.scriptText);
        } catch (e) {}

        addToast('📥 PDF diunduh & teks disalin. Membuka Telegram...', 'info');
        
        setTimeout(() => {
          window.location.href = 'tg://msg';
        }, 600);
      }
    } catch (err: any) {
      addToast(`❌ Gagal: ${err.message}`, 'error');
    }
  };

  const [selectedAudioUrl, setSelectedAudioUrl] = useState<string | null>(null);
  const selectedVoiceData = state.ttsVoices.find(v => v.voiceId === state.selectedVoice);
  const hasSample = !!state.audioSamples[state.selectedVoice] || selectedVoiceData?.hasSample;
  const isPlaying = playingId === state.selectedVoice;

  return (
    <Card header="Naskah Voice-Over & TTS" icon="🎙️">
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Paste naskah voice-over
              </label>
              {state.scriptText.trim() && (
                <button
                  type="button"
                  className="text-[0.65rem] text-[var(--accent)] hover:text-white flex items-center gap-1 font-medium bg-[var(--accent)]/10 hover:bg-[var(--accent)] px-2 py-1 rounded transition-colors"
                  onClick={() => setShowScriptPopup(true)}
                  title="Lihat Naskah Penuh"
                >
                  <Eye size={12} />
                  Lihat Penuh
                </button>
              )}
            </div>
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
              <div className="flex gap-1.5 mb-3">
                <select
                  className="flex-1 px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-none transition-all cursor-pointer appearance-none"
                  value={state.selectedVoice}
                  onChange={(e) => dispatch({ type: 'SET_VOICE', voice: e.target.value })}
                >
                  {state.ttsVoices.map((v) => (
                    <option key={v.voiceId} value={v.voiceId}>
                      {v.name} · {v.gender === 'Female' ? '♀' : v.gender === 'Male' ? '♂' : ''} · {v.label}
                    </option>
                  ))}
                </select>
                {hasSample && (
                  <button
                    type="button"
                    className={`shrink-0 px-3 rounded-lg text-xs font-semibold transition-all ${
                      isPlaying
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'bg-[var(--accent)]/10 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white'
                    }`}
                    onClick={handlePlayPreview}
                    title={isPlaying ? 'Stop' : 'Preview suara'}
                  >
                    {isPlaying ? '⏹' : '▶'}
                  </button>
                )}
              </div>

              {/* TTS Mini Settings */}
              <div className="p-2.5 bg-[var(--bg)]/50 rounded-lg border border-[var(--border)]">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[0.65rem] font-semibold text-[var(--text-secondary)]">
                    Similarity Boost
                  </label>
                  <span className="text-[0.65rem] font-bold text-[var(--accent)]">{state.settings.ttsSimilarityBoost.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.settings.ttsSimilarityBoost}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    dispatch({ type: 'SET_SETTING', key: 'ttsSimilarityBoost', value: v });
                  }}
                  className="w-full accent-[var(--accent)] mb-2"
                />

                <div className="flex items-center justify-between mb-1">
                  <label className="text-[0.65rem] font-semibold text-[var(--text-secondary)]">
                    Stability
                  </label>
                  <span className="text-[0.65rem] font-bold text-[var(--accent)]">{state.settings.ttsStability.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.settings.ttsStability}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    dispatch({ type: 'SET_SETTING', key: 'ttsStability', value: v });
                  }}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button
                variant="primary"
                block
                loading={state.pipelineStep === 'tts' && !state.ttsAudio}
                onClick={async () => {
                  if (!state.scriptText.trim()) {
                    addToast('⚠️ Masukkan naskah terlebih dahulu', 'warning');
                    return;
                  }
                  const apiKey = state.apiKeys.elevenlabs;
                  if (!apiKey) {
                    addToast('🔑 Isi ElevenLabs API Key di Settings', 'warning');
                    return;
                  }
                  dispatch({ type: 'SET_PIPELINE_STEP', step: 'tts' });
                  dispatch({ type: 'SET_TTS_AUDIO', audio: null });
                  try {
                    const result = await generateTTS(
                      state.scriptText, state.selectedVoice, apiKey,
                      state.settings.ttsStability, state.settings.ttsSimilarityBoost,
                    );
                    const audioUrl = `${BACKEND_URL}${result.audio_url}`;
                    dispatch({ type: 'SET_TTS_AUDIO', audio: { url: audioUrl, filename: result.filename, duration: result.duration } });
                    addToast(`🔊 TTS berhasil — ${result.duration} detik, ${result.chunks} chunk`, 'success');
                  } catch (err: any) {
                    const msg = err.message || 'Unknown error';
                    // Kategorikan error untuk pesan yang lebih helpful
                    if (msg.includes('401') || msg.includes('API Key')) {
                      addToast('🔑 API Key ElevenLabs tidak valid. Cek di Settings.', 'error');
                    } else if (msg.includes('429') || msg.includes('Kuota') || msg.includes('quota')) {
                      addToast('💰 Kuota ElevenLabs habis. Upgrade plan atau tunggu reset.', 'error');
                    } else if (msg.includes('konek') || msg.includes('timeout') || msg.includes('Connect')) {
                      addToast('🌐 Gagal konek ke ElevenLabs. Cek internet.', 'error');
                    } else {
                      addToast(`❌ Gagal TTS: ${msg}`, 'error');
                    }
                    dispatch({ type: 'SET_PIPELINE_STEP', step: 'idle' });
                  }
                }}
              >
                🔊 Generate TTS
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="mb-3.5">
          {/* Upload baru */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Upload Audio Baru
            </label>
            <AudioUploader
              file={state.uploadedAudio}
              onChange={async (file) => {
                dispatch({ type: 'SET_UPLOADED_AUDIO', file });
                if (file) {
                  try {
                    const result = await uploadAudioFile(file);
                    addToast(`📤 Terupload: ${result.filename}`, 'success');
                  } catch {
                    addToast('⚠️ Gagal upload ke server', 'warning');
                  }
                }
              }}
            />
            {state.uploadedAudio && (
              <div className="mt-2">
                <Button
                  variant="primary"
                  block
                  size="sm"
                  onClick={() => {
                    dispatch({ type: 'SET_PIPELINE_STEP', step: 'tts' });
                    addToast('🎵 Audio siap — durasi akan diambil via FFprobe', 'info');
                  }}
                >
                  🎵 Gunakan Audio Ini
                </Button>
              </div>
            )}
          </div>

          {/* Library: hasil TTS sebelumnya */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                📚 Library Audio — Hasil Generate TTS
              </label>
              <button
                type="button"
                className="text-[0.65rem] text-red-500 hover:text-red-600 flex items-center gap-1 font-medium bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={12} />
                Delete All
              </button>
            </div>
            <AudioLibrary
              selectedUrl={selectedAudioUrl}
              onSelect={(url, filename) => {
                setSelectedAudioUrl(url);
                const fullUrl = `${BACKEND_URL}/api/tts/audio/${filename}`;
                dispatch({ type: 'SET_LIBRARY_AUDIO', audio: { url: fullUrl, filename } });
                dispatch({ type: 'SET_PIPELINE_STEP', step: 'tts' });
                addToast(`📁 Dipilih: ${filename}`);
              }}
            />
            {selectedAudioUrl && (
              <div className="mt-2">
                <Button
                  variant="primary"
                  block
                  size="sm"
                  onClick={() => {
                    dispatch({ type: 'SET_PIPELINE_STEP', step: 'tts' });
                    addToast('🎵 Audio dari library siap!', 'info');
                  }}
                >
                  🎵 Gunakan Audio dari Library
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resolution Selector */}
      <ResolutionSelector
        resolution={state.outputResolution}
        onChange={(resolution) => dispatch({ type: 'SET_OUTPUT_RESOLUTION', resolution })}
      />
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-slide-in">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-center mb-2 text-[var(--text-primary)]">Hapus Semua Audio?</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-6 leading-relaxed">
              Tindakan ini akan menghapus <strong>seluruh file TTS</strong> yang pernah dibuat. File yang dihapus tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" block onClick={() => setShowDeleteConfirm(false)}>
                Batal
              </Button>
              <Button 
                variant="primary" 
                block 
                className="bg-red-500 hover:bg-red-600 text-white border-none"
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  try {
                    const res = await deleteAllTTSAudio();
                    addToast(`🗑️ ${res.count} file TTS dihapus`, 'success');
                    window.dispatchEvent(new Event('refreshAudioLibrary'));
                  } catch (e) {
                    addToast('Gagal menghapus semua TTS', 'error');
                  }
                }}
              >
                Ya, Hapus Semua
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Script Popup Modal */}
      {showScriptPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-6 w-[90%] max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-slide-in">
            <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Eye size={20} className="text-[var(--accent)]" />
                Naskah Voice-Over
              </h3>
              <button 
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
                onClick={() => setShowScriptPopup(false)}
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto mb-4 bg-[var(--bg-secondary)] rounded-xl p-4 md:p-8 border border-[var(--border)] relative">
              <div className="bg-white rounded shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-8 md:p-10 w-full max-w-2xl mx-auto min-h-fit text-left h-auto">
                <div className="text-gray-900 text-lg md:text-xl leading-[1.8] font-serif selection:bg-purple-200 selection:text-gray-900">
                  {state.scriptText
                    .replace(/([.?!])\s+/g, "$1\n\n")
                    .split('\n')
                    .map((paragraph, idx) => 
                      paragraph.trim() ? (
                        <p key={idx} className="mb-4 last:mb-0">
                          {paragraph.trim()}
                        </p>
                      ) : null
                    )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline"
                className="border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                onClick={handleSendToTelegram}
                title="Kirim naskah sebagai PDF ke Telegram Desktop"
              >
                <Send size={16} className="-mr-0.5" />
                Send to Telegram (.pdf)
              </Button>
              <Button variant="primary" onClick={() => setShowScriptPopup(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
