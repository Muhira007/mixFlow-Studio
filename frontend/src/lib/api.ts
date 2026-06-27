// ============================================
// mixFlow — API Client
// Proxy calls to FastAPI backend
// ============================================

import { BACKEND_URL } from './constants';
export { BACKEND_URL };

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  timeout?: number;
};

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', headers = {}, body, timeout = 30000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `${BACKEND_URL}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new ApiError(errBody.detail || 'Request failed', res.status);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('Request timeout', 408);
    }
    throw new ApiError(
      'Backend tidak tersedia. Pastikan server FastAPI berjalan.',
      503
    );
  } finally {
    clearTimeout(timer);
  }
}

// ---- TTS Endpoints ----

export type AudioFileInfo = { filename: string; size: number; size_mb: number; created: number };

export async function listTTSFiles(): Promise<{ files: AudioFileInfo[] }> {
  return request('/api/tts/list');
}

export async function deleteAllTTSAudio(): Promise<{ status: string; count: number }> {
  return request('/api/tts/all', { method: 'DELETE' });
}

export async function uploadAudioFile(file: File): Promise<{ filename: string; audio_url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${BACKEND_URL}/api/tts/upload`;
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) throw new ApiError('Upload audio gagal', res.status);
  return res.json();
}

export async function generateTTS(text: string, voiceId: string, apiKey: string): Promise<{ audio_url: string; filename: string; duration: number; chunks: number }> {
  return request('/api/tts/generate', {
    method: 'POST',
    body: JSON.stringify({ text, voice_id: voiceId, api_key: apiKey }),
    timeout: 120000,
  });
}

// ---- Video Endpoints ----

export async function analyzeFootage(formData: FormData) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(`${BACKEND_URL}/api/video/analyze`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new ApiError(errBody.detail || 'Analysis failed', res.status);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function renderVideo(trimSegments: unknown[], audioUrl: string) {
  return request('/api/video/render', {
    method: 'POST',
    body: JSON.stringify({ trim_segments: trimSegments, audio_url: audioUrl }),
    timeout: 300000, // 5 min for render
  });
}

// ---- Script Generator Endpoints ----

export async function generateScript(params: {
  productName: string;
  productUrl?: string;
  provider: string;
  duration: string;
  style: string;
  audience: string;
  apiKey: string;
  product_info?: Record<string, string>;
}): Promise<{ script: string; caption: string; provider: string }> {
  return request('/api/script/generate', {
    method: 'POST',
    body: JSON.stringify({
      product_name: params.productName,
      provider: params.provider,
      api_key: params.apiKey,
      duration: params.duration,
      style: params.style,
      audience: params.audience,
      product_info: params.product_info || null,
    }),
    timeout: 60000,
  });
}

// ---- Scraper Endpoint ----

export async function scrapeProduct(url: string): Promise<{ title: string; description: string; body_text: string; url: string }> {
  return request('/api/scrape', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// ---- Global Sync (SQLite) ----

export type SyncState = {
  apiKeys: Record<string, string>;
  settings: Record<string, string>;
  ttsVoices: VoiceRow[];
  scriptHistory: ScriptRow[];
  outputHistory: OutputRow[];
};

export type ScriptRow = {
  id: string;
  script: string;
  caption: string;
  product_name: string;
  style: string;
  duration: string;
  audience: string;
  created_at: string;
};

export type OutputRow = {
  id: number;
  name: string;
  duration: string;
  size: string;
  created_at: string;
};

export async function fetchAllState(): Promise<SyncState> {
  return request('/api/sync');
}

export async function saveApiKey(provider: string, value: string) {
  return request('/api/sync/api-key', {
    method: 'POST',
    body: JSON.stringify({ provider, value }),
  });
}

export async function saveSetting(key: string, value: string) {
  return request('/api/sync/setting', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
}

export async function saveScriptToHistory(script: {
  id: string;
  script: string;
  caption: string;
  product_name: string;
  style: string;
  duration: string;
  audience: string;
  created_at: string;
}) {
  return request('/api/sync/script', {
    method: 'POST',
    body: JSON.stringify(script),
  });
}

export async function deleteScriptFromHistory(scriptId: string) {
  return request(`/api/sync/script/${encodeURIComponent(scriptId)}`, {
    method: 'DELETE',
  });
}

export async function saveOutputToHistory(output: {
  name: string;
  duration: string;
  size: string;
  created_at: string;
}) {
  return request('/api/sync/output', {
    method: 'POST',
    body: JSON.stringify(output),
  });
}

// ---- Voices Endpoints (SQLite) ----

export type VoiceRow = {
  id: number;
  name: string;
  voice_id: string;
  language: string;
  gender: string;
  label: string;
  created_at: string;
};

export async function fetchVoices(): Promise<VoiceRow[]> {
  return request('/api/voices');
}

export async function createVoice(voice: {
  name: string;
  voice_id: string;
  language: string;
  gender: string;
  label: string;
}): Promise<VoiceRow> {
  return request('/api/voices', {
    method: 'POST',
    body: JSON.stringify(voice),
  });
}

export async function removeVoice(voiceId: string): Promise<void> {
  return request(`/api/voices/${encodeURIComponent(voiceId)}`, {
    method: 'DELETE',
  });
}

export async function uploadVoiceSample(voiceId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${BACKEND_URL}/api/voices/${encodeURIComponent(voiceId)}/sample`;
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) throw new ApiError('Upload sample gagal', res.status);
}

export function getVoiceSampleUrl(voiceId: string): string {
  return `${BACKEND_URL}/api/voices/${encodeURIComponent(voiceId)}/sample`;
}

// ---- Health Check ----

export async function healthCheck() {
  return request('/api/health');
}

export { ApiError };
