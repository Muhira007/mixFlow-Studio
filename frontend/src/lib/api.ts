// ============================================
// mixFlow — API Client
// Proxy calls to FastAPI backend
// ============================================

import { BACKEND_URL } from './constants';

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

export async function generateTTS(text: string, voiceId: string, apiKey: string) {
  return request('/api/tts/generate', {
    method: 'POST',
    body: JSON.stringify({ text, voice_id: voiceId, api_key: apiKey }),
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
}) {
  return request('/api/script/generate', {
    method: 'POST',
    body: JSON.stringify(params),
    timeout: 30000,
  });
}

// ---- Scraper Endpoint ----

export async function scrapeProduct(url: string) {
  return request('/api/scrape', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// ---- Health Check ----

export async function healthCheck() {
  return request('/api/health');
}

export { ApiError };
