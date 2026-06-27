# 🚀 Product Requirements Document (PRD)

**Nama Proyek:** mixFlow  
**Jenis:** Web Application (Streamlit)  
**Deskripsi:** Aplikasi all-in-one untuk content creator affiliate — menggabungkan AI Script Generator untuk membuat naskah video pendek (TikTok/Shopee) dengan Video Editor yang dilengkapi Text-to-Speech (Eleven Labs) dan adaptive trim otomatis.

---

## 1. Target Pengguna

Content creator affiliate di platform:
- TikTok Shop
- Shopee Video
- Shopee Live (short video)

## 2. Fitur Inti

### A. AI Script Generator (Panel 1)
Membuat naskah voice-over video pendek untuk promosi produk affiliate secara otomatis menggunakan AI.

| Fitur | Deskripsi |
|---|---|
| **Input Nama Produk** | User memasukkan nama produk yang akan dipromosikan |
| **Input URL Produk** _(opsional)_ | Scraping halaman produk untuk mendapatkan konteks (judul, deskripsi) |
| **Pilih AI Provider** | DeepSeek (`deepseek-v4-flash`), Google Gemini (`gemini-3.5-flash`), OpenAI (`gpt-5.4-mini`) |
| **Pilih Durasi Video** | 15 detik, 30 detik, 60 detik, 90 detik (mempengaruhi panjang naskah) |
| **Pilih Gaya Bahasa** | Casual & Menarik, Formal, Humor, dll |
| **Pilih Target Audiens** | Umum, Ibu Rumah Tangga, Gen Z, Milenial, dll |
| **Output** | JSON: `versionA` (Hard-Selling), `versionB` (Storytelling), `caption` |

**Aturan Konten Naskah** (hard-coded di system prompt):
- DILARANG menyebut nama marketplace (Shopee, Tokopedia, Lazada, TikTok Shop, dll)
- DILARANG menyebut nama media sosial (Instagram, IG, Facebook, FB, YouTube, YT, TikTok, X, Twitter, dll)
- DILARANG menggunakan "Klik link di bio!" atau "keranjang kuning"
- Gunakan CTA afiliator: "cek keranjang di bawah video ini" atau "klik tautan di bawah"
- Format paragraf pendek (2-3 kalimat per paragraf), dipecah sebagai array

### B. Video Editor (Panel Utama)
Menggabungkan footage video + voice-over TTS menjadi satu video short vertical siap upload.

| Fitur | Deskripsi |
|---|---|
| **Upload Footage** | Multi-file upload (.mp4, .mov, .avi), bisa drag & drop |
| **Auto-Analyze** | Deteksi blur (Laplacian variance) & guncangan (frame diff) per footage |
| **Adaptive Trim** | Potong otomatis bagian awal/akhir yang jelek, durasi menyesuaikan audio TTS |
| **TTS Generation** | Text-to-Speech via Eleven Labs API |
| **Concat + Render** | Gabung footage + overlay audio → output 9:16 (1080×1920) H.264 |

**Constraint Adaptive Trim:**
- Setiap footage minimal tersisa **3 detik** bagian bagus
- Pemangkasan proporsional: footage panjang kena pangkas lebih besar
- Total durasi video akhir ≈ durasi audio TTS

### C. Settings (Panel 3)
Konfigurasi API keys untuk semua layanan eksternal:

| Key | Layanan |
|---|---|
| `ELEVENLABS_API_KEY` | Text-to-Speech |
| `DEEPSEEK_API_KEY` | AI Script Generator (DeepSeek) |
| `GEMINI_API_KEY` | AI Script Generator (Google Gemini) |
| `OPENAI_API_KEY` | AI Script Generator (OpenAI) |
| `ELEVENLABS_VOICE_ID` | Voice default untuk TTS |
| `MIN_KEEP_DURATION` | Minimal durasi per footage (default: 3 detik) |

---

## 3. Diagram & Alur Kerja

### 3.1 Flow Utama Aplikasi

