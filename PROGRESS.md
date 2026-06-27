# 📊 Development Progress — mixFlow

**Proyek dimulai:** 27 Juni 2026  
**Status:** 🟢 Frontend + Backend MVP Selesai — Siap Integrasi

---

## 📊 Diagram Ketergantungan Fase

```mermaid
flowchart TD
    F1[Fase 1: Project Setup] --> F2[Fase 2: TTS Module]
    F1 --> F3a[Fase 3a: Frame Analysis]
    F1 --> F5a[Fase 5a: Scraper]

    F2 --> F4[Fase 4: Renderer]
    F3a --> F3b[Fase 3b: Adaptive Trim]
    F3b --> F3c[Fase 3c: Resize & Concat]
    F3c --> F4

    F5a --> F5b[Fase 5b: Script Generator]
    F5b --> F6b[Fase 6b: Script Generator UI]

    F2 --> F6a[Fase 6a: Video Editor UI]
    F4 --> F6a

    F6a --> F7[Fase 7: Testing & Polish]
    F6b --> F7
    F6c[Fase 6c: Settings UI] --> F7

    F7 --> F8[Fase 8: Future Features]
```

## 🗺️ Development Roadmap

```mermaid
gantt
    title Timeline Development mixFlow
    dateFormat  YYYY-MM-DD
    axisFormat  %d %b

    section Fase 1: Setup
    Struktur Proyek + Dependencies     :f1, 2026-06-27, 1d

    section Fase 2-4: Video Core
    TTS Module (Eleven Labs)           :f2, after f1, 1d
    Frame Analysis (OpenCV)            :f3a, after f1, 1d
    Adaptive Trim Algorithm            :f3b, after f3a, 2d
    Resize & Concat                    :f3c, after f3b, 1d
    Renderer (Video+Audio)             :f4, after f2 f3c, 1d

    section Fase 5: AI Script Gen
    Scraper (BeautifulSoup)            :f5a, after f1, 1d
    Script Generator (3 AI Providers)  :f5b, after f5a, 1d

    section Fase 6: UI
    Video Editor UI (app.py)           :f6a, after f4, 2d
    Script Generator UI                :f6b, after f5b, 1d
    Settings UI                        :f6c, after f1, 1d

    section Fase 7-8: Final
    Testing & Polish                   :f7, after f6a f6b f6c, 2d
    Future Features                    :f8, after f7, 7d
```

---

## Fase 1: Project Setup & Struktur Dasar
**Status:** 🔄 In Progress

- [x] Inisialisasi struktur folder proyek
- [ ] Buat `backend/requirements.txt` dan install dependencies
- [x] Buat `.env.example` (template, aman di-commit)
- [x] Buat `.gitignore` (proteksi .env, uploads/, outputs/)
- [x] Buat frontend HTML/CSS/JS dari mockup `contoh-layout/`
- [x] Buat folder `uploads/` dan `outputs/`
- [ ] Buat `backend/` struktur FastAPI
- [x] Setup Git + push repo ke GitHub
- [x] Setup proteksi file sensitif (.gitignore)

### 1a. Frontend (HTML/CSS/JS) ✅ Selesai → **Diupgrade ke Next.js 16**
**Lokasi:** `frontend/` (Next.js 16 App Router)
- [x] `frontend/src/app/layout.tsx` — Root layout with AppProvider + MainLayout + ToastContainer
- [x] `frontend/src/app/page.tsx` — Video Editor (main page) — upload, TTS, pipeline, render
- [x] `frontend/src/app/script-generator/page.tsx` — AI Script Generator with demo output
- [x] `frontend/src/app/settings/page.tsx` — API Keys, video settings, danger zone
- [x] `frontend/src/app/outputs/page.tsx` — Output video history
- [x] `frontend/src/app/api/proxy/[...path]/route.ts` — Proxy ke FastAPI backend
- [x] `frontend/src/app/globals.css` — Tailwind CSS v4 + dark theme CSS variables
- [x] `frontend/src/contexts/AppContext.tsx` — Global state: useReducer + localStorage
- [x] `frontend/src/lib/constants.ts` — All app constants & config options
- [x] `frontend/src/lib/api.ts` — Fetch wrapper ke backend FastAPI
- [x] `frontend/src/lib/utils.ts` — cn(), formatFileSize(), estimateDuration()

