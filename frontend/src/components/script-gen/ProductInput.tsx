'use client';

import { Card } from '@/components/shared/Card';

export type InputMode = 'name' | 'url';

type Props = {
  mode: InputMode;
  productName: string;
  productUrl: string;
  onModeChange: (v: InputMode) => void;
  onNameChange: (v: string) => void;
  onUrlChange: (v: string) => void;
};

export function ProductInput({
  mode, productName, productUrl,
  onModeChange, onNameChange, onUrlChange,
}: Props) {
  return (
    <Card header="Input Produk" icon="📝">
      {/* Toggle: Nama Produk | URL Produk */}
      <div className="flex rounded-lg bg-[var(--bg-input)] border border-[var(--border)] p-0.5 mb-3.5">
        <button
          type="button"
          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
            mode === 'name'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => onModeChange('name')}
        >
          📛 Nama Produk
        </button>
        <button
          type="button"
          className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
            mode === 'url'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => onModeChange('url')}
        >
          🔗 URL Produk
        </button>
      </div>

      {/* Input: Nama Produk */}
      {mode === 'name' && (
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Nama Produk *
          </label>
          <input
            type="text"
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-hidden transition-all"
            placeholder="Contoh: GlowSkin Niacinamide Serum 30ml"
            value={productName}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
      )}

      {/* Input: URL Produk */}
      {mode === 'url' && (
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
            URL Produk *
          </label>
          <input
            type="url"
            className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-hidden transition-all"
            placeholder="https://tokopedia.com/produk/xxx"
            value={productUrl}
            onChange={(e) => onUrlChange(e.target.value)}
          />
          <p className="text-[0.72rem] text-[var(--text-muted)] mt-1">
            🔍 Auto-scrape judul + deskripsi produk dari halaman URL
          </p>
        </div>
      )}
    </Card>
  );
}
