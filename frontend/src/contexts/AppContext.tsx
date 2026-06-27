'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { STORAGE_KEY } from '@/lib/constants';
import { fetchAllState, type SyncState } from '@/lib/api';

// ============================================
// Types
// ============================================

type PipelineStep = 'idle' | 'upload' | 'tts' | 'analyze' | 'trim' | 'concat' | 'render' | 'done';

type ToastType = 'success' | 'error' | 'warning' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type FileMeta = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

type AnalysisResult = {
  id: number;
  file: string;
  duration: string;
  resolution: string;
  blur: number;
  shake: number;
  goodSegment: string;
  quality: 'good' | 'ok' | 'bad';
};

type OutputVideo = {
  name: string;
  duration: string;
  size: string;
  createdAt: string;
};

type TtsVoice = {
  name: string;
  voiceId: string;
  language: string;
  gender: string;
  label: string;
  hasSample: boolean;
};

type GeneratedScript = {
  id: string;
  script: string;
  caption: string;
  productName: string;
  style: string;
  duration: string;
  audience: string;
  createdAt: string;
};

export type AppState = {
  apiKeys: {
    elevenlabs: string;
    deepseek: string;
    gemini: string;
    openai: string;
  };
  settings: {
    voiceId: string;
    minKeepDuration: number;
    outputFormat: string;
    videoCodec: string;
  };
  uploadedFiles: File[];
  uploadedFileMeta: FileMeta[];
  scriptSource: 'text' | 'audio';
  scriptText: string;
  uploadedAudio: File | null;
  ttsVoices: TtsVoice[];
  audioSamples: Record<string, string>; // voiceId → objectURL
  ttsAudio: { url: string; duration: number } | null;
  selectedVoice: string;
  outputResolution: '1080×1920' | '720×1280';
  pipelineStep: PipelineStep;
  analysisResults: AnalysisResult[];
  outputHistory: OutputVideo[];
  scriptHistory: GeneratedScript[];
  toasts: Toast[];
  currentPanel: string;
};

type Action =
  | { type: 'SET_API_KEY'; provider: keyof AppState['apiKeys']; value: string }
  | { type: 'SET_SETTING'; key: keyof AppState['settings']; value: string | number }
  | { type: 'SET_FILES'; files: File[] }
  | { type: 'ADD_FILES'; files: File[] }
  | { type: 'REMOVE_FILE'; index: number }
  | { type: 'CLEAR_FILES' }
  | { type: 'SET_SCRIPT_SOURCE'; source: 'text' | 'audio' }
  | { type: 'SET_SCRIPT_TEXT'; text: string }
  | { type: 'SET_UPLOADED_AUDIO'; file: File | null }
  | { type: 'SET_VOICE'; voice: string }
  | { type: 'SET_TTS_AUDIO'; audio: { url: string; duration: number } | null }
  | { type: 'ADD_TTS_VOICE'; voice: TtsVoice }
  | { type: 'REMOVE_TTS_VOICE'; index: number }
  | { type: 'UPDATE_TTS_VOICE'; index: number; voice: TtsVoice }
  | { type: 'SET_AUDIO_SAMPLE'; voiceId: string; url: string }
  | { type: 'REMOVE_AUDIO_SAMPLE'; voiceId: string }
  | { type: 'LOAD_VOICES'; voices: TtsVoice[] }
  | { type: 'SET_OUTPUT_RESOLUTION'; resolution: '1080×1920' | '720×1280' }
  | { type: 'SET_PIPELINE_STEP'; step: PipelineStep }
  | { type: 'SET_ANALYSIS'; results: AnalysisResult[] }
  | { type: 'ADD_OUTPUT'; video: OutputVideo }
  | { type: 'REMOVE_OUTPUT'; index: number }
  | { type: 'CLEAR_OUTPUTS' }
  | { type: 'ADD_SCRIPT_TO_HISTORY'; script: GeneratedScript }
  | { type: 'REMOVE_SCRIPT_FROM_HISTORY'; id: string }
  | { type: 'CLEAR_SCRIPT_HISTORY' }
  | { type: 'ADD_TOAST'; toast: Omit<Toast, 'id'> }
  | { type: 'REMOVE_TOAST'; id: string }
  | { type: 'SET_PANEL'; panel: string }
  | { type: 'RESET_ALL' }
  | { type: 'LOAD_STATE'; state: Partial<AppState> };