### 1a.ii. Component Tree (22 React Components)
**Shared:** Button (4 variants, 3 sizes, loading), Card, Toast, Badge, Switch
**Layout:** Sidebar (260px, responsive drawer), Topbar (breadcrumb + hamburger), BottomNav (mobile 4-tab), MainLayout (shell)
**Editor:** UploadZone (drag & drop), ScriptTextarea, ProgressPipeline (6-step), VideoStats (3 cards), AnalysisTable
**Script Gen:** ProductInput, ConfigSelects, ContentRules, ScriptOutput (Version A/B/Caption)
**Settings:** ApiKeyInput (with status indicator), VideoSettings, DangerZone

### 1a.iii. Tech Stack
- **Next.js 16.2.9** — App Router, TypeScript, Turbopack
- **React 19.2.4** — Server Components, 'use client' directives
- **Tailwind CSS v4** — CSS-based config, @theme directives
- **lucide-react** — Icon library
- **framer-motion** — Animation (installed, ready)
- **Build time:** ~5.5s (compiled + type-checked + static pages)

---

## Fase 2: Modul Audio (TTS + Audio Upload)
**Status:** ⬜ Not Started  
**File:** `src/tts.py`, `src/audio_handler.py`

### 2a. TTS Generation (Eleven Labs) — sumber = "Dari Teks"
- [ ] Implementasi `text_to_speech(text, api_key, voice_id) → (Path, float)`
- [ ] Handle chunking untuk teks panjang (>5000 karakter)
- [ ] Return durasi audio (detik)
- [ ] Error handling: invalid API key, quota habis, timeout

### 2b. Audio Upload — sumber = "Dari Audio"
- [ ] Terima upload file .mp3 / .wav dari user
- [ ] Validasi format & durasi (maks 120 detik)
- [ ] Ambil durasi audio via FFprobe → target durasi untuk adaptive trim
- [ ] Tidak perlu TTS — audio langsung dipakai untuk render

---

## Fase 3: Modul Video Processor (Pre-process + Analyze + Trim + Concat)
**Status:** ⬜ Not Started  
**File:** `src/video_processor.py`

### 3a. Pre-process — Auto-Proxy untuk High-Resolution
- [ ] Fungsi `detect_resolution(filepath) → (width, height)` via FFprobe
- [ ] Threshold: lebar >1080 atau tinggi >1920 → perlu proxy
- [ ] Fungsi `create_proxy(filepath, target=(1080,1920)) → Path`
  - FFmpeg: `scale + pad`, preset `veryfast`, CRF 23
  - Output: `uploads/proxy/proxy_<nama_asli>_1080p.mp4`
- [ ] Semua tahap berikutnya berjalan di proxy (bukan 4K asli)
- [ ] File asli tetap utuh di `uploads/`

### 3b. Frame Analysis
- [ ] Implementasi deteksi blur (Laplacian variance via OpenCV)
- [ ] Implementasi deteksi guncangan (frame-to-frame difference)
- [ ] Fungsi `analyze_footage(filepath) → dict`
- [ ] Return: `{good_start_frame, good_end_frame, total_frames, fps}`
- [ ] Analisis berjalan di 1080p proxy (4× lebih cepat dari 4K)

### 3c. Adaptive Trim Algorithm
- [ ] Fungsi `adaptive_trim(analyses, target_duration, min_keep=3.0) → list[ClipSegment]`
- [ ] Hitung total good duration semua footage
- [ ] Distribusi pemangkasan proporsional
- [ ] Constraint: minimal 3 detik per footage
- [ ] Cascade/iteratif sampai durasi ≈ target
- [ ] Fallback: trim persentase (10% awal, 10% akhir)

### 3d. Resize & Concat
- [ ] Fungsi `concat_clips(segments, resolution) → VideoFileClip`
- [ ] Resize/crop ke 9:16 (1080×1920 atau 720×1280 sesuai pilihan user)
- [ ] Concat semua klip jadi satu

---

## Fase 4: Modul Renderer (Video + Audio → Final Output)
**Status:** ⬜ Not Started  
**File:** `src/renderer.py`

- [ ] Fungsi `render(video_clip, audio_path, resolution) → Path`
- [ ] Overlay audio ke video
- [ ] Encoding parameter:
  - **1080p:** preset `medium`, CRF 20
  - **720p:** preset `fast`, CRF 22