```mermaid
flowchart TD
    A[🎬 User Buka mixFlow] --> B{Punya Naskah?}
    B -- Tidak --> C[Panel: Script Generator]
    C --> C1[Input Nama Produk]
    C1 --> C2[Pilih AI Provider]
    C2 --> C3[Pilih Durasi & Tone]
    C3 --> C4[Generate Naskah]
    C4 --> C5[Copy Naskah ✅]

    B -- Ya --> D[Panel: Video Editor]
    C5 --> D

    D --> D1[Upload Footage]
    D1 --> D2[Paste Naskah]
    D2 --> D3[Generate TTS]
    D3 --> D4[Analyze Footage]
    D4 --> D5[Adaptive Trim]
    D5 --> D6[Concat Clips]
    D6 --> D7[Render Final]
    D7 --> E[📥 Download .mp4]
    E --> F[📤 Upload ke TikTok/Shopee]
```

### 3.2 Detail Flow Adaptive Trim (Inti Video Editor)

```mermaid
flowchart TD
    subgraph INPUT[Input]
        A1[Upload Footage<br/>1.mp4, 2.mp4, ...N.mp4]
        A2[Naskah VO]
    end

    subgraph TTS[TTS Engine]
        B1[Eleven Labs API]
        B2[Audio .mp3<br/>+ Target Durasi]
    end

    subgraph ANALYZE[Frame Analysis per Footage]
        C1[Deteksi Blur<br/>Laplacian Variance]
        C2[Deteksi Guncangan<br/>Frame Diff]
        C3[Tentukan Good Segment<br/>start → end per footage]
    end

    subgraph TRIM[Adaptive Trim Algorithm]
        D1[Hitung Total Good Duration]
        D2{Bandingkan dengan<br/>Target Durasi Audio}
        D2 -- Total > Target --> D3[Distribusi Pemangkasan<br/>Proporsional]
        D3 --> D4{Cek Constraint<br/>Min 3 detik/footage}
        D4 -- Ada yang masih > 3dtk --> D5[Potong lagi<br/>dari yang terpanjang]
        D5 --> D4
        D4 -- Semua sudah pas --> D6[✅ Durasi Match]
        D2 -- Pas/Toleransi --> D6
        D2 -- Total < Target --> D7[⚠️ Warning: Kurang]
    end

    subgraph OUTPUT[Render]
        E1[Concat Semua Klip]
        E2[Resize 9:16 1080x1920]
        E3[Overlay Audio TTS]
        E4[Write .mp4 Final]
    end

    A1 --> C1
    A2 --> B1 --> B2
    B2 -- target_durasi --> D2
    C1 --> C3
    C2 --> C3
    C3 --> D1 --> D2
    D6 --> E1 --> E2 --> E3 --> E4
    D7 --> E4
```

### 3.3 Arsitektur Aplikasi

```mermaid
flowchart LR
    subgraph UI[Streamlit UI - 3 Halaman]
        U1[app.py<br/>Video Editor]
        U2[1_Script_Generator.py<br/>AI Naskah]
        U3[2_Settings.py<br/>API Keys]
    end

    subgraph CORE[src/ - Core Modules]
        M1[script_generator.py<br/>DeepSeek / Gemini / OpenAI]
        M2[scraper.py<br/>Product URL Parser]
        M3[tts.py<br/>Eleven Labs TTS]
        M4[video_processor.py<br/>Analyze + Adaptive Trim + Concat]
        M5[renderer.py<br/>Final Render]
    end

    subgraph EXTERNAL[External APIs]
        E1[Eleven Labs<br/>Text-to-Speech]
        E2[DeepSeek API<br/>deepseek-v4-flash]
        E3[Gemini API<br/>gemini-3.5-flash]
        E4[OpenAI API<br/>gpt-5.4-mini]
    end

    U1 --> M3
    U1 --> M4
    U1 --> M5
    U2 --> M1
    U2 --> M2

    M1 --> E2
    M1 --> E3
    M1 --> E4
    M2 --> E2
    M2 --> E3
    M2 --> E4
    M3 --> E1

    U3 -.-> E1
    U3 -.-> E2
    U3 -.-> E3
    U3 -.-> E4
```

### 3.4 Alur Script Generator

```mermaid
flowchart TD
    A[Input: Nama Produk] --> B{Pakai URL?}
    B -- Ya --> C[Scrape URL Produk<br/>requests + BeautifulSoup]
    C --> D[Ambil Title + Description]

    B -- Tidak --> D
    D --> E{Pilih AI Provider}

    E -- DeepSeek --> F1[POST api.deepseek.com<br/>deepseek-v4-flash]
    E -- Gemini --> F2[GoogleGenAI SDK<br/>gemini-3.5-flash]
    E -- OpenAI --> F3[POST api.openai.com<br/>gpt-5.4-mini]

    F1 --> G[Parse JSON Output]
    F2 --> G
    F3 --> G

    G --> H{JSON Valid?}
    H -- Ya --> I[Output:<br/>versionA - Hard Selling<br/>versionB - Storytelling<br/>caption - Caption + Hashtag]
    H -- Tidak --> J[Retry / Fallback]

    I --> K[Copy ke Video Editor]
```

