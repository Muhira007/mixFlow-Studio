'use client';

import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ApiKeyInput } from '@/components/settings/ApiKeyInput';
import { VideoSettings } from '@/components/settings/VideoSettings';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { STORAGE_KEY } from '@/lib/constants';
import { createVoice as apiCreateVoice, removeVoice as apiRemoveVoice, saveApiKey, saveSetting, uploadVoiceSample, getVoiceSampleUrl, BACKEND_URL, deleteAllTTSAudio, deleteAllFootage, deleteAllOutputs } from '@/lib/api';
import { CloneVoice } from '@/components/settings/CloneVoice';

export default function SettingsPage() {
  const { state, dispatch, addToast } = useApp();

  const [newVoiceName, setNewVoiceName] = useState('');
  const [newVoiceId, setNewVoiceId] = useState('');
  const [newLanguage, setNewLanguage] = useState('Indonesia');
  const [newGender, setNewGender] = useState('Female');
  const [newLabel, setNewLabel] = useState('Narasi');
  const [activeTab, setActiveTab] = useState<'api' | 'voice' | 'video'>('api');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
      hasSample: false,
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
    <div className="animate-fade-slide-in pb-10">
      <div className="mb-5">
        <h1 className="text-[1.4rem] font-bold mb-1 leading-tight">
          ⚙️ Settings & API Keys
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-2xl mb-4">
          Konfigurasi aplikasi, API keys, dan manajemen suara (TTS). Konfigurasi tersimpan lokal atau tersinkronisasi di server lokal Anda.
        </p>
        <div className="flex gap-2">
          <Button 
            variant="primary" 
            className="shadow-md hover:shadow-lg transition-all"
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
                addToast('💾 Konfigurasi UI tersimpan di browser!');
              } catch (e) {
                addToast('❌ Gagal menyimpan — storage penuh atau error', 'error');
              }
            }}
          >
            💾 Simpan Konfigurasi UI
          </Button>
          <Button 
            variant="danger" 
            className="shadow-md hover:shadow-lg transition-all"
            onClick={() => setShowResetConfirm(true)}
          >
            ⚡ Reset Semua
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {[
          { id: 'api', label: '🔑 API Keys' },
          { id: 'voice', label: '🎙️ Voice & TTS' },
          { id: 'video', label: '🎬 Video & Pipeline' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20 hover:brightness-110'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {/* TAB: API KEYS */}
        {activeTab === 'api' && (
          <div className="animate-fade-in space-y-6">
            <ApiKeyInput
              title="Eleven Labs — Text-to-Speech"
              icon="🔊"
              fields={ttsFields}
              values={ttsValues}
              onChange={handleApiKeyChange}
            />
            <ApiKeyInput
              title="AI Providers — Script Generator"
              icon="🧠"
              fields={aiFields}
              values={aiValues}
              onChange={handleApiKeyChange}
            />
          </div>
        )}

        {/* TAB: VOICE & TTS */}
        {activeTab === 'voice' && (
          <div className="animate-fade-in grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <div className="space-y-6 flex flex-col">
              <Card header="🎛️ Voice Settings — Aksen & Gaya Bicara" icon="🎚️">
              <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                Kontrol seberapa kuat suara clone vs model standar multilingual.
                <br />
                <span className="text-[var(--accent)] font-medium">Clone voice</span> butuh
                similarity rendah (~0.45) supaya pelafalan lebih natural.
              </p>

              {/* Stability */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    🎯 Stabilitas
                  </label>
                  <span className="text-xs font-bold text-[var(--accent)]">{state.settings.ttsStability.toFixed(2)}</span>
                </div>
                <p className="text-[0.65rem] text-[var(--text-muted)] mb-2 leading-tight">
                  Mengontrol emosi dan intonasi AI. Nilai rendah membuat AI bicara lebih ekspresif dan dinamis, sedangkan nilai tinggi membuatnya lebih konsisten, datar, dan monoton.
                </p>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.settings.ttsStability}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    dispatch({ type: 'SET_SETTING', key: 'ttsStability', value: v });
                    saveSetting('ttsStability', String(v)).catch(() => {});
                  }}
                  className="w-full accent-[var(--accent)]"
                />
                <div className="flex justify-between text-[0.6rem] text-[var(--text-muted)]">
                  <span>0 = ekspresif</span>
                  <span>1 = stabil/monoton</span>
                </div>
              </div>

              {/* Similarity Boost */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    🗣️ Similarity Boost <span className="text-[var(--warning)] font-normal">(penting!)</span>
                  </label>
                  <span className="text-xs font-bold text-[var(--accent)]">{state.settings.ttsSimilarityBoost.toFixed(2)}</span>
                </div>
                <p className="text-[0.65rem] text-[var(--text-muted)] mb-2 leading-tight">
                  Seberapa kuat AI dipaksa meniru suara asli. Nilai tinggi akan sangat mirip aslinya namun rawan kaku/aneh. <strong className="text-[var(--accent)] font-medium">Turunkan ke ~0.45</strong> jika pelafalan AI dalam Bahasa Indonesia terdengar canggung.
                </p>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.settings.ttsSimilarityBoost}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    dispatch({ type: 'SET_SETTING', key: 'ttsSimilarityBoost', value: v });
                    saveSetting('ttsSimilarityBoost', String(v)).catch(() => {});
                  }}
                  className="w-full accent-[var(--accent)]"
                />
                <div className="flex justify-between text-[0.6rem] text-[var(--text-muted)]">
                  <span>0 = netral</span>
                  <span>1 = aksen kuat</span>
                </div>
              </div>
            </Card>

            <CloneVoice />
            </div>

            <div className="space-y-6 flex flex-col">
              <Card header="Daftar Suara TTS" icon="🎙️" className="h-full">
                {/* Add new voice */}
              <div className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-4 mb-5">
                <div className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">➕</span> 
                  Tambah Voice Baru
                </div>
                <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3 mb-3">
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm outline-hidden focus:border-[var(--accent)] transition-all"
                    placeholder="Nama (contoh: Bram, Senja)"
                    value={newVoiceName}
                    onChange={(e) => setNewVoiceName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm outline-hidden focus:border-[var(--accent)] transition-all"
                    placeholder="ElevenLabs Voice ID"
                    value={newVoiceId}
                    onChange={(e) => setNewVoiceId(e.target.value)}
                  />
                  <select
                    className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm outline-hidden focus:border-[var(--accent)] transition-all cursor-pointer"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                  >
                    <option value="Indonesia">🇮🇩 Indonesia</option>
                    <option value="English">🇺🇸 English</option>
                    <option value="Japanese">🇯🇵 Japanese</option>
                    <option value="Other">🌐 Other</option>
                  </select>
                  <select
                    className="w-full px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm outline-hidden focus:border-[var(--accent)] transition-all cursor-pointer"
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                  >
                    <option value="Female">♀ Female</option>
                    <option value="Male">♂ Male</option>
                    <option value="Neutral">⚧ Neutral</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    Label / Use Case
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Narasi', 'Sosial Media', 'Iklan', 'Edukasi', 'Podcast', 'Storytelling'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`text-[0.7rem] px-3 py-1.5 rounded-lg border transition-all ${
                          newLabel === opt
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white font-semibold shadow-md shadow-[var(--accent)]/20'
                            : 'bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                        }`}
                        onClick={() => setNewLabel(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={handleAddVoice} className="w-full sm:w-auto">
                  Simpan Voice
                </Button>
              </div>

              {/* Existing voices */}
              {state.ttsVoices.length > 0 ? (
                <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
                  {state.ttsVoices.map((v, i) => {
                    const blobExists = !!state.audioSamples[v.voiceId];
                    const hasSample = blobExists || v.hasSample;
                    const isPlaying = playingId === v.voiceId;
                    const isUploading = uploadingId === v.voiceId;
                    const hasError = uploadError === v.voiceId;

                    return (
                    <div
                      key={i}
                      className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--accent)]/50 transition-all flex flex-col"
                    >
                      <div className="flex items-start justify-between p-3 flex-1">
                        <div className="min-w-0 pr-2">
                          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate mb-1">
                            {v.name}
                          </h4>
                          <div className="flex flex-wrap gap-1 mb-1.5">
                            <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
                              {v.language === 'Indonesia' ? '🇮🇩 ID' : v.language === 'English' ? '🇺🇸 EN' : '🌐'}
                            </span>
                            <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-[var(--bg-input)] text-[var(--text-secondary)]">
                              {v.gender}
                            </span>
                            <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-[var(--bg-input)] text-[var(--text-secondary)]">
                              {v.label}
                            </span>
                          </div>
                          <code className="text-[0.55rem] text-[var(--text-muted)] truncate block max-w-[150px]" title={v.voiceId}>
                            ID: {v.voiceId}
                          </code>
                        </div>
                        <button
                          className="text-[var(--text-muted)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] text-sm shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-all"
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

                      <div className="border-t border-[var(--border)] p-2 bg-[var(--bg-input)]/50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isUploading ? (
                            <span className="text-[0.65rem] text-yellow-500 font-medium px-2">⏳ Uploading...</span>
                          ) : hasError ? (
                            <span className="text-[0.65rem] text-red-500 font-medium px-2">❌ Gagal</span>
                          ) : (
                            <>
                              <button
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all shadow-xs ${
                                  !hasSample ? 'opacity-30 pointer-events-none bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border)]' :
                                  isPlaying
                                    ? 'bg-[var(--accent)] text-white border border-[var(--accent)]'
                                    : 'bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--accent)] border border-[var(--border)]'
                                }`}
                                onClick={() => hasSample && handlePlayPause(v.voiceId)}
                                disabled={!hasSample}
                                title={isPlaying ? 'Stop' : 'Play'}
                              >
                                {isPlaying ? '⏹' : '▶'}
                              </button>
                              <label className="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all shadow-xs bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--accent)] border border-[var(--border)]" title={blobExists ? 'Ganti sample audio' : 'Upload sample audio'}>
                                {blobExists ? '🔄' : '📂'}
                                <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadSample(v.voiceId, file);
                                  e.target.value = '';
                                }} />
                              </label>
                            </>
                          )}
                        </div>
                        {hasSample && !isUploading && !hasError && (
                          <span className="text-[0.6rem] text-[var(--success)] font-medium flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"></div> Siap
                          </span>
                        )}
                        {!hasSample && !isUploading && !hasError && (
                          <span className="text-[0.6rem] text-[var(--text-muted)] flex items-center gap-1">
                            No Sample
                          </span>
                        )}
                      </div>
                    </div>
                  );
                  })}
                </div>
              ) : (
                <div className="text-center p-6 text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl text-sm">
                  Belum ada voice yang disimpan.
                </div>
              )}
            </Card>
            </div>
          </div>
        )}

        {/* TAB: VIDEO & CONTENT */}
        {activeTab === 'video' && (
          <div className="animate-fade-in space-y-6">
            <VideoSettings
              minKeepDuration={state.settings.minKeepDuration}
              outputFormat={state.settings.outputFormat}
              videoCodec={state.settings.videoCodec}
              onMinKeepChange={(v) => { dispatch({ type: 'SET_SETTING', key: 'minKeepDuration', value: v }); saveSetting('minKeepDuration', String(v)).catch(() => {}); }}
              onFormatChange={(v) => { dispatch({ type: 'SET_SETTING', key: 'outputFormat', value: v }); saveSetting('outputFormat', v).catch(() => {}); }}
              onCodecChange={(v) => { dispatch({ type: 'SET_SETTING', key: 'videoCodec', value: v }); saveSetting('videoCodec', v).catch(() => {}); }}
            />
          </div>
        )}
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-slide-in">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 mx-auto">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-lg font-bold text-center mb-2 text-[var(--text-primary)]">Reset Semua Konfigurasi?</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-6 leading-relaxed">
              Tindakan ini akan <strong>menghapus semua</strong> pengaturan dan *storage* Anda ke kondisi awal (default). Lanjutkan?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" block onClick={() => setShowResetConfirm(false)}>Batal</Button>
              <Button 
                variant="primary" 
                block 
                className="bg-red-500 hover:bg-red-600 text-white border-none"
                onClick={() => {
                  setShowResetConfirm(false);
                  localStorage.removeItem(STORAGE_KEY);
                  dispatch({ type: 'CLEAR_FILES' });
                  dispatch({ type: 'CLEAR_ANALYSIS' as any });
                  dispatch({ type: 'CLEAR_OUTPUTS' as any });
                  addToast('⚡ Semua konfigurasi direset ke default', 'success');
                  window.location.reload();
                }}
              >Reset Semua</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
