# 📝 Riwayat Percakapan & Keputusan — mixFlow

**Tanggal:** 27 Juni 2026  
**Partisipan:** User (Content Creator) & Claude (AI Assistant)

---

## Sesi 1: Inisiasi Proyek

### Permintaan Awal
User ingin dibuatkan aplikasi untuk mengedit video short (TikTok/Shopee) dengan fitur:
- Menggabungkan banyak footage video (bernomor urut 1, 2, 3, ...)
- Menambahkan narasi/skrip yang dikonversi jadi suara (TTS)
- Text-to-Speech menggunakan API dari Eleven Labs
- Output berupa satu video utuh siap upload

**Keputusan:** ✅ Bisa dibuat. Arsitektur awal: Streamlit + moviepy + Eleven Labs.

---

### Keputusan #1: Tipe Aplikasi
**Pertanyaan:** Mau dalam bentuk apa?

| Opsi | Hasil |
|---|---|
| Web App (Streamlit) | ✅ **Dipilih** |
| CLI (Command Line) | ❌ |
| Desktop GUI (Tkinter) | ❌ |

---

### Keputusan #2: Format Output
**Pertanyaan:** Format video output?

| Opsi | Hasil |
|---|---|
| Vertical 9:16 (1080×1920) | ✅ **Dipilih** |
| Ikut rasio footage asli | ❌ |

---

### Keputusan #3: Fitur Tambahan
**Pertanyaan:** Ada fitur tambahan yang dibutuhkan?

| Opsi | Hasil |
|---|---|
| Subtitle otomatis | ❌ (nanti) |
| Background music | ❌ (nanti) |
| Cukup fitur inti dulu | ✅ **Dipilih** |

---

## Sesi 2: Auto-Trim Footage

### Masalah
Tiap footage direkam dari handphone — bagian awal (jari mencet record) dan akhir (tangan stop record) selalu jelek/blur/guncang.

### Solusi
**Smart Auto-Trim:**
- Deteksi blur di awal video (Laplacian variance)
- Deteksi guncangan di akhir video (frame-to-frame difference)
- Opsi fallback: trim persentase (%) atau ambil tengah (N detik)

**Keputusan:** ✅ Tambahkan modul smart trimmer sebelum proses concat.

---

## Sesi 3: Duration-Aware Adaptive Trim

### Masalah
Hasil TTS dari Eleven Labs bisa 40 detik, tapi total footage setelah trim bisa 60 detik. Ada selisih 20 detik tanpa suara → jelek.

### Solusi
**Duration-Aware Adaptive Trim:**
1. **TTS duluan** — generate audio dulu, dapatkan target durasi
2. **Adaptive trim** — potong footage secara proporsional sampai total ≈ target durasi
3. Footage panjang kena pangkas lebih besar (%)
4. **Constraint:** setiap footage minimal tersisa 3 detik
5. **Algoritma cascade:** iteratif sampai durasi pas

**Keputusan:** ✅ Flow diubah: TTS duluan → baru trimming → concat → render.

---

## Sesi 4: AI Script Generator

### Permintaan
User ingin panel untuk auto-generate naskah dari nama produk, terintegrasi dalam aplikasi yang sama.

### Referensi
[https://github.com/Muhira007/VO-Script-Generator](https://github.com/Muhira007/VO-Script-Generator) — diambil esensi system prompt dan aturan kontennya, disederhanakan (tanpa auth/credit/admin/payment).

### Spesifikasi
| Item | Detail |
|---|---|
| AI Providers | DeepSeek (`deepseek-v4-flash`), Gemini (`gemini-3.5-flash`), OpenAI (`gpt-5.4-mini`) |
| Input | Nama produk (atau URL produk + scraping) |
| Output | JSON: `versionA` (hard-selling), `versionB` (storytelling), `caption` |
| Durasi | 15s / 30s / 60s / 90s (mempengaruhi target kata) |
| Aturan Konten | NO marketplace names, NO social media names, affiliate CTA only |

### Yang Dihilangkan (dari referensi)
- ❌ Autentikasi (login/register)
- ❌ Sistem kredit
- ❌ Payment gateway (Midtrans)
- ❌ Admin dashboard
- ❌ Database (PostgreSQL/Drizzle)
- ❌ Mode B-Roll / Roleplay / Hook-Only

### Yang Disimpan (dari referensi)
- ✅ System prompt (struktur, aturan konten, CTA afiliator)
- ✅ Dukungan multi-AI provider
- ✅ Web scraping URL produk
- ✅ Output JSON (versionA, versionB, caption)

**Keputusan:** ✅ Tambahkan panel AI Script Generator terintegrasi, 3 halaman Streamlit total.

---

## Sesi 5: Struktur Final

### 3 Halaman Streamlit:
1. **Main (`app.py`):** Video Editor — upload footage + naskah + TTS + adaptive trim + render
2. **`1_📝_Script_Generator.py`:** AI generate naskah dari produk
3. **`2_⚙️_Settings.py`:** API keys (Eleven Labs, DeepSeek, Gemini, OpenAI)

### Flow Final:
```
Generate Naskah → Copy ke Editor → Upload Footage → TTS (target durasi) 
→ Analyze Footage → Adaptive Trim → Concat → Render → Download
```

### Dokumen Dibuat:
- ✅ `PRD.md` — Product Requirements Document
- ✅ `PROGRESS.md` — Tracking progres development
- ✅ `CHANGELOG.md` — Log riwayat keputusan (file ini)

---

## Ringkasan Tech Stack Final

| Komponen | Teknologi |
|---|---|
| UI | Streamlit |
| Video | moviepy + OpenCV |
| TTS | Eleven Labs SDK |
| AI Text | DeepSeek API, Google GenAI SDK, OpenAI SDK |
| Scraping | requests + BeautifulSoup4 |

---

_Dokumen ini mencatat semua keputusan penting dari awal diskusi hingga siap implementasi._