- [ ] Audio: AAC 128kbps
- [ ] Write output H.264 + AAC, vertical 9:16
- [ ] Handle durasi mismatch (audio > video atau sebaliknya)
- [ ] Overlay audio ke video
- [ ] Write output H.264 + AAC, 1080×1920
- [ ] Handle durasi mismatch (audio > video atau sebaliknya)

---

## Fase 5: Modul AI Script Generator
**Status:** ⬜ Not Started  
**File:** `src/script_generator.py`, `src/scraper.py`

### 5a. Scraper
- [ ] Fungsi `scrape_product_url(url) → dict`
- [ ] Fetch HTML + User-Agent spoofing
- [ ] Parse title, meta description, body text

### 5b. Script Generator
- [ ] Fungsi `generate_script(name, provider, api_key, duration, style, audience) → dict`
- [ ] Support DeepSeek API (`deepseek-v4-flash`)
- [ ] Support Google Gemini API (`gemini-3.5-flash`)
- [ ] Support OpenAI API (`gpt-5.4-mini`)
- [ ] System prompt adaptasi dari VO-Script-Generator
- [ ] Parse JSON output (versionA, versionB, caption)
- [ ] Error handling per provider + retry logic

---

## Fase 6: UI (Frontend HTML + Backend API)
**Status:** 🔄 Frontend selesai, Backend belum

### 6a. Main Page — Video Editor (`frontend/index.html` panel-editor)
- [x] Sidebar: navigasi + API keys quick-access
- [x] File uploader (multi-file, drag & drop, validasi format)
- [x] Text area untuk naskah VO (sync ke localStorage)
- [x] Voice selector (Eleven Labs)
- [x] Progress bar: [Upload] → [TTS] → [Analyze] → [Trim] → [Concat] → [Render]
- [x] Stat cards: footage count, estimasi durasi, output format
- [x] Analysis table (placeholder, menunggu backend)
- [x] Action buttons: Analyze, Trim, Render, Simulasi Pipeline
- [ ] Download button (butuh backend)

### 6b. Script Generator (`frontend/index.html` panel-script-gen)
- [x] Input: nama produk (dengan default value)
- [x] Input: URL produk (opsional, scraper butuh backend)
- [x] Select: AI provider (DeepSeek / Gemini / OpenAI)
- [x] Select: durasi video (15s / 30s / 60s / 90s)
- [x] Select: gaya bahasa (5 opsi)
- [x] Select: target audiens (5 opsi)
- [x] Output box: Version A (Hard-Selling), Version B (Storytelling), Caption
- [x] Copy buttons per-version + copy all
- [x] Tombol "Pakai di Editor" → switch panel + kirim naskah
- [x] Aturan konten warning box
- [x] Generate dengan loading spinner (simulasi, butuh backend)

### 6c. Settings (`frontend/index.html` panel-settings)
- [x] Input: Eleven Labs API Key + indikator status
- [x] Input: DeepSeek API Key + indikator status
- [x] Input: Gemini API Key + indikator status
- [x] Input: OpenAI API Key + indikator status
- [x] Select: Default TTS Voice ID
- [x] Number input: Min keep duration (default 3 detik)
- [x] Output format + codec selector
- [x] Semua setting persisten di localStorage
- [x] Danger zone: hapus footage, hapus output, reset semua
- [x] Tombol simpan + toast konfirmasi

---

## Fase 7: Testing & Polish
**Status:** ⬜ Not Started

- [ ] Test Script Generator dengan semua provider
- [ ] Test TTS dengan berbagai panjang naskah
- [ ] Test Adaptive Trim dengan footage berbagai durasi
- [ ] Test edge cases (0 footage, naskah kosong, API key invalid)
- [ ] Test output: format 9:16, audio sync
- [ ] Buat README.md dokumentasi pengguna
- [ ] Buat `.env.example`

---

## Fase 8: Fitur Tambahan (Future)
**Status:** ⬜ Future

- [ ] Subtitle otomatis (overlay teks dari naskah)
- [ ] Background music (volume rendah)
- [ ] Mode B-Roll / Roleplay / Hook-Only
- [ ] Preview real-time sebelum render
- [ ] Batch processing (banyak video sekaligus)
- [ ] Template naskah preset

---

_Legenda:_
- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked
