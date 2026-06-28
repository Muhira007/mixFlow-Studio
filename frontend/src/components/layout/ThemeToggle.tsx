'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex bg-[var(--bg-input)] p-1 rounded-xl shadow-inner border border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg" />
        <div className="w-8 h-8 rounded-lg" />
        <div className="w-8 h-8 rounded-lg" />
      </div>
    );
  }

  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'dark', icon: Moon, label: 'Dark' },
  ];

  return (
    <div className="flex items-center bg-[var(--bg-input)] p-1 rounded-xl shadow-inner border border-[var(--border)] relative overflow-hidden shrink-0">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          title={opt.label}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 relative z-10",
            theme === opt.value
              ? "text-[var(--accent)] drop-shadow-[0_0_8px_var(--accent-glow)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          )}
        >
          {theme === opt.value && (
            <div className="absolute inset-0 bg-[var(--bg-card)] rounded-lg shadow-sm border border-[var(--border)] -z-10 transition-all duration-300" />
          )}
          <opt.icon size={14} className={cn("transition-transform duration-300", theme === opt.value && "scale-110")} />
        </button>
      ))}
    </div>
  );
}
