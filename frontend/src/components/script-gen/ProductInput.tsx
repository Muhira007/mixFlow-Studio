'use client';

import { Card } from '@/components/shared/Card';

type Props = {
  productName: string;
  productUrl: string;
  onNameChange: (v: string) => void;
  onUrlChange: (v: string) => void;
};

export function ProductInput({ productName, productUrl, onNameChange, onUrlChange }: Props) {
  return (
    <Card header="📝 Input Produk" icon="📝">
      <div className="mb-3.5">
        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
          Nama Produk *
        </label>
        <input
          type="text"
          className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-none transition-all"
          placeholder="Contoh: GlowSkin Niacinamide Serum 30ml"
          value={productName}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      <div className="mb-3.5">
        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
          URL Produk{' '}
          <span className="font-normal text-[var(--text-muted)]">(opsional)</span>
        </label>
        <input
          type="url"
          className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-none transition-all"
          placeholder="https://tokopedia.com/produk/xxx"
          value={productUrl}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        <p className="text-[0.72rem] text-[var(--text-muted)] mt-1">
          🔍 Auto-scrape judul + deskripsi produk (backend dibutuhkan)
        </p>
      </div>
    </Card>
  );
}