// ============================================
// Initial State
// ============================================

const initialState: AppState = {
  apiKeys: {
    elevenlabs: '',
    deepseek: '',
    gemini: '',
    openai: '',
  },
  settings: {
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    minKeepDuration: 3.0,
    outputFormat: '9:16',
    videoCodec: 'h264',
  },
  uploadedFiles: [],
  uploadedFileMeta: [],
  scriptSource: 'text',
  scriptText: '',
  uploadedAudio: null,
  ttsVoices: [],
  audioSamples: {},
  ttsAudio: null,
  selectedVoice: '21m00Tcm4TlvDq8ikWAM',
  outputResolution: '1080×1920',
  pipelineStep: 'idle',
  analysisResults: [],
  outputHistory: [],
  scriptHistory: [],
  toasts: [],
  currentPanel: 'editor',
};

// ============================================
// Reducer
// ============================================

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKeys: { ...state.apiKeys, [action.provider]: action.value } };

    case 'SET_SETTING':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } };

    case 'SET_FILES':
      return {
        ...state,
        uploadedFiles: action.files,
        uploadedFileMeta: action.files.map(f => ({
          name: f.name, size: f.size, type: f.type, lastModified: f.lastModified,
        })),
      };

    case 'ADD_FILES': {
      const existing = new Set(state.uploadedFiles.map(f => f.name + f.size));
      const newFiles = action.files.filter(f => !existing.has(f.name + f.size));
      const allFiles = [...state.uploadedFiles, ...newFiles];
      return {
        ...state,
        uploadedFiles: allFiles,
        uploadedFileMeta: allFiles.map(f => ({
          name: f.name, size: f.size, type: f.type, lastModified: f.lastModified,
        })),
      };
    }

    case 'REMOVE_FILE': {
      const files = state.uploadedFiles.filter((_, i) => i !== action.index);
      return {
        ...state,
        uploadedFiles: files,
        uploadedFileMeta: files.map(f => ({
          name: f.name, size: f.size, type: f.type, lastModified: f.lastModified,
        })),
      };
    }

    case 'CLEAR_FILES':
      return { ...state, uploadedFiles: [], uploadedFileMeta: [] };

    case 'SET_SCRIPT_SOURCE':
      return { ...state, scriptSource: action.source };

    case 'SET_SCRIPT_TEXT':
      return { ...state, scriptText: action.text };

    case 'SET_UPLOADED_AUDIO':
      return { ...state, uploadedAudio: action.file };

    case 'SET_VOICE':
      return { ...state, selectedVoice: action.voice };

    case 'SET_TTS_AUDIO':
      return { ...state, ttsAudio: action.audio, pipelineStep: action.audio ? 'tts' : state.pipelineStep };

    case 'ADD_TTS_VOICE':
      return { ...state, ttsVoices: [...state.ttsVoices, action.voice] };

    case 'REMOVE_TTS_VOICE':
      return { ...state, ttsVoices: state.ttsVoices.filter((_, i) => i !== action.index) };

    case 'UPDATE_TTS_VOICE': {
      const updated = [...state.ttsVoices];
      updated[action.index] = action.voice;
      return { ...state, ttsVoices: updated };
    }

    case 'LOAD_VOICES':
      return { ...state, ttsVoices: action.voices };

    case 'SET_AUDIO_SAMPLE':
      return { ...state, audioSamples: { ...state.audioSamples, [action.voiceId]: action.url } };

    case 'REMOVE_AUDIO_SAMPLE': {
      // Revoke object URL to prevent memory leak
      const old = state.audioSamples[action.voiceId];
      if (old && old.startsWith('blob:')) {
        try { URL.revokeObjectURL(old); } catch {}
      }
      const { [action.voiceId]: _, ...rest } = state.audioSamples;
      return { ...state, audioSamples: rest };
    }

    case 'SET_OUTPUT_RESOLUTION':
      return { ...state, outputResolution: action.resolution };

    case 'SET_PIPELINE_STEP':
      return { ...state, pipelineStep: action.step };

    case 'SET_ANALYSIS':
      return { ...state, analysisResults: action.results };

    case 'ADD_OUTPUT':
      return { ...state, outputHistory: [action.video, ...state.outputHistory] };

    case 'REMOVE_OUTPUT':
      return {
        ...state,
        outputHistory: state.outputHistory.filter((_, i) => i !== action.index),
      };

    case 'CLEAR_OUTPUTS':
      return { ...state, outputHistory: [] };

    case 'ADD_SCRIPT_TO_HISTORY':
      return { ...state, scriptHistory: [action.script, ...state.scriptHistory].slice(0, 20) };

    case 'REMOVE_SCRIPT_FROM_HISTORY':
      return { ...state, scriptHistory: state.scriptHistory.filter(s => s.id !== action.id) };

    case 'CLEAR_SCRIPT_HISTORY':
      return { ...state, scriptHistory: [] };

    case 'ADD_TOAST': {
      const toast: Toast = { ...action.toast, id: Date.now().toString(36) + Math.random().toString(36).slice(2) };
      return { ...state, toasts: [...state.toasts.slice(-2), toast] };
    }

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };

    case 'SET_PANEL':
      return { ...state, currentPanel: action.panel };

    case 'RESET_ALL':
      return {
        ...initialState,
        apiKeys: { ...initialState.apiKeys },
        settings: { ...initialState.settings },
        ttsVoices: state.ttsVoices, // preserve custom voices
      };

    case 'LOAD_STATE':
      return { ...state, ...action.state };

    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

