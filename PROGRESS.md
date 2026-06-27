# 📊 Development Progress — mixFlow

**Proyek dimulai:** 27 Juni 2026  
**Status:** 🟢 Beta — Backend + Frontend Fungsional, Siap Digunakan

---

## ✅ Selesai (27 Juni 2026)

### Backend (FastAPI)
- [x] Struktur FastAPI + Uvicorn server
- [x] SQLite database (8 tabel: api_keys, settings, voices, script_history, output_history, file_registry, pipeline_state)
- [x] TTS Module: ElevenLabs integration, chunking, error handling (401/429/timeout/koneksi)
- [x] Script Generator: DeepSeek, Gemini, OpenAI — prompt singkat, anti-kontradiksi
- [x] Product scraper (BeautifulSoup)
- [x] Voice CRUD API + audio sample upload/download/play
- [x] Global sync API (`GET /api/sync`, `POST /api/sync/*`)
- [x] DB Browser (`GET /api/db`) — live HTML view
- [x] Audio upload + library endpoint (max 5 terbaru)
- [x] Audio sample persistence (disk-based, `has_sample` flag)
- [x] Video upload → auto-proxy detection → analyze → trim → concat → render pipeline
- [x] Adaptive trim: center-based trimming (buang kiri+kanan), proportional distribution
- [x] Pipeline state persistence (save/resume after refresh)

### Frontend (Next.js 16)
- [x] 4 halaman: Video Editor, Script Generator, Settings, Outputs
- [x] 20+ React components (shared, editor, script-gen, settings)
- [x] Video Editor: UploadZone (drag-drop, sort, thumbnail, XHR progress per file)
- [x] ScriptTextarea: TTS generation real API, Audio Library picker
- [x] ProgressPipeline: TTS step clickable → popup audio player
- [x] AnalysisTable: real API results, loading state, progress indicator
- [x] Action bar: Analyze → Trim+Concat → Render → Download (semua real API)
- [x] Script Generator: ProductInput (name/URL toggle), ConfigSelects, ScriptOutput, ScriptHistory
- [x] 16 gaya bahasa + 8 label use case
- [x] Settings: API keys, TTS voice manager (multi-voice), VideoSettings, DangerZone
- [x] TTS Voice form: nama, Voice ID, bahasa, gender, label + audio sample upload
- [x] Audio player: play/preview di Settings + Video Editor
- [x] Audio Library: list hasil TTS + upload, max 5 terbaru, dipilih untuk render
- [x] Riwayat naskah: persistent di SQLite, expand/collapse, pakai ulang di editor
- [x] Sorting footage: by upload, name, size, date + number labels + thumbnail preview
- [x] Upload progress: per-file bar dengan %, MB, kecepatan
- [x] Dark theme (CSS variables), responsive (desktop/tablet/mobile)
- [x] Pipeline resume: setelah refresh, file IDs + analysis + trim + concat direstore dari SQLite
- [x] Full SQLite: semua data persistent (API keys, voices, scripts, output, pipeline state)

### DevOps
- [x] `start-all.sh` / `stop-all.sh` — pre-start cleanup, port checking, cache clearing
- [x] `start.bat` / `stop.bat` — Windows launchers via WSL
- [x] SQLite sebagai single source of truth (data persistent)
- [x] Audio sample persistence ke disk (`backend/data/samples/`)

---

## 🔄 In Progress / Perlu Diselesaikan

### Video Processing Pipeline (Fase 3-4)
- [ ] Frame analysis: deteksi blur + shake via OpenCV
- [ ] Adaptive trim algorithm
- [ ] Resize & concat
- [ ] Final render (FFmpeg: overlay audio, encode H.264)
- [ ] Auto-proxy untuk footage >1080p

---

## ⬜ Not Started

### Testing & Polish (Fase 7)
- [ ] Test Script Generator dengan semua provider
- [ ] Test TTS dengan berbagai panjang naskah
- [ ] Test edge cases
- [ ] Dokumentasi video tutorial

### 🔜 Auto Caption (Fase 8 — Next Priority)

**Referensi:** Proyek vidflow (`/home/kangdemuh/aplikasi/vidflow`)

- [ ] `backend/app/services/caption_service.py` — Whisper-1 STT, generate SRT (word-level, 5 kata per chunk, plain style)
- [ ] `backend/app/routers/caption.py` — `POST /api/caption/generate`, `GET/POST /api/caption/settings`
- [ ] FFmpeg `burn_subtitles_to_video()` — overlay SRT/ASS ke video
- [ ] `frontend/src/components/editor/CaptionConfig.tsx` — UI: font, size, color, position, style
- [ ] Update `ProgressPipeline.tsx` — tambah step "Caption" (7-step: Upload → TTS → Caption → Analyze → Trim → Concat → Render)
- [ ] Update `constants.ts` — `PIPELINE_STEPS` tambah caption
- [ ] Update `page.tsx` — button "Generate Caption" + simpan SRT ke state
- [ ] DB table `caption_settings` untuk persist config

**Arsitektur:**
```
Audio TTS (.mp3) → Whisper-1 → SRT (teks + timestamp)
                            → FFmpeg burn subtitle ke video
                            → Plain style (teks putih, 5 kata/chunk)
```

### Future (Fase 9+)
- [ ] Background music
- [ ] Batch processing
- [ ] Preview real-time sebelum render
- [ ] Karaoke caption style (kata aktif kuning)

---

_Legenda:_ ⬜ Not Started · 🔄 In Progress · ✅ Completed · ❌ Blocked
