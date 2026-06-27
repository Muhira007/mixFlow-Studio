'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { ProductInput } from '@/components/script-gen/ProductInput';
import { ConfigSelects } from '@/components/script-gen/ConfigSelects';
import { ContentRules } from '@/components/script-gen/ContentRules';
import { ScriptOutput } from '@/components/script-gen/ScriptOutput';

// Demo scripts
const DEMO_CASUAL = {
  versionA: `Hai semuanya! Lagi cari serum yang bener-bener works buat ngilangin bekas jerawat?

Aku udah coba {{PRODUCT}} selama 2 minggu, dan hasilnya bikin shock! Bekas merah udah mulai pudar, tekstur kulit makin halus.

Yang paling penting: ringan banget di muka, gak lengket, dan cepat meresap. Cocok buat iklim tropis kayak di Indonesia.

Cek keranjang di bawah video ini ya!`,
  versionB: `Dua minggu lalu, aku hampir nyerah sama skin barrier yang rusak parah. Setiap pagi liat kaca, bekas jerawat masih merah-merah...

Sampai akhirnya temenku rekomendasiin satu produk yang katanya ampuh: {{PRODUCT}}.

Sekarang? Kulitku udah mulai pulih. Bekas merah mulai pudar, dan yang paling penting — texture-nya jadi lebih smooth. No filter!

Cek tautan di bawah buat cobain sendiri!`,
  caption: `Udah 2 minggu cobain {{PRODUCT}} & bekas jerawat mulai pudar bgt! ✨\nRingan, cepet meresap, cocok buat yang kulitnya sensitif.\n\n#SkincareIndonesia #RekomendasiSkincare #ProductReview`,
};

const DEMO_FORMAL = {
  versionA: `Selamat datang! Hari ini saya akan membahas {{PRODUCT}}, produk inovatif yang telah mendapatkan banyak perhatian.

Berdasarkan pengujian selama 2 minggu, produk ini menunjukkan hasil yang signifikan dalam mengatasi permasalahan kulit.

Komposisinya ringan dan mudah meresap, menjadikannya pilihan tepat untuk penggunaan sehari-hari di iklim tropis.

Klik tautan di bawah untuk informasi lebih lanjut.`,
  versionB: `Sebagai content creator, saya selalu selektif memilih produk untuk direview. Kali ini saya menemukan {{PRODUCT}}.

Setelah melakukan riset dan pengujian mandiri, saya menemukan bahwa produk ini memiliki formula yang seimbang dan efektif.

Banyak pengguna melaporkan hasil positif dalam 2 minggu pertama penggunaan. Saya sendiri merasakan perbedaan yang nyata.

Tautan produk tersedia di bawah video ini.`,
  caption: `Review lengkap {{PRODUCT}} setelah pemakaian 2 minggu. 📋\nFormula ringan, hasil maksimal. Cocok untuk semua jenis kulit.\n\n#ReviewJujur #ProdukTerbaik #ContentCreator`,
};

export default function ScriptGeneratorPage() {
  const router = useRouter();
  const { state, dispatch, addToast } = useApp();

  const [productName, setProductName] = useState(state.lastScript?.productName || 'GlowSkin Niacinamide Serum 30ml');
  const [productUrl, setProductUrl] = useState('');
  const [provider, setProvider] = useState('🧠 DeepSeek (deepseek-v4-flash)');
  const [duration, setDuration] = useState('60 detik (~220 kata)');
  const [style, setStyle] = useState('💬 Casual & Menarik');
  const [audience, setAudience] = useState('🌍 Umum');
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    if (!productName.trim()) {
      addToast('⚠️ Masukkan nama produk terlebih dahulu', 'warning');
      return;
    }

    setLoading(true);

    // Simulate API call (replace with real API call later)
    setTimeout(() => {
      const isFormal = style.includes('Formal');
      const templates = isFormal ? DEMO_FORMAL : DEMO_CASUAL;

      const script = {
        versionA: templates.versionA.replace(/\{\{PRODUCT\}\}/g, productName.trim()),
        versionB: templates.versionB.replace(/\{\{PRODUCT\}\}/g, productName.trim()),
        caption: templates.caption.replace(/\{\{PRODUCT\}\}/g, productName.trim()),
        productName: productName.trim(),
        style,
        duration,
        audience,
      };

      dispatch({ type: 'SET_LAST_SCRIPT', script });
      setLoading(false);
      addToast('✨ Naskah berhasil digenerate!');
    }, 1500);
  };

  const handleCopyVersionA = () => {
    if (state.lastScript) {
      navigator.clipboard.writeText(state.lastScript.versionA);
      addToast('📋 Version A disalin!');
    }
  };

  const handleCopyVersionB = () => {
    if (state.lastScript) {
      navigator.clipboard.writeText(state.lastScript.versionB);
      addToast('📋 Version B disalin!');
    }
  };

  const handleCopyCaption = () => {
    if (state.lastScript) {
      navigator.clipboard.writeText(state.lastScript.caption);
      addToast('📋 Caption disalin!');
    }
  };

  const handleUseInEditor = () => {
    if (state.lastScript) {
      dispatch({ type: 'SET_SCRIPT_TEXT', text: state.lastScript.versionA });
      addToast('➡️ Naskah dikirim ke Video Editor!');
      router.push('/');
    }
  };

  return (
    <div className="animate-fade-slide-in">
      <div className="mb-5">
        <h1 className="text-[1.4rem] font-bold mb-0.5 leading-tight">
          🤖 AI Script Generator
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          Generate naskah voice-over untuk promosi produk affiliate secara otomatis. Pilih AI provider favoritmu.
        </p>
      </div>

      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4 mb-4">
        <ProductInput
          productName={productName}
          productUrl={productUrl}
          onNameChange={setProductName}
          onUrlChange={setProductUrl}
        />
        <ConfigSelects
          provider={provider}
          duration={duration}
          style={style}
          audience={audience}
          loading={loading}
          onProviderChange={setProvider}
          onDurationChange={setDuration}
          onStyleChange={setStyle}
          onAudienceChange={setAudience}
          onGenerate={handleGenerate}
        />
      </div>

      <ContentRules />

      <ScriptOutput
        script={state.lastScript}
        onCopyVersionA={handleCopyVersionA}
        onCopyVersionB={handleCopyVersionB}
        onCopyCaption={handleCopyCaption}
        onUseInEditor={handleUseInEditor}
      />
    </div>
  );
}
