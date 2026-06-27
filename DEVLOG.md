# 📝 Development Log — mixFlow

## 2026-06-27 — Auto Caption: Perencanaan Fitur

### Konteks

User ingin menambah fitur **Auto Caption** (subtitle otomatis) ke mixFlow.  
Proyek referensi: **vidflow** (`/home/kangdemuh/aplikasi/vidflow`) sudah memiliki implementasi lengkap.

### File referensi dari vidflow

| File | Fungsi |
|---|---|
| `backend/app/services/stt_service.py` | `transcribe_with_openai()` — Whisper-1 STT → SRT + ASS (word-level, karaoke highlight). `burn_subtitles_to_video()` — FFmpeg overlay subtitle. |
| `backend/app/services/caption_rewriter.py` | `generate_social_caption()` — Rewrite transkrip SRT + konteks produk → caption sosmed via DeepSeek. |
| `frontend/src/pages/ConfigCaption.jsx` | UI konfigurasi: template (classic/karaoke_yellow/green/red), font, size, color, outline, position, UPPERCASE, social caption settings. |

### Keputusan desain

1. **Plain style dulu** (bukan karaoke) — teks putih per 5 kata, timing sesuai word timestamps
2. **Whisper-1 API** (OpenAI) — bukan realtime, akurat, word-level granularity
3. **Penempatan pipeline:** Upload → TTS → **Caption** → Analyze → Trim → Concat → Render (7 step)
4. **File baru:**
   - `backend/app/services/caption_service.py`
   - `backend/app/routers/caption.py`
   - `frontend/src/components/editor/CaptionConfig.tsx`
5. **Update existing:**
   - `ProgressPipeline.tsx` — tambah step
   - `constants.ts` — PIPELINE_STEPS
   - `page.tsx` — button + state

### Struktur SRT (plain, 5 kata per chunk)

```
1
00:00:00,000 --> 00:00:02,500
Halo guys, hari ini aku

2
00:00:02,500 --> 00:00:05,000
mau review produk keren banget
```

### Flow Auto Caption

```
TTS Audio (outputs/tts_chunk_xxx.mp3)
  → POST /api/caption/generate { audio_filename }
  → Whisper-1 transcribe → SRT text
  → Simpan SRT ke DB/state
  → Saat Render: FFmpeg burn subtitle ke video
  → Output: video + subtitle terbakar
```

### Next steps (sesi berikutnya)

1. Buat `caption_service.py`
2. Buat `caption.py` router
3. Buat `CaptionConfig.tsx`
4. Update pipeline components
5. Test dengan TTS audio yang sudah ada

---

_Dicatat sebelum user off. Siap dilanjutkan sesi berikutnya._
