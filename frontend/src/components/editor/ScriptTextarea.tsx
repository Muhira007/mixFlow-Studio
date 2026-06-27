'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { ScriptSourceToggle } from './ScriptSourceToggle';
import { AudioUploader } from './AudioUploader';
import { AudioLibrary } from './AudioLibrary';
import { ResolutionSelector } from './ResolutionSelector';
import { getVoiceSampleUrl, generateTTS, BACKEND_URL, uploadAudioFile } from '@/lib/api';

export function ScriptTextarea() {
  const { state, dispatch, addToast } = useApp();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
              <div className="flex gap-1.5">
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
                    const result = await generateTTS(state.scriptText, state.selectedVoice, apiKey);
                    const audioUrl = `${BACKEND_URL}${result.audio_url}`;
                    dispatch({ type: 'SET_TTS_AUDIO', audio: { url: audioUrl, duration: result.duration } });
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
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              📚 Library Audio — Hasil Generate TTS
            </label>
            <AudioLibrary
              selectedUrl={selectedAudioUrl}
              onSelect={(url, filename) => {
                setSelectedAudioUrl(url);
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
    </Card>
  );
}
