#!/usr/bin/env python3
"""Generate PDF: Skrip Rekaman — Standard Indonesian Voice Sample."""

from fpdf import FPDF

class VoiceScriptPDF(FPDF):
    def __init__(self):
        super().__init__('P', 'mm', 'A4')
        # Unicode fonts
        self.add_font("Sans", "", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
        self.add_font("Sans", "B", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
        self.add_font("Mono", "", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")
        self.add_font("Mono", "B", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf")

    def header(self):
        if self.page_no() > 1:
            return
        self.set_fill_color(99, 102, 241)
        self.rect(0, 0, 210, 48, 'F')
        self.set_text_color(255, 255, 255)
        self.set_font("Sans", "B", 22)
        self.set_y(14)
        self.cell(0, 10, "Skrip Rekaman", align="C")
        self.set_font("Sans", "", 11)
        self.set_y(30)
        self.cell(0, 8, "Standard Indonesian Voice Sample — Untuk Voice Cloning ElevenLabs", align="C")
        self.ln(20)

    def footer(self):
        self.set_y(-15)
        self.set_font("Sans", "", 7)
        self.set_text_color(140, 140, 140)
        self.cell(0, 10, f"mixFlow Voice Cloning Script — halaman {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title: str, number: str):
        self.set_fill_color(238, 242, 255)
        self.set_text_color(67, 56, 202)
        self.set_font("Sans", "B", 12)
        self.ln(3)
        self.cell(0, 9, f"  {number}  {title}", fill=True)
        self.ln(12)

    def script_block(self, text: str):
        self.set_fill_color(248, 250, 252)
        self.set_draw_color(203, 213, 225)
        self.set_text_color(30, 41, 59)
        self.set_font("Mono", "", 9.5)
        lines = text.strip().split("\n")
        block_h = len(lines) * 5.5 + 8
        if self.get_y() + block_h > 270:
            self.add_page()
        y0 = self.get_y()
        self.rect(14, y0, 182, block_h, 'DF')
        self.set_xy(18, y0 + 4)
        for line in lines:
            self.cell(174, 5.5, line)
            self.ln(5.5)
        self.set_y(y0 + block_h + 3)

    def tip_box(self, title: str, text: str):
        self.set_fill_color(254, 243, 199)
        self.set_draw_color(245, 158, 11)
        self.set_text_color(146, 64, 14)
        if self.get_y() > 250:
            self.add_page()
        y0 = self.get_y()
        self.rect(14, y0, 182, 18, 'DF')
        self.set_xy(18, y0 + 2)
        self.set_font("Sans", "B", 8)
        self.cell(174, 5, f"TIP: {title}")
        self.set_xy(18, y0 + 8)
        self.set_font("Sans", "", 7.5)
        self.cell(174, 5, text)
        self.set_y(y0 + 21)


def main():
    pdf = VoiceScriptPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(True, 18)
    pdf.add_page()

    # Intro
    pdf.set_text_color(71, 85, 105)
    pdf.set_font("Sans", "", 10)
    pdf.set_y(52)
    pdf.multi_cell(0, 5.5,
        "Skrip ini dirancang untuk menjadi sample audio saat melakukan voice cloning di ElevenLabs "
        "melalui fitur Clone My Voice milik mixFlow. Skrip mencakup seluruh fonem kritis bahasa "
        "Indonesia — terutama perbedaan e pepet (ə) dan e keras (e) — agar hasil clone memiliki "
        "pelafalan yang akurat, natural, dan standar.\n"
        "Baca dengan suara natural seperti sedang berbincang dengan teman. "
        "Total durasi: 3–5 menit."
    )

    # Guidelines
    pdf.section_title("Panduan Rekaman", "[GUIDE]")
    guidelines = [
        ("Ruang", "Sunyi, tanpa kipas angin, AC, atau echo."),
        ("Jarak mic", "15–20 cm dari mulut, jangan terlalu dekat."),
        ("Format file", "MP3 atau WAV, mono, sample rate 44100 Hz."),
        ("Kecepatan", "Natural. Jangan ngebut seperti baca berita, jangan terlalu lambat."),
        ("Intonasi", "Seperti ngomong ke teman — ada naik-turun, ekspresif."),
        ("E Pepet (ə)", 'Kata seperti "senang", "belajar", "kerja", "cepat" — e lemah, bukan e keras.'),
        ("Output", "Satu file audio gabungan, upload ke Clone My Voice di Settings mixFlow."),
    ]
    for label, desc in guidelines:
        pdf.set_font("Sans", "B", 8)
        pdf.set_text_color(30, 41, 59)
        pdf.set_x(18)
        pdf.cell(32, 5, label)
        pdf.set_font("Sans", "", 8)
        pdf.set_text_color(71, 85, 105)
        pdf.cell(0, 5, desc)
        pdf.ln(5.5)
    pdf.ln(2)

    # Bagian 1
    pdf.section_title("Pemanasan — E Pepet vs E Keras", "01")
    pdf.script_block(
        "Selamat pagi semuanya.\n"
        "Hari ini kita akan belajar bersama tentang pentingnya menjaga lingkungan.\n"
        "Ember itu berisi air bersih yang segar.\n"
        "Lebah dan lebah itu berbeda — yang satu serangga, yang satu lagi tidak.\n"
        "Kemeja merah itu dipakai oleh perempuan yang sedang bekerja.\n"
        "Saya menanam tanaman di kebun belakang rumah nenek.\n"
        "Pesenan makanan ini enak sekali."
    )
    pdf.tip_box("Fokus", 'Perhatikan e di kata "belajar", "embers", "kemeja", "perempuan", "bekerja", "menanam". E-nya lemah (ə), bukan e keras.')

    # Bagian 2
    pdf.section_title("Kata dengan E Pepet Dominan", "02")
    pdf.script_block(
        "Pemerintah memberikan perhatian khusus kepada pendidikan.\n"
        "Kementerian kesehatan menetapkan peraturan yang ketat.\n"
        "Sekelompok peneliti menemukan spesies baru di hutan Kalimantan.\n"
        "Mereka bersepakat untuk tidak memperpanjang perdebatan itu.\n"
        "Kesejahteraan masyarakat adalah tujuan utama pemerintahan.\n"
        "Pemberdayaan perempuan di sektor ekonomi terus meningkat."
    )
    pdf.tip_box("Fokus", 'Hampir semua "e" di bagian ini adalah e pepet (ə). Jangan ada e keras sama sekali.')

    # Bagian 3
    pdf.section_title("Kata dengan E Keras", "03")
    pdf.script_block(
        "Ekor kucing itu bergerak-gerak lucu sekali.\n"
        "Sate ayam dan sate kambing adalah makanan favorit saya.\n"
        "Merek sepatu lokal sekarang kualitasnya sudah bagus.\n"
        "Toko emas itu buka setiap hari kecuali minggu.\n"
        "Sate Padang, rendang, dan lele goreng — semuanya enak."
    )
    pdf.tip_box("Fokus", 'E di "ekor", "sate", "merek", "emas", "lele" diucapkan jelas (e keras), bukan ə.')

    # Bagian 4
    pdf.section_title("Diftong — ai, au, oi", "04")
    pdf.script_block(
        "Pantai itu ramai dikunjungi wisatawan asing maupun lokal.\n"
        "Pulau Seribu menawarkan pemandangan laut yang luar biasa.\n"
        "Seorang pemuda berambut keriting sedang bermain gitar di bawah pohon.\n"
        "Amboi, pemandangan dari atas bukit ini sangat indah sekali."
    )

    # Bagian 5
    pdf.section_title("Konsonan Rangkap — ng, ny, kh, sy", "05")
    pdf.script_block(
        "Nyanyian burung di pagi hari sangat menenangkan.\n"
        "Nenek saya tinggal di kota Malang, Jawa Timur.\n"
        "Khalayak ramai menyambut baik kebijakan baru dari pemerintah.\n"
        "Syarat dan ketentuan berlaku untuk semua pengguna layanan ini.\n"
        "Masyarakat menginginkan perubahan yang lebih baik.\n"
        "Nama panjangnya adalah Muhammad Nur Kholis Setiawan."
    )

    # Bagian 6
    pdf.section_title("Kalimat Panjang — Flow Natural", "06")
    pdf.script_block(
        "Beberapa waktu yang lalu, saya berkesempatan mengunjungi\n"
        "sebuah desa kecil di kaki Gunung Bromo. Di sana, penduduk\n"
        "setempat sangat ramah dan bersahabat. Mereka menyuguhkan\n"
        "kopi hangat sambil bercerita tentang kehidupan sehari-hari\n"
        "yang penuh dengan kesederhanaan dan kebahagiaan."
    )
    pdf.ln(2)
    pdf.script_block(
        "Produk yang akan saya review kali ini adalah sebuah blender\n"
        "portable yang sangat praktis dibawa ke mana saja. Kapasitasnya\n"
        "cukup besar, bisa menampung hingga lima ratus mililiter, dan\n"
        "dayanya lumayan kuat untuk menghaluskan es batu maupun buah beku."
    )

    # Bagian 7
    pdf.section_title("Variasi Emosi & Intonasi", "07")
    pdf.script_block(
        "Wah, keren banget!                                    ← excited\n"
        "Serius? Kamu serius ngomong begitu?                    ← heran\n"
        "Hati-hati ya, jalannya licin setelah hujan tadi.      ← peduli\n"
        "Aduh, kok bisa gitu sih?                              ← frustasi\n"
        "Baiklah, saya akan mencoba yang terbaik.               ← tekad\n"
        "Terima kasih banyak sudah mendengarkan.                ← tulus"
    )
    pdf.tip_box("Penting", 'Variasi emosi membantu ElevenLabs menangkap range ekspresi suara kamu. Jangan datar.')

    # Bagian 8
    pdf.section_title("Penutup — Kalimat Sehari-hari", "08")
    pdf.script_block(
        "Halo guys, selamat datang di channel aku.\n"
        "Hari ini aku mau review produk yang lagi viral banget.\n"
        "Penasaran gak sih kualitasnya sebagus yang diiklankan?\n"
        "Langsung aja kita unboxing bareng-bareng.\n"
        "Cek keranjang di bawah video ini untuk dapatkan harga terbaik.\n"
        "Jangan lupa like, share, dan follow untuk konten menarik lainnya.\n"
        "Sampai jumpa di video berikutnya. Dadah!"
    )

    # Footer notes
    pdf.ln(6)
    pdf.set_draw_color(99, 102, 241)
    pdf.set_fill_color(238, 242, 255)
    pdf.set_text_color(67, 56, 202)
    pdf.set_font("Sans", "B", 8)
    y = pdf.get_y()
    pdf.rect(14, y, 182, 22, 'DF')
    pdf.set_xy(18, y + 3)
    pdf.cell(174, 5, " Dibuat untuk mixFlow — AI Video Editor for Content Creator Affiliate")
    pdf.set_xy(18, y + 10)
    pdf.set_font("Sans", "", 7)
    pdf.cell(174, 5, "Upload audio hasil rekaman ke Settings → Clone My Voice. Clone memakan waktu ~1–2 menit.")
    pdf.set_xy(18, y + 16)
    pdf.cell(174, 5, "Voice ID hasil clone akan otomatis tersimpan di Voice Manager dan siap digunakan untuk TTS.")

    output = "/home/kangdemuh/aplikasi/mixflow/Voice-Clone-Script-Indonesian.pdf"
    pdf.output(output)
    print(f"✅ PDF saved: {output}")

if __name__ == "__main__":
    main()
