'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/shared/Card';
import { fetchCaptionSettings, saveCaptionSettings, type CaptionSettings } from '@/lib/api';

const DEFAULT_SETTINGS: CaptionSettings = {
  font: 'Arial',
  size: 20,
  color: '#FFFFFF',
  outline_color: '#000000',
  outline_size: 2,
  position: 85,
  uppercase: false,
  template: 'plain',
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

export function CaptionConfig() {
  const [settings, setSettings] = useState<CaptionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings from backend
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

  // Save settings to backend
  const save = async (updates: Partial<CaptionSettings>) => {
    setSaving(true);
    setSaved(false);
    const next = { ...settings, ...updates };
    setSettings(next);
    try {
      const res = await saveCaptionSettings(updates);
      if (res?.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...res.settings });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // revert on error
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card header="Caption Style" icon="💬">
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </Card>
    );
  }

  return (
    <Card header="Caption Style" icon="💬">
      <div className="space-y-4">
        {/* Font */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">
            Font
          </label>
          <select
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg
                       px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none
                       focus:border-[var(--accent)]"
            value={settings.font}
            onChange={(e) => save({ font: e.target.value })}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Size */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">
            Size: <span className="text-[var(--accent)]">{settings.size}px</span>
          </label>
          <input
            type="range"
            min="12"
            max="48"
            value={settings.size}
            onChange={(e) => save({ size: parseInt(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-[0.6rem] text-[var(--text-muted)]">
            <span>12px</span>
            <span>48px</span>
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">
            Text Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.color}
              onChange={(e) => save({ color: e.target.value })}
              className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent"
            />
            <code className="text-xs text-[var(--text-muted)]">{settings.color}</code>
          </div>
        </div>

        {/* Outline */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">
              Outline Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.outline_color}
                onChange={(e) => save({ outline_color: e.target.value })}
                className="w-8 h-8 rounded border border-[var(--border)] cursor-pointer bg-transparent"
              />
              <code className="text-[0.6rem] text-[var(--text-muted)]">{settings.outline_color}</code>
            </div>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">
              Outline Size: <span className="text-[var(--accent)]">{settings.outline_size}px</span>
            </label>
            <input
              type="range"
              min="0"
              max="8"
              value={settings.outline_size}
              onChange={(e) => save({ outline_size: parseInt(e.target.value) })}
              className="w-full accent-[var(--accent)]"
            />
          </div>
        </div>

        {/* Position */}
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1 block">
            Vertical Position: <span className="text-[var(--accent)]">{settings.position}%</span>
            <span className="text-[var(--text-muted)] ml-1">(0=top, 100=bottom)</span>
          </label>
          <input
            type="range"
            min="5"
            max="95"
            value={settings.position}
            onChange={(e) => save({ position: parseInt(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        {/* UPPERCASE */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.uppercase}
            onChange={(e) => save({ uppercase: e.target.checked })}
            className="w-4 h-4 accent-[var(--accent)] rounded"
          />
          <span className="text-sm text-[var(--text-primary)]">
            UPPERCASE semua kata
          </span>
        </label>

        {/* Preview */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3">
          <p className="text-[0.6rem] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
            Preview
          </p>
          <p
            className="text-center leading-relaxed py-2"
            style={{
              fontFamily: settings.font,
              fontSize: `${settings.size}px`,
              color: settings.color,
              textShadow: `0 0 ${settings.outline_size}px ${settings.outline_color},
                            -${settings.outline_size}px 0 ${settings.outline_color},
                            0 ${settings.outline_size}px ${settings.outline_color},
                            ${settings.outline_size}px 0 ${settings.outline_color}`,
              textTransform: settings.uppercase ? 'uppercase' : 'none',
            }}
          >
            {settings.uppercase ? 'HALO GUYS HARI INI' : 'Halo guys, hari ini aku'}
          </p>
        </div>

        {/* Save indicator */}
        {saved && (
          <p className="text-xs text-[var(--success)] text-center animate-fade-slide-in">
            ✅ Settings saved
          </p>
        )}
      </div>
    </Card>
  );
}