type AppContextType = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addToast: (message: string, type?: ToastType) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const initialized = useRef(false);

  // Load state from SQLite backend — SINGLE SOURCE OF TRUTH
  useEffect(() => {
    async function load() {
      try {
        const remote: SyncState = await fetchAllState();

        const loaded: Partial<AppState> = {};

        if (remote.apiKeys) {
          loaded.apiKeys = {
            elevenlabs: remote.apiKeys.elevenlabs || '',
            deepseek: remote.apiKeys.deepseek || '',
            gemini: remote.apiKeys.gemini || '',
            openai: remote.apiKeys.openai || '',
          };
        }

        if (remote.settings) {
          loaded.settings = {
            voiceId: remote.settings.voiceId || initialState.settings.voiceId,
            minKeepDuration: parseFloat(remote.settings.minKeepDuration || String(initialState.settings.minKeepDuration)),
            outputFormat: remote.settings.outputFormat || initialState.settings.outputFormat,
            videoCodec: remote.settings.videoCodec || initialState.settings.videoCodec,
          };
        }

        dispatch({
          type: 'LOAD_VOICES',
          voices: (remote.ttsVoices || []).map((v: any) => ({
            name: v.name || '',
            voiceId: v.voice_id || '',
            language: v.language || 'Indonesia',
            gender: v.gender || 'Neutral',
            label: v.label || 'Narasi',
            hasSample: v.has_sample || false,
          })),
        });

        loaded.scriptHistory = (remote.scriptHistory || []).map((s: any) => ({
          id: s.id, script: s.script, caption: s.caption,
          productName: s.product_name, style: s.style,
          duration: s.duration, audience: s.audience, createdAt: s.created_at,
        }));

        loaded.outputHistory = (remote.outputHistory || []).map((o: any) => ({
          name: o.name, duration: o.duration, size: o.size, createdAt: o.created_at,
        }));

        // Transient UI-only state from localStorage
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const local = JSON.parse(raw);
            loaded.scriptText = local.scriptText || '';
            loaded.selectedVoice = local.selectedVoice || initialState.selectedVoice;
            loaded.scriptSource = local.scriptSource || 'text';
            loaded.outputResolution = local.outputResolution || '1080×1920';
            loaded.pipelineStep = 'idle'; // selalu reset — gak boleh nyangkut
            loaded.ttsAudio = null;       // selalu reset
            loaded.uploadedFileMeta = local.uploadedFileMeta || [];
          }
        } catch {}

        dispatch({ type: 'LOAD_STATE', state: loaded });
      } catch (e) {
        console.error('Gagal load dari backend SQLite:', e);
      }

      initialized.current = true;
    }
    load();
  }, []);

  // Cache UI-only transient state to localStorage (data lives in SQLite)
  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        scriptText: state.scriptText,
        selectedVoice: state.selectedVoice,
        scriptSource: state.scriptSource,
        outputResolution: state.outputResolution,
        uploadedFileMeta: state.uploadedFileMeta,
      }));
    } catch {}
  }, [state.scriptText, state.selectedVoice, state.scriptSource, state.outputResolution, state.uploadedFileMeta]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    dispatch({ type: 'ADD_TOAST', toast: { message, type } });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, addToast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
