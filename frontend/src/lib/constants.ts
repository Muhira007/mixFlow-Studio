// ============================================
// mixFlow — Application Constants
// ============================================

export const APP_NAME = 'mixFlow';
export const APP_VERSION = '1.0.0';
export const APP_DESC = 'AI Video Editor for Content Creator Affiliate';

export const STORAGE_KEY = 'mixflow_state_v1';

// Navigation
interface NavItem { id: string; label: string; icon: string; path: string; badge?: string }

export const NAV_ITEMS: NavItem[] = [
  { id: 'editor', label: 'Video Editor', icon: '🎞️', path: '/', badge: 'Main' },
  { id: 'script-gen', label: 'Script Generator', icon: '🤖', path: '/script-generator' },
  { id: 'auto-caption', label: 'Auto Caption', icon: '💬', path: '/auto-caption' },
  { id: 'auto-cover', label: 'Auto Cover', icon: '🖼️', path: '/auto-cover' },
  { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' },
  { id: 'queue', label: 'Antrean Render', icon: '⏳', path: '/queue', badge: 'New' },
  { id: 'history', label: 'Hasil Render', icon: '📁', path: '/outputs' },
  { id: 'about', label: 'Tentang Aplikasi', icon: 'ℹ️', path: '/about' },
];

export const PANEL_NAMES: Record<string, string> = {
  editor: 'Video Editor',
  'script-gen': 'Script Generator',
  settings: 'Settings',
  queue: 'Antrean Render',
  history: 'Hasil Render',
  about: 'Tentang Aplikasi',
  'auto-caption': 'Auto Caption',
  'auto-cover': 'Auto Cover',
};

// AI Providers
export const AI_PROVIDERS = [
  { value: 'deepseek', label: '🧠 DeepSeek (deepseek-v4-flash)' },
  { value: 'gemini', label: '🔮 Google Gemini (gemini-3.5-flash)' },
  { value: 'gemini-2.5-flash', label: '⚡ Google Gemini (gemini-2.5-flash)' },
  { value: 'openai', label: '🧬 OpenAI (gpt-5.4-mini)' },
] as const;

// Video durations
export const DURATIONS = [
  { value: '15', label: '15 detik (~35 kata)' },
  { value: '30', label: '30 detik (~110 kata)' },
  { value: '60', label: '60 detik (~220 kata)' },
  { value: '90', label: '90 detik (~330 kata)' },
] as const;

// Language styles (Gaya Bahasa)
export const STYLES = [
  { value: 'santai-gaul', label: '😎 Santai & Gaul (Gen-Z)' },
  { value: 'hard-selling', label: '🔥 Hard Selling (FOMO)' },
  { value: 'storytelling', label: '📖 Storytelling (Bercerita)' },
  { value: 'edukasi', label: '🎓 Edukasi & Pakar' },
  { value: 'savage-lucu', label: '😈 Savage & Lucu' },
  { value: 'asmr', label: '🧘 ASMR / Calming' },
  { value: 'elegan-mewah', label: '✨ Elegan & Mewah' },
  { value: 'misteri', label: '🕵️ Misteri (Bikin Penasaran)' },
  { value: 'curhat-pov', label: '💌 Curhat / POV' },
  { value: 'brutal-review', label: '🗿 Jujur & Brutal Review' },
  { value: 'challenge', label: '🎯 Tantangan (Challenge)' },
  { value: 'tips-hacks', label: '💡 Tips & Hacks' },
  { value: 'breaking-news', label: '📰 Breaking News' },
  { value: 'pantun', label: '🎭 Pantun / Rima' },
  { value: 'motivasi', label: '💪 Motivasi / Inspiring' },
  { value: 'ngerap', label: '🎤 Ngerap / Cepat' },
] as const;

// Target audiences
export const AUDIENCES = [
  { value: 'umum', label: '🌍 Umum' },
  { value: 'ibu', label: '👩‍👩‍👧 Ibu Rumah Tangga' },
  { value: 'genz', label: '⚡ Gen Z (17-25)' },
  { value: 'milenial', label: '💼 Milenial (26-40)' },
  { value: 'kantor', label: '👨‍💻 Pekerja Kantoran' },
] as const;


// Output formats
export const OUTPUT_FORMATS = [
  { value: '9:16', label: '9:16 (1080×1920)' },
  { value: '1:1', label: '1:1 (1080×1080)' },
  { value: '16:9', label: '16:9 (1920×1080)' },
] as const;

// Video codecs
export const CODECS = [
  { value: 'h264', label: 'H.264 + AAC' },
  { value: 'hevc', label: 'H.265/HEVC' },
  { value: 'vp9', label: 'VP9' },
] as const;

// Pipeline steps
export const PIPELINE_STEPS = [
  { id: 'upload', label: 'Upload', icon: '📤' },
  { id: 'tts', label: 'TTS', icon: '🔊' },
  { id: 'caption', label: 'Caption', icon: '💬' },
  { id: 'analyze', label: 'Analyze', icon: '🔍' },
  { id: 'trim', label: 'Trim', icon: '✂️' },
  { id: 'concat', label: 'Concat', icon: '🔗' },
  { id: 'render', label: 'Render', icon: '🎬' },
] as const;

// File upload
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
export const ACCEPTED_VIDEO_EXTENSIONS = '.mp4,.mov,.avi,.webm';
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// Backend
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Content rules
export const CONTENT_RULES_FORBIDDEN = [
  '❌ Dilarang menyebut nama marketplace',
  '❌ Dilarang menyebut nama media sosial',
  '❌ Dilarang "klik link di bio" / "keranjang kuning"',
] as const;

export const CONTENT_RULES_ALLOWED = [
  '✅ "cek keranjang di bawah video ini"',
  '✅ "klik tautan di bawah"',
  '✅ Paragraf pendek (2-3 kalimat)',
] as const;