---

## 4. Tech Stack

| Kategori | Teknologi |
|---|---|
| **UI Framework** | Streamlit (Python) |
| **Video Processing** | moviepy + OpenCV |
| **Text-to-Speech** | Eleven Labs Python SDK |
| **AI Script Gen** | HTTP REST calls (DeepSeek, Google GenAI SDK, OpenAI SDK) |
| **Web Scraping** | requests + BeautifulSoup4 |
| **Image Processing** | Pillow |
| **Config/Env** | python-dotenv + Streamlit session_state |

---

## 5. Struktur Proyek

```
mixFlow/
├── app.py                        # Main: Video Editor
├── pages/
│   ├── 1_📝_Script_Generator.py  # AI Script Generator
│   └── 2_⚙️_Settings.py          # API Keys Configuration
├── requirements.txt
├── .env.example
├── src/
│   ├── __init__.py
│   ├── tts.py                    # Eleven Labs TTS
│   ├── video_processor.py        # Adaptive trim + concat
│   ├── renderer.py               # Final render
│   ├── script_generator.py       # AI script generation
│   └── scraper.py                # Product URL scraping
├── uploads/                      # Temp footage
├── outputs/                      # Rendered videos
├── PRD.md                        # This file
├── PROGRESS.md                   # Development progress
└── README.md                     # User documentation
```

---

## 6. Referensi

- **VO-Script-Generator**: [https://github.com/Muhira007/VO-Script-Generator](https://github.com/Muhira007/VO-Script-Generator) — referensi untuk sistem prompt AI, aturan konten, dan struktur output naskah
- **Eleven Labs API**: [https://elevenlabs.io/docs/api-reference](https://elevenlabs.io/docs/api-reference)
- **DeepSeek API**: [https://api.deepseek.com/v1/chat/completions](https://api.deepseek.com/v1/chat/completions)

---

## 7. 🔒 Keamanan & Proteksi Data Sensitif

### Aturan Mutlak
Semua credential, API key, dan data sensitif **DILARANG KERAS** masuk ke repo GitHub.

| File | Status Repo | Keterangan |
|---|---|---|
| `.env` | ❌ **DILARANG COMMIT** | Berisi API key asli (terdaftar di `.gitignore`) |
| `.env.example` | ✅ Aman di-commit | Template dengan nilai placeholder |
| `uploads/` | ❌ **DILARANG COMMIT** | Folder footage user (terdaftar di `.gitignore`) |
| `outputs/` | ❌ **DILARANG COMMIT** | Hasil render video (terdaftar di `.gitignore`) |
| `.streamlit/secrets.toml` | ❌ **DILARANG COMMIT** | Secrets Streamlit (terdaftar di `.gitignore`) |
| Kode sumber (`src/`, `app.py`, dll) | ✅ Aman di-commit | Tidak mengandung hardcoded key |

### Proteksi yang Sudah Dipasang
- `.gitignore` — memblokir `.env`, `uploads/`, `outputs/`, `__pycache__/`, `.streamlit/secrets.toml`
- `.env.example` — template dengan placeholder `your_xxx_key_here`
- Semua API key hanya lewat input UI Streamlit (`st.text_input(type="password")`) atau environment variable

### Checklist Sebelum Commit
- [ ] Tidak ada API key hardcoded di source code
- [ ] `.env` tidak masuk staging area
- [ ] File user di `uploads/` dan `outputs/` tidak masuk staging area

---

## 8. Non-Goals (Sengaja Ditiadakan)

Fitur-fitur dari VO-Script-Generator yang TIDAK diimplementasi:
- ❌ Sistem autentikasi (login/register)
- ❌ Sistem kredit/langganan
- ❌ Payment gateway (Midtrans)
- ❌ Dashboard admin
- ❌ Riwayat generasi (database)
- ❌ Mode B-Roll / Roleplay / Hook-Only (bisa ditambah nanti)

---

_Dokumen ini dibuat pada 27 Juni 2026._
