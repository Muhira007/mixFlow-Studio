'use client';

import { useApp } from '@/contexts/AppContext';
import { ApiKeyInput } from '@/components/settings/ApiKeyInput';
import { VideoSettings } from '@/components/settings/VideoSettings';
import { DangerZone } from '@/components/settings/DangerZone';
import { Button } from '@/components/shared/Button';

export default function SettingsPage() {
  const { state, dispatch, addToast } = useApp();

  const ttsFields = [
    {
      id: 'apiKeyElevenlabs',
      label: 'Eleven Labs API Key',
      placeholder: 'el_xxxxxxxxxxxxx',
      hint: 'elevenlabs.io → Profile → API Key',
    },
    {
      id: 'settingsVoiceId',
      label: 'Default Voice ID',
      placeholder: 'Voice ID',
      hint: 'Voice ID dari Eleven Labs Voice Library',
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

    if (id === 'settingsVoiceId') {
      dispatch({ type: 'SET_SETTING', key: 'voiceId', value });
    } else if (keyMap[id]) {
      dispatch({ type: 'SET_API_KEY', provider: keyMap[id], value });
    }
  };

  // Build values map
  const ttsValues: Record<string, string> = {
    apiKeyElevenlabs: state.apiKeys.elevenlabs,
    settingsVoiceId: state.settings.voiceId,
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
        title="🔊 Eleven Labs — Text-to-Speech"
        icon="🔊"
        fields={ttsFields}
        values={ttsValues}
        onChange={handleApiKeyChange}
      />

      <ApiKeyInput
        title="🧠 AI Providers — Script Generator"
        icon="🧠"
        fields={aiFields}
        values={aiValues}
        onChange={handleApiKeyChange}
      />

      <VideoSettings
        minKeepDuration={state.settings.minKeepDuration}
        outputFormat={state.settings.outputFormat}
        videoCodec={state.settings.videoCodec}
        onMinKeepChange={(v) => dispatch({ type: 'SET_SETTING', key: 'minKeepDuration', value: v })}
        onFormatChange={(v) => dispatch({ type: 'SET_SETTING', key: 'outputFormat', value: v })}
        onCodecChange={(v) => dispatch({ type: 'SET_SETTING', key: 'videoCodec', value: v })}
      />

      <DangerZone
        onClearFootage={() => {
          dispatch({ type: 'CLEAR_FILES' });
          addToast('🗑️ Semua footage dihapus');
        }}
        onClearOutputs={() => {
          dispatch({ type: 'CLEAR_OUTPUTS' });
          addToast('🗑️ Semua output dihapus');
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
        onClick={() => addToast('💾 Konfigurasi tersimpan!')}
      >
        💾 Simpan Konfigurasi
      </Button>
    </div>
  );
}
