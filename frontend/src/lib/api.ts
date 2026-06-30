// ============================================
// mixFlow Studio — API Client
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

export async function deleteTTSAudio(filename: string): Promise<{ status: string }> {
  return request(`/api/tts/audio/${filename}`, { method: 'DELETE' });
}

export async function deleteAllFootage(): Promise<{ status: string }> {
  return request('/api/video/files/all', { method: 'DELETE' });
}

export async function deleteAllOutputs(): Promise<{ status: string }> {
  return request('/api/sync/output/all', { method: 'DELETE' });
}

export async function uploadAudioFile(file: File): Promise<{ filename: string; audio_url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${BACKEND_URL}/api/tts/upload`;
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) throw new ApiError('Upload audio gagal', res.status);
  return res.json();
}

export async function generateTTS(
  text: string,
  voiceId: string,
  apiKey: string,
  stability = 0.55,
  similarityBoost = 0.45,
): Promise<{ audio_url: string; filename: string; duration: number; chunks: number }> {
  return request('/api/tts/generate', {
    method: 'POST',
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      api_key: apiKey,
      stability,
      similarity_boost: similarityBoost,
    }),
    timeout: 120000,
  });
}

// ---- Video Endpoints ----

export async function uploadFootage(file: File): Promise<{ file_id: string; original_name: string; working_path: string; was_proxied: boolean; original_resolution: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${BACKEND_URL}/api/video/upload`;
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(errBody.detail || 'Upload gagal', res.status);
  }
  return res.json();
}

export async function trimFootage(analyses: any[], targetDuration: number, minKeep = 3.0) {
  return request('/api/video/trim', {
    method: 'POST',
    body: JSON.stringify({ analyses, target_duration: targetDuration, min_keep: minKeep }),
    timeout: 30000,
  });
}

export async function concatFootage(segments: any[], fileIds: string[], outputWidth = 1080, outputHeight = 1920) {
  return request('/api/video/concat', {
    method: 'POST',
    body: JSON.stringify({ segments, file_ids: fileIds, output_width: outputWidth, output_height: outputHeight }),
    timeout: 120000,
  });
}

export async function renderVideo(videoPath: string, audioPath: string, outputWidth = 1080, outputHeight = 1920) {
  return request('/api/video/render', {
    method: 'POST',
    body: JSON.stringify({ video_path: videoPath, audio_path: audioPath, output_width: outputWidth, output_height: outputHeight }),
    timeout: 600000,
  });
}

export async function loadPipelineState(): Promise<any> {
  return request('/api/video/pipeline/state');
}

export async function savePipelineState(state: Record<string, any>): Promise<void> {
  return request('/api/video/pipeline/state', {
    method: 'POST',
    body: JSON.stringify(state),
  });
}

export async function analyzeFootage(fileIds: string[]) {
  const formData = new FormData();
  fileIds.forEach(id => formData.append('file_ids', id));
  const url = `${BACKEND_URL}/api/video/analyze`;
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(errBody.detail || 'Analysis failed', res.status);
  }
  return res.json();
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
  pipelineState?: Record<string, any>;
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
  caption?: string;
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
  duration?: string;
  size?: string;
  caption?: string;
  created_at: string;
}): Promise<OutputRow> {
  return request('/api/sync/output', {
    method: 'POST',
    body: JSON.stringify(output),
  });
}

export async function deleteOutputFromHistory(outputId: number) {
  return request(`/api/sync/output/${outputId}`, {
    method: 'DELETE',
  });
}

export async function deleteCleanupConcat() {
  return request('/api/sync/cleanup/concat', {
    method: 'DELETE',
  });
}

export async function deleteCleanupCaptioned() {
  return request('/api/sync/cleanup/captioned', {
    method: 'DELETE',
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

export type CloneVoiceResult = {
  status: string;
  voice_id: string;
  name: string;
  requires_verification: boolean;
  message: string;
};

export async function cloneVoice(
  name: string,
  files: File[],
  options?: {
    description?: string;
    labels?: string;
    removeBackgroundNoise?: boolean;
    language?: string;
    gender?: string;
    label?: string;
  }
): Promise<CloneVoiceResult> {
  const formData = new FormData();
  formData.append('name', name);
  files.forEach((f) => formData.append('files', f));
  if (options?.description) formData.append('description', options.description);
  if (options?.labels) formData.append('labels', options.labels);
  if (options?.removeBackgroundNoise) formData.append('remove_background_noise', 'true');
  if (options?.language) formData.append('language', options.language);
  if (options?.gender) formData.append('gender', options.gender);
  if (options?.label) formData.append('label', options.label);

  const url = `${BACKEND_URL}/api/voices/clone`;
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: 'Voice clone gagal' }));
    throw new ApiError(errBody.detail || 'Voice clone gagal', res.status);
  }
  return res.json();
}

// ---- Health Check ----

export async function healthCheck() {
  return request('/api/health');
}

export { ApiError };

// ---- Caption Endpoints ----

export type CaptionGenerateResult = {
  srt: string;
  text: string;
  word_count: number;
  chunk_count: number;
  srt_path: string;
};

export type CaptionSettings = {
  font: string;
  size: number;
  color: string;
  outline_color: string;
  outline_size: number;
  position: number;
  uppercase: boolean;
  template: string;
  social_max_words: number;
  social_hashtags: number;
  social_tone: string;
};

export async function generateCaption(
  audioFilename: string,
  apiKey: string,
  capitalize = false
): Promise<CaptionGenerateResult> {
  return request('/api/caption/generate', {
    method: 'POST',
    body: JSON.stringify({
      audio_filename: audioFilename,
      api_key: apiKey,
      capitalize,
    }),
    timeout: 120000,
  });
}

export async function fetchCaptionSettings(): Promise<{ settings: CaptionSettings }> {
  return request('/api/caption/settings');
}

export async function saveCaptionSettings(
  updates: Partial<CaptionSettings>
): Promise<{ settings: CaptionSettings }> {
  return request('/api/caption/settings', {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

export type CoverSettings = {
  template: string;
  bg_opacity: number;
  title_style: string;
  title_max_words: number;
};

export async function fetchCoverSettings(): Promise<{ settings: CoverSettings }> {
  return request('/api/cover/settings');
}

export async function saveCoverSettings(
  updates: Partial<CoverSettings>
): Promise<{ settings: CoverSettings }> {
  return request('/api/cover/settings', {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

export async function burnCaption(
  videoPath: string,
  srtContent: string,
  audioFilename?: string,
  settings?: Partial<CaptionSettings>
): Promise<{ output_path: string; output_url: string }> {
  return request('/api/caption/burn', {
    method: 'POST',
    body: JSON.stringify({
      video_path: videoPath,
      srt_content: srtContent,
      audio_filename: audioFilename,
      settings,
    }),
    timeout: 300000,
  });
}
