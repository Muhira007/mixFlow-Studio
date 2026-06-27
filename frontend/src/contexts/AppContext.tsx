'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { STORAGE_KEY } from '@/lib/constants';

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

type GeneratedScript = {
  versionA: string;
  versionB: string;
  caption: string;
  productName: string;
  style: string;
  duration: string;
  audience: string;
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
  selectedVoice: string;
  outputResolution: '1080×1920' | '720×1280';
  pipelineStep: PipelineStep;
  analysisResults: AnalysisResult[];
  outputHistory: OutputVideo[];
  lastScript: GeneratedScript | null;
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
  | { type: 'SET_OUTPUT_RESOLUTION'; resolution: '1080×1920' | '720×1280' }
  | { type: 'SET_PIPELINE_STEP'; step: PipelineStep }
  | { type: 'SET_ANALYSIS'; results: AnalysisResult[] }
  | { type: 'ADD_OUTPUT'; video: OutputVideo }
  | { type: 'REMOVE_OUTPUT'; index: number }
  | { type: 'CLEAR_OUTPUTS' }
  | { type: 'SET_LAST_SCRIPT'; script: GeneratedScript | null }
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
  selectedVoice: '🇮🇩 Rina — Indonesia Female',
  outputResolution: '1080×1920',
  pipelineStep: 'idle',
  analysisResults: [],
  outputHistory: [],
  lastScript: null,
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

    case 'SET_LAST_SCRIPT':
      return { ...state, lastScript: action.script };

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

  // Load saved state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        dispatch({
          type: 'LOAD_STATE',
          state: {
            apiKeys: saved.apiKeys || initialState.apiKeys,
            settings: saved.settings || initialState.settings,
            uploadedFileMeta: saved.uploadedFileMeta || [],
            scriptSource: saved.scriptSource || 'text',
            scriptText: saved.scriptText || '',
            selectedVoice: saved.selectedVoice || initialState.selectedVoice,
            outputResolution: saved.outputResolution || '1080×1920',
            pipelineStep: saved.pipelineStep || 'idle',
            outputHistory: saved.outputHistory || [],
            lastScript: saved.lastScript || null,
          },
        });
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
  }, []);

  // Persist state to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const toSave = {
          apiKeys: state.apiKeys,
          settings: state.settings,
          uploadedFileMeta: state.uploadedFileMeta,
          scriptSource: state.scriptSource,
          scriptText: state.scriptText,
          selectedVoice: state.selectedVoice,
          outputResolution: state.outputResolution,
          pipelineStep: state.pipelineStep,
          outputHistory: state.outputHistory,
          lastScript: state.lastScript,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (e) {
        console.warn('Failed to save state:', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [state]);

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
