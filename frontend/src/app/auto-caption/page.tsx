'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/shared/Card';
import { fetchCaptionSettings, saveCaptionSettings, type CaptionSettings } from '@/lib/api';
import { useApp } from '@/contexts/AppContext';

const DEFAULT_SETTINGS: CaptionSettings = {
  font: 'The Bold Font',
  size: 24,
  color: '#FFFFFF',
  outline_color: '#000000',
  outline_size: 2,
  position: 85,
  uppercase: false,
  template: 'classic',
  social_max_words: 40,
  social_hashtags: 5,
  social_tone: 'Storytelling (Bercerita)',
};

const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Verdana',
  'Courier New',
  'Impact',
  'The Bold Font',
];

const TEMPLATES = [
  { id: 'classic', label: 'Classic', desc: 'Teks polos biasa' },
  { id: 'karaoke_yellow', label: 'Karaoke Yellow', desc: 'Sorotan kata warna kuning ala CapCut' },
  { id: 'karaoke_green', label: 'Karaoke Green', desc: 'Sorotan kata warna hijau neon' },
  { id: 'karaoke_red', label: 'Karaoke Red', desc: 'Sorotan kata warna merah menyala' }
];

export default function AutoCaptionPage() {
  const { addToast } = useApp();
  const [settings, setSettings] = useState<CaptionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCaptionSettings()
      .then((res) => {
        if (res?.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...res.settings });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveCaptionSettings(settings);
      if (res?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...res.settings });
      }
      addToast('✅ Pengaturan Caption & Sosial Media berhasil disimpan!', 'success');
    } catch (err: any) {
      addToast('❌ Gagal menyimpan pengaturan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const update = (updates: Partial<CaptionSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return <div className="p-6 text-[var(--text-muted)]">Loading settings...</div>;
  }

  return (
    <div className="p-6 max-w-[900px] w-full mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Auto Caption Configuration</h1>
        <p className="text-sm text-[var(--text-muted)]">Atur gaya tampilan subtitle/caption otomatis untuk video Anda.</p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Pilihan Template</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map(tpl => {
            const isActive = tpl.id === settings.template;
            return (
              <div 
                key={tpl.id}
                onClick={() => update({ template: tpl.id })}
                className={`bg-[var(--bg-card)] border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:border-[var(--accent)] ${
                  isActive ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)]'
                }`}
              >
                <div className={`font-bold mb-1 ${
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
                }`}>{tpl.label}</div>
                <div className="text-xs text-[var(--text-muted)] leading-relaxed">{tpl.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Pengaturan Tambahan (Opsional)</h3>
        <Card>
          <div className="space-y-6">
            {/* Font row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                  Jenis Font (Override Template)
                </label>
                <select
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg
                            px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  value={settings.font}
                  onChange={(e) => update({ font: e.target.value })}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                  Ukuran Font: <span className="text-[var(--accent)]">{settings.size}px</span>
                </label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={settings.size}
                  onChange={(e) => update({ size: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            </div>

            {/* Colors row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                  Warna Teks
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.color}
                    onChange={(e) => update({ color: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent"
                  />
                  <code className="text-xs text-[var(--text-muted)]">{settings.color}</code>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                  Ketebalan Outline: <span className="text-[var(--accent)]">{settings.outline_size}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="8"
                  value={settings.outline_size}
                  onChange={(e) => update({ outline_size: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            </div>

            {/* Outline Color & Uppercase */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                  Warna Outline
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.outline_color}
                    onChange={(e) => update({ outline_color: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent"
                  />
                  <code className="text-xs text-[var(--text-muted)]">{settings.outline_color}</code>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">
                  Kapital (UPPERCASE)
                </label>
                <label className="flex items-center gap-3 cursor-pointer mt-2">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={settings.uppercase} onChange={(e) => update({ uppercase: e.target.checked })} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${settings.uppercase ? 'bg-[var(--accent)]' : 'bg-gray-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.uppercase ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-sm text-[var(--text-primary)] font-medium">AKTIF — Semua huruf besar</span>
                </label>
              </div>
            </div>

            {/* Position */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex justify-between">
                <span>Posisi Vertikal Caption</span>
                <span className="text-[var(--accent)]">{settings.position}%</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)]">Bawah</span>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={settings.position}
                  onChange={(e) => update({ position: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
                <span className="text-xs text-[var(--text-muted)]">Atas</span>
              </div>
            </div>

            <div className="h-px bg-[var(--border)] my-6"></div>

            {/* Social Media AI */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🤖</span>
                <h4 className="font-bold text-[var(--text-primary)] text-sm">Caption Sosial Media (AI DeepSeek)</h4>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-4">Hasil transkrip video akan diproses ulang oleh AI untuk menjadi caption siap upload sosmed.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Maksimum Kata</label>
                  <input 
                    type="number" 
                    value={settings.social_max_words} 
                    onChange={(e) => update({ social_max_words: parseInt(e.target.value) || 40 })}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] outline-none"
                  />
                  <div className="text-[0.65rem] text-[var(--text-muted)] mt-1.5">Caption utama (default: 40)</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Jumlah Hashtag</label>
                  <input 
                    type="number" 
                    value={settings.social_hashtags} 
                    onChange={(e) => update({ social_hashtags: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] outline-none"
                  />
                  <div className="text-[0.65rem] text-[var(--text-muted)] mt-1.5">0 = tanpa hashtag (default: 5)</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block">Gaya Bahasa</label>
                  <select 
                    value={settings.social_tone} 
                    onChange={(e) => update({ social_tone: e.target.value })}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] outline-none"
                  >
                    <option value="Storytelling (Bercerita)">Storytelling (Bercerita)</option>
                    <option value="Santai & Gaul (Gen-Z)">Santai & Gaul (Gen-Z)</option>
                    <option value="Hard Selling (FOMO)">Hard Selling (FOMO)</option>
                    <option value="Edukasi & Pakar">Edukasi & Pakar</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--border)] mt-6 mb-4"></div>
            <div className="flex justify-end">
              <button 
                onClick={save} 
                disabled={saving}
                className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-slate-50 hover:text-slate-900 dark:hover:text-slate-50 px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Menyimpan...' : '💾 Simpan Konfigurasi'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
