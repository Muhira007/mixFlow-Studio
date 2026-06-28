'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/shared/Card';
import { fetchCoverSettings, saveCoverSettings, type CoverSettings } from '@/lib/api';
import { useApp } from '@/contexts/AppContext';
import { STYLES } from '@/lib/constants';

const DEFAULT_SETTINGS: CoverSettings = {
  template: 'tpl_new_1',
  bg_opacity: 0,
  title_style: 'Storytelling (Bercerita)',
  title_max_words: 12,
};

const TEMPLATES = [
  { id: 'tpl_new_1', name: 'Judul Kuning', desc: 'Subtitle putih', category: 'Kuning-Putih', type: 'DUAL COLOR' },
  { id: 'tpl_new_2', name: 'Judul Hijau', desc: 'Subtitle putih', category: 'Hijau-Putih', type: 'DUAL COLOR' },
  { id: 'tpl_new_3', name: 'Judul Merah', desc: 'Subtitle putih', category: 'Merah-Putih', type: 'DUAL COLOR' },
  { id: 'none', name: 'BLANK COVER', desc: '', category: 'Blank Cover', type: 'POLOS' },
];

export default function AutoCoverPage() {
  const { addToast } = useApp();
  const [settings, setSettings] = useState<CoverSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCoverSettings()
      .then((res) => {
        if (res?.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...res.settings });
        }
      })
      .catch(() => {}) // Ignore if backend not ready yet
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveCoverSettings(settings);
      if (res?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...res.settings });
      }
      addToast('✅ Pengaturan Cover berhasil disimpan!', 'success');
    } catch (err: any) {
      addToast('❌ Gagal menyimpan pengaturan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const update = (updates: Partial<CoverSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  if (loading) {
    return <div className="p-6 text-[var(--text-muted)]">Loading settings...</div>;
  }

  return (
    <div className="p-6 max-w-[1100px] w-full mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Auto Cover Configuration</h1>
          <p className="text-sm text-[var(--text-muted)]">Pilih template cover & pengaturan AI untuk generate cover otomatis.</p>
        </div>
        <button 
          onClick={save} 
          disabled={saving}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Menyimpan...' : '💾 Simpan Konfigurasi'}
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[var(--accent)]">🖼️</span>
          <h3 className="text-sm font-bold text-white">Pilihan Template Cover</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map(tpl => {
            const isActive = tpl.id === settings.template;
            return (
              <div 
                key={tpl.id}
                onClick={() => update({ template: tpl.id })}
                className={`bg-[#0F111A] border-2 rounded-xl flex flex-col cursor-pointer transition-all duration-200 overflow-hidden h-[400px] relative hover:border-[var(--accent)] ${
                  isActive ? 'border-[var(--accent)] shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-[var(--border)]'
                }`}
              >
                {isActive && (
                  <div className="absolute top-3 right-3 bg-[var(--accent)] rounded-full p-1 z-10">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                )}
                
                <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                  {/* Mockup preview */}
                  <div className="bg-black/50 px-4 py-2 rounded-lg text-center backdrop-blur-sm border border-white/5">
                    {tpl.id !== 'none' ? (
                      <>
                        <div className={`font-black text-xl mb-1 ${
                          tpl.id === 'tpl_new_1' ? 'text-[#FFD700]' : 
                          tpl.id === 'tpl_new_2' ? 'text-[#00FF00]' : 
                          'text-[#FF3333]'
                        }`}>
                          {tpl.name}
                        </div>
                        <div className="text-white font-bold text-lg">
                          {tpl.desc}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500 font-bold text-xl uppercase">
                        Blank Cover
                      </div>
                    )}
                  </div>
                </div>

                <div className={`py-4 text-center border-t border-[var(--border)] bg-[#151822] ${isActive ? 'bg-[var(--accent)]/10' : ''}`}>
                  <div className="text-[0.6rem] font-bold text-[var(--accent)] mb-1">{tpl.type}</div>
                  <div className="text-sm text-white font-medium">{tpl.category}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-white mb-3 mt-8">Pengaturan Tambahan</h3>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Opacity */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[var(--accent)] font-bold">T</span>
                <label className="text-sm font-semibold text-[var(--text-secondary)]">
                  Opacity Background
                </label>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.bg_opacity}
                  onChange={(e) => update({ bg_opacity: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
                <span className="text-white font-bold w-12 text-right">{settings.bg_opacity}%</span>
              </div>
              <p className="text-[0.65rem] text-[var(--text-muted)] mt-4">Transparansi box di belakang teks judul cover. 0 = transparan penuh.</p>
            </div>

            {/* AI Judul */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#F59E0B]">⚡</span>
                <label className="text-sm font-semibold text-[var(--text-secondary)]">
                  AI Judul (DeepSeek)
                </label>
              </div>
              
              <select
                className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg
                          px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)] mb-2"
                value={settings.title_style}
                onChange={(e) => update({ title_style: e.target.value })}
              >
                {STYLES.map((s) => (
                  <option key={s.value} value={s.label}>{s.label}</option>
                ))}
              </select>
              <p className="text-[0.65rem] text-[var(--text-muted)] mb-4">Gaya penulisan judul cover oleh AI</p>

              <div>
                <label className="text-xs font-semibold text-white mb-2 block">
                  Maksimum Kata: <span className="text-[var(--accent)]">{settings.title_max_words}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={settings.title_max_words}
                  onChange={(e) => update({ title_max_words: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
                <div className="flex justify-between text-[0.6rem] text-[var(--text-muted)] mt-1">
                  <span>3</span>
                  <span>12</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
