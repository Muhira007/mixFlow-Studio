'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { ProductInput, type InputMode } from '@/components/script-gen/ProductInput';
import { ConfigSelects } from '@/components/script-gen/ConfigSelects';
import { ScriptOutput } from '@/components/script-gen/ScriptOutput';
import { ScriptHistory } from '@/components/script-gen/ScriptHistory';
import { generateScript, scrapeProduct, ApiError, saveScriptToHistory, deleteScriptFromHistory } from '@/lib/api';

export default function ScriptGeneratorPage() {
  const router = useRouter();
  const { state, dispatch, addToast } = useApp();

  // Latest script = first in history
  const latestScript = state.scriptHistory[0] || null;

  const [productName, setProductName] = useState(latestScript?.productName || '');
  const [productUrl, setProductUrl] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('name');
  const [provider, setProvider] = useState(state.apiKeys.deepseek ? 'deepseek' : 'gemini');
  const [duration, setDuration] = useState('60');
  const [style, setStyle] = useState('santai-gaul');
  const [audience, setAudience] = useState('umum');
  const [loading, setLoading] = useState(false);

  /** Map provider value to its API key from settings */
  const getApiKey = (prov: string): string => {
    const map: Record<string, string> = {
      deepseek: state.apiKeys.deepseek,
      gemini: state.apiKeys.gemini,
      openai: state.apiKeys.openai,
    };
    return map[prov] || '';
  };

  const handleGenerate = async () => {
    // Validation
    if (inputMode === 'url' && !productUrl.trim()) {
      addToast('⚠️ Masukkan URL produk terlebih dahulu', 'warning');
      return;
    }
    if (inputMode === 'name' && !productName.trim()) {
      addToast('⚠️ Masukkan nama produk terlebih dahulu', 'warning');
      return;
    }

    const apiKey = getApiKey(provider);
    if (!apiKey) {
      addToast(`🔑 API key untuk ${provider} belum diisi. Buka Settings untuk mengisi.`, 'warning');
      return;
    }

    setLoading(true);

    try {
      let finalProductName = productName.trim();
      let productInfo: Record<string, string> | undefined;

      // If URL mode: scrape first
      if (inputMode === 'url') {
        try {
          const scraped = await scrapeProduct(productUrl.trim());
          finalProductName = scraped.title !== 'Tidak ditemukan' ? scraped.title : productUrl.trim();
          productInfo = {
            title: scraped.title,
            description: scraped.description,
            body_text: scraped.body_text,
          };
        } catch (err) {
          addToast('⚠️ Gagal scraping URL, lanjut dengan URL sebagai nama produk', 'warning');
          finalProductName = productUrl.trim();
        }
      }

      const result = await generateScript({
        productName: finalProductName,
        productUrl: inputMode === 'url' ? productUrl.trim() : undefined,
        provider,
        duration,
        style,
        audience,
        apiKey,
        product_info: productInfo,
      });

      const script = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        script: result.script,
        caption: result.caption,
        productName: finalProductName,
        style,
        duration,
        audience,
        createdAt: new Date().toISOString(),
      };

      dispatch({ type: 'ADD_SCRIPT_TO_HISTORY', script });
      // Sync ke backend SQLite
      saveScriptToHistory({
        id: script.id,
        script: script.script,
        caption: script.caption,
        product_name: script.productName,
        style: script.style,
        duration: script.duration,
        audience: script.audience,
        created_at: script.createdAt,
      }).catch(() => {});
      setLoading(false);
      addToast('✨ Naskah berhasil digenerate!');
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError) {
        addToast(`❌ ${err.message}`, 'error');
      } else {
        addToast('❌ Gagal generate naskah. Coba lagi.', 'error');
      }
    }
  };

  const handleCopyScript = () => {
    if (latestScript) {
      navigator.clipboard.writeText(latestScript.script);
      addToast('📋 Naskah disalin!');
    }
  };

  const handleCopyCaption = () => {
    if (latestScript) {
      navigator.clipboard.writeText(latestScript.caption);
      addToast('📋 Caption disalin!');
    }
  };

  const handleUseInEditor = (script = latestScript) => {
    if (script) {
      dispatch({ type: 'SET_SCRIPT_TEXT', text: script.script });
      addToast('➡️ Naskah dikirim ke Video Editor!');
      router.push('/');
    }
  };

  const handleDeleteFromHistory = (id: string) => {
    dispatch({ type: 'REMOVE_SCRIPT_FROM_HISTORY', id });
    deleteScriptFromHistory(id).catch(() => {});
    addToast('🗑️ Naskah dihapus dari riwayat');
  };

  const handleClearHistory = () => {
    dispatch({ type: 'CLEAR_SCRIPT_HISTORY' });
    addToast('🗑️ Semua riwayat naskah dihapus');
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
          mode={inputMode}
          productName={productName}
          productUrl={productUrl}
          onModeChange={setInputMode}
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

      <div className="mb-4">
        <ScriptOutput
          script={latestScript}
          onCopyScript={handleCopyScript}
          onCopyCaption={handleCopyCaption}
          onUseInEditor={() => handleUseInEditor()}
        />
      </div>

      <ScriptHistory
        history={state.scriptHistory}
        onUseInEditor={(script) => handleUseInEditor(script)}
        onDelete={handleDeleteFromHistory}
        onClearAll={handleClearHistory}
      />
    </div>
  );
}
