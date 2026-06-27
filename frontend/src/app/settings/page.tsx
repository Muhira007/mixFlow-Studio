'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ApiKeyInput } from '@/components/settings/ApiKeyInput';
import { VideoSettings } from '@/components/settings/VideoSettings';
import { DangerZone } from '@/components/settings/DangerZone';
import { ContentRules } from '@/components/script-gen/ContentRules';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { STORAGE_KEY } from '@/lib/constants';
import { createVoice as apiCreateVoice, removeVoice as apiRemoveVoice, saveApiKey, saveSetting, uploadVoiceSample, getVoiceSampleUrl, BACKEND_URL, deleteAllTTSAudio } from '@/lib/api';

export default function SettingsPage() {
  const { state, dispatch, addToast } = useApp();

  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceId, setNewVoiceId] = useState('');
  const [newLanguage, setNewLanguage] = useState('Indonesia');
  const [newGender, setNewGender] = useState('Female');
  const [newLabel, setNewLabel] = useState('Narasi');

  // Audio player state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleUploadSample = async (voiceId: string, file: File) => {
    // Revoke old blob URL if exists
    const old = state.audioSamples[voiceId];
    if (old && old.startsWith('blob:')) {
      try { URL.revokeObjectURL(old); } catch {}
    }
    // Create blob URL for instant playback
    const blobUrl = URL.createObjectURL(file);
    dispatch({ type: 'SET_AUDIO_SAMPLE', voiceId, url: blobUrl });

    // Upload to backend
    setUploadingId(voiceId);
    setUploadError(null);
    try {
      await uploadVoiceSample(voiceId, file);
      setUploadingId(null);
      addToast('🔊 Sample audio tersimpan!', 'success');
    } catch (err: any) {
      setUploadingId(null);
      setUploadError(voiceId);
      console.error('Upload sample gagal:', err);
      addToast(`❌ Gagal upload: ${err.message || 'backend tidak tersedia'}`, 'error');
    }
  };

  const handlePlayPause = (voiceId: string) => {
    // Try blob URL first, fallback to backend URL (persisted)
    let url = state.audioSamples[voiceId];
    if (!url) {
      url = getVoiceSampleUrl(voiceId);
    }

    if (playingId === voiceId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      addToast('⚠️ Gagal memutar sample', 'warning');
    };
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlayingId(voiceId);
  };

  const ttsFields = [
    {
      id: 'apiKeyElevenlabs',
      label: 'Eleven Labs API Key',
      placeholder: 'el_xxxxxxxxxxxxx',
      hint: 'elevenlabs.io → Profile → API Key',
    },
  ];

  const aiFields = [
    {
      id: 'apiKeyDeepseek',
      label: 'DeepSeek API Key',
      placeholder: 'sk-xxxxxxxxxxxxx',
      hint: 'platform.deepseek.com → API Keys',
    },
    {
      id: 'apiKeyGemini',
      label: 'Google Gemini API Key',
      placeholder: 'AIza...',
      hint: 'aistudio.google.com → Get API Key',
    },
    {
      id: 'apiKeyOpenai',
      label: 'OpenAI API Key',
      placeholder: 'sk-proj-...',
      hint: 'platform.openai.com → API Keys',
    },
  ];

  const handleApiKeyChange = (id: string, value: string) => {
    const keyMap: Record<string, keyof typeof state.apiKeys> = {
      apiKeyElevenlabs: 'elevenlabs',
      apiKeyDeepseek: 'deepseek',
      apiKeyGemini: 'gemini',
      apiKeyOpenai: 'openai',
    };
    if (keyMap[id]) {
      dispatch({ type: 'SET_API_KEY', provider: keyMap[id], value });
      // Sync ke backend SQLite
      saveApiKey(keyMap[id], value).catch(() => {});
    }
  };

  const handleAddVoice = async () => {
    if (!newVoiceName.trim()) {
      addToast('⚠️ Masukkan nama voice', 'warning');
      return;
    }
    if (!newVoiceId.trim()) {
      addToast('⚠️ Masukkan Voice ID', 'warning');
      return;
    }
    const voice = {
      name: newVoiceName.trim(),
      voiceId: newVoiceId.trim(),
      language: newLanguage,
      gender: newGender,
      label: newLabel,
    };

    // Simpan ke backend SQLITE dulu — baru dispatch kalau berhasil
    try {
      await apiCreateVoice({
        name: voice.name,
        voice_id: voice.voiceId,
        language: voice.language,
        gender: voice.gender,
        label: voice.label,
      });
    } catch (err: any) {
      console.error('Gagal simpan voice:', err);
      addToast(`❌ Gagal simpan: ${err.message || 'backend tidak tersedia'}`, 'error');
      return;
    }

    dispatch({ type: 'ADD_TTS_VOICE', voice });
    setNewVoiceName('');
    setNewVoiceId('');
    addToast('🎙️ Voice ditambahkan!');
  };

  // Build values map
  const ttsValues: Record<string, string> = {
    apiKeyElevenlabs: state.apiKeys.elevenlabs,
  };

  const aiValues: Record<string, string> = {
    apiKeyDeepseek: state.apiKeys.deepseek,
    apiKeyGemini: state.apiKeys.gemini,
    apiKeyOpenai: state.apiKeys.openai,
  };

  return (
    <div className="animate-fade-slide-in">
      <div className="mb-5">
        <h1 className="text-[1.4rem] font-bold mb-0.5 leading-tight">
          ⚙️ Settings & API Keys
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          Konfigurasi API keys untuk layanan eksternal. Kunci disimpan di localStorage browser, tidak dikirim ke server.
        </p>
      </div>

      <ApiKeyInput
        title="Eleven Labs — Text-to-Speech"
        icon="🔊"
        fields={ttsFields}
        values={ttsValues}
        onChange={handleApiKeyChange}
      />

      {/* ── TTS Voice List ── */}
      <Card header="Daftar Suara TTS" icon="🎙️">
        {/* Existing voices */}
        {state.ttsVoices.length > 0 && (
          <div className="space-y-3 mb-4">
            {state.ttsVoices.map((v, i) => {
              const blobExists = !!state.audioSamples[v.voiceId];
              const hasSample = blobExists || v.hasSample;
              const isPlaying = playingId === v.voiceId;
              const isUploading = uploadingId === v.voiceId;
              const hasError = uploadError === v.voiceId;

              return (
              <div
                key={i}
                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl overflow-hidden"
              >
                {/* Voice info row */}
                <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {v.name}
                    </span>
                    <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
                      {v.language === 'Indonesia' ? '🇮🇩' : v.language === 'English' ? '🇺🇸' : '🇯🇵'}
                    </span>
                    <span className="text-[0.6rem] text-[var(--text-muted)]">
                      {v.gender === 'Female' ? '♀' : v.gender === 'Male' ? '♂' : '⚧'}
                    </span>
                    <span className="text-[0.6rem] text-[var(--text-muted)]">{v.label}</span>
                    <code className="text-[0.6rem] text-[var(--text-muted)] truncate max-w-[180px]">{v.voiceId}</code>
                  </div>
                  <button
                    className="text-[var(--danger)] hover:bg-[var(--danger)]/10 text-sm shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                    onClick={async () => {
                      dispatch({ type: 'REMOVE_TTS_VOICE', index: i });
                      try { await apiRemoveVoice(v.voiceId); } catch {}
                      addToast('🗑️ Voice dihapus');
                    }}
                    title="Hapus"
                  >
                    ✕
                  </button>
                </div>

                {/* Audio controls — compact icons */}
                <div className="border-t border-[var(--border)] px-3 py-1.5 flex items-center gap-1.5 bg-[var(--bg)]/50">
                  {isUploading ? (
                    <span className="text-xs text-yellow-500 font-medium">⏳ uploading...</span>
                  ) : hasError ? (
                    <span className="text-xs text-red-500 font-medium">❌ gagal</span>
                  ) : (
                    <>
                      <button
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                          !hasSample ? 'opacity-25 pointer-events-none text-[var(--text-muted)]' :
                          isPlaying
                            ? 'bg-[var(--accent)] text-white'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]'
                        }`}
                        onClick={() => hasSample && handlePlayPause(v.voiceId)}
                        disabled={!hasSample}
                        title={isPlaying ? 'Stop' : 'Play'}
                      >
                        {isPlaying ? '⏹' : '▶'}
                      </button>
                      <label className="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all text-[var(--text-secondary)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]" title={blobExists ? 'Ganti sample' : 'Upload sample'}>
                        {blobExists ? '🔄' : '📂'}
                        <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadSample(v.voiceId, file);
                          e.target.value = '';
                        }} />
                      </label>
                      {hasSample && (
                        <span className="text-[0.6rem] text-[var(--success)] font-medium ml-0.5">✓</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}

        {/* Add new voice */}
        <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
          ➕ Tambah Voice Baru
        </div>
        <div className="grid grid-cols-2 max-md:grid-cols-1 gap-2 mb-2">
          <input
            type="text"
            className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-none transition-all"
            placeholder="Nama (contoh: Bram, Senja)"
            value={newVoiceName}
            onChange={(e) => setNewVoiceName(e.target.value)}
          />
          <input
            type="text"
            className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-none transition-all"
            placeholder="ElevenLabs Voice ID"
            value={newVoiceId}
            onChange={(e) => setNewVoiceId(e.target.value)}
          />
          <select
            className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-none transition-all cursor-pointer"
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
          >
            <option value="Indonesia">🇮🇩 Indonesia</option>
            <option value="English">🇺🇸 English</option>
            <option value="Japanese">🇯🇵 Japanese</option>
            <option value="Arabic">🇸🇦 Arabic</option>
            <option value="Korean">🇰🇷 Korean</option>
            <option value="Chinese">🇨🇳 Chinese</option>
            <option value="Hindi">🇮🇳 Hindi</option>
            <option value="Spanish">🇪🇸 Spanish</option>
            <option value="French">🇫🇷 French</option>
            <option value="German">🇩🇪 German</option>
            <option value="Portuguese">🇧🇷 Portuguese</option>
            <option value="Dutch">🇳🇱 Dutch</option>
            <option value="Other">🌐 Other</option>
          </select>
          <select
            className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-none transition-all cursor-pointer"
            value={newGender}
            onChange={(e) => setNewGender(e.target.value)}
          >
            <option value="Female">♀ Female</option>
            <option value="Male">♂ Male</option>
            <option value="Neutral">⚧ Neutral</option>
          </select>
        </div>
        <div className="mb-2">
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Label / Use Case
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['Narasi', 'Sosial Media', 'Iklan', 'Edukasi', 'Podcast', 'Storytelling', 'Gaming/NPC', 'Review'].map((opt) => (
              <button
                key={opt}
                type="button"
                className={`text-[0.68rem] px-2.5 py-1 rounded-md border transition-all ${
                  newLabel === opt
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white font-semibold'
                    : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                }`}
                onClick={() => setNewLabel(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleAddVoice}>
          ➕ Tambah Voice
        </Button>
      </Card>

      <ApiKeyInput
        title="AI Providers — Script Generator"
        icon="🧠"
        fields={aiFields}
        values={aiValues}
        onChange={handleApiKeyChange}
      />

      <VideoSettings
        minKeepDuration={state.settings.minKeepDuration}
        outputFormat={state.settings.outputFormat}
        videoCodec={state.settings.videoCodec}
        onMinKeepChange={(v) => { dispatch({ type: 'SET_SETTING', key: 'minKeepDuration', value: v }); saveSetting('minKeepDuration', String(v)).catch(() => {}); }}
        onFormatChange={(v) => { dispatch({ type: 'SET_SETTING', key: 'outputFormat', value: v }); saveSetting('outputFormat', v).catch(() => {}); }}
        onCodecChange={(v) => { dispatch({ type: 'SET_SETTING', key: 'videoCodec', value: v }); saveSetting('videoCodec', v).catch(() => {}); }}
      />

      <ContentRules />

      <DangerZone
        onClearFootage={() => {
          dispatch({ type: 'CLEAR_FILES' });
          addToast('🗑️ Semua footage dihapus');
        }}
        onClearOutputs={() => {
          dispatch({ type: 'CLEAR_OUTPUTS' });
          addToast('🗑️ Semua output dihapus');
        }}
        onClearAudio={async () => {
          try {
            const result = await deleteAllTTSAudio();
            addToast(`🎵 ${result.count} file audio TTS dihapus`);
          } catch {
            addToast('❌ Gagal menghapus audio', 'error');
          }
        }}
        onResetAll={() => {
          dispatch({ type: 'RESET_ALL' });
          addToast('⚡ Semua konfigurasi direset ke default');
        }}
      />

      <Button
        variant="primary"
        size="lg"
        className="mt-4"
        onClick={() => {
          try {
            const toSave = {
              apiKeys: state.apiKeys,
              settings: state.settings,
              ttsVoices: state.ttsVoices,
              selectedVoice: state.selectedVoice,
              outputResolution: state.outputResolution,
              scriptHistory: state.scriptHistory,
              outputHistory: state.outputHistory,
              uploadedFileMeta: state.uploadedFileMeta,
              scriptSource: state.scriptSource,
              scriptText: state.scriptText,
              pipelineStep: state.pipelineStep,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
            addToast('💾 Konfigurasi tersimpan!');
          } catch (e) {
            addToast('❌ Gagal menyimpan — storage penuh atau error', 'error');
          }
        }}
      >
        💾 Simpan Konfigurasi
      </Button>
    </div>
  );
}
