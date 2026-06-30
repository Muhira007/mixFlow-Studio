import { APP_NAME, APP_VERSION, APP_DESC } from '@/lib/constants';

export default function AboutPage() {
  return (
    <div className="animate-fade-slide-in space-y-6">
        
        {/* Header */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 max-md:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-[var(--accent)] to-purple-600 rounded-full blur-3xl opacity-20 pointer-events-none" />
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-purple-600 flex items-center justify-center text-3xl text-white shadow-lg shadow-[var(--accent)]/20 shrink-0">
              🎬
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
                {APP_NAME}
              </h1>
              <p className="text-[var(--text-secondary)] font-medium mt-1">
                {APP_DESC}
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold border border-[var(--accent)]/20 shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Versi {APP_VERSION}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 max-md:p-6 shadow-xs text-[var(--text-secondary)] leading-relaxed space-y-6">
          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Tentang Aplikasi</h2>
            <p>
              <strong>{APP_NAME}</strong> adalah aplikasi all-in-one yang dirancang khusus untuk mempermudah pekerjaan <i>content creator affiliate</i> dalam membuat video promosi produk (seperti di TikTok Shop, Shopee Video, dsb).
            </p>
            <p className="mt-2">
              Dengan mengintegrasikan kecerdasan buatan (AI), aplikasi ini mengatasi masalah utama pembuatan konten yaitu <i>writer&apos;s block</i> (saat menulis naskah) dan kerumitan saat proses <i>editing</i> video.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Fitur Utama</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)] mt-0.5">🤖</span>
                <div>
                  <strong className="text-[var(--text-primary)]">AI Script Generator:</strong> 
                  <br />Otomatis membuat naskah promosi berdasarkan nama atau URL produk menggunakan model AI terkemuka seperti DeepSeek, Google Gemini, atau OpenAI.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)] mt-0.5">🔊</span>
                <div>
                  <strong className="text-[var(--text-primary)]">Text-to-Speech & Voice Clone:</strong> 
                  <br />Mengubah naskah teks menjadi suara (voice-over) natural menggunakan ElevenLabs, lengkap dengan dukungan kloning suara langsung dari aplikasi.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)] mt-0.5">🎞️</span>
                <div>
                  <strong className="text-[var(--text-primary)]">Automated Video Editor:</strong> 
                  <br />Menganalisis footage mentah, memotong bagian yang tidak perlu (adaptive trim), dan menggabungkannya dengan voice-over menjadi video vertikal (9:16).
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[var(--accent)] mt-0.5">💬</span>
                <div>
                  <strong className="text-[var(--text-primary)]">Auto Caption & Auto Cover:</strong> 
                  <br />Menghasilkan subtitle otomatis (Whisper STT) dan mendesain cover/thumbnail video yang menarik dengan typografi otomatis (OpenCV & Pillow).
                </div>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">Privasi & Keamanan Data</h2>
            <p>
              mixFlow Studio dibangun mengutamakan keamanan dan privasi. Aplikasi ini berjalan secara <strong>lokal di komputer Anda</strong>. Semua pengaturan, riwayat naskah, video output, dan kunci API (API Keys) disimpan aman di dalam database SQLite lokal Anda dan tidak dikirimkan ke server kami. API Key Anda hanya digunakan untuk berkomunikasi langsung dengan penyedia layanan AI (seperti OpenAI atau ElevenLabs).
            </p>
          </section>
          
          <hr className="border-[var(--border)]" />
          
          <div className="text-center text-sm text-[var(--text-muted)] pt-2">
            <p>Dibuat dengan ❤️ oleh Dede Muhira (Muhira007)</p>
            <p className="mt-1">© {new Date().getFullYear()} {APP_NAME}. Hak Cipta Dilindungi.</p>
          </div>
        </div>

    </div>
  );
}
