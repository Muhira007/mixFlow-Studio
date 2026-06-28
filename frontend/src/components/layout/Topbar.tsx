'use client';

import { Menu, ChevronRight, Sparkles, Bell, LayoutGrid } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { PANEL_NAMES } from '@/lib/constants';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export function Topbar() {
  const pathname = usePathname();
  const panelId = pathnameToPanel(pathname);

  function pathnameToPanel(path: string): string {
    if (path === '/') return 'editor';
    if (path.startsWith('/script-generator')) return 'script-gen';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/outputs')) return 'history';
    return 'editor';
  }

  return (
    <header className="h-16 border-b border-[var(--border)] flex items-center px-6 max-md:px-4 gap-4 bg-[var(--bg-primary)]/80 backdrop-blur-xl sticky top-0 z-40 shrink-0">
      {/* Hamburger */}
      <button
        className="hidden max-md:flex w-9 h-9 items-center justify-center bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--bg-card)] transition-all rounded-lg shrink-0 p-0 shadow-sm"
        onClick={() => {
          const sidebar = document.getElementById('sidebar');
          const overlay = document.getElementById('sidebar-overlay');
          if (sidebar) {
            if (sidebar.hasAttribute('data-open')) {
              sidebar.removeAttribute('data-open');
              overlay?.removeAttribute('data-open');
            } else {
              sidebar.setAttribute('data-open', '');
              overlay?.setAttribute('data-open', '');
            }
          }
        }}
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>

      {/* Modern Breadcrumb */}
      <div className="flex items-center gap-2 text-sm max-md:text-xs font-medium">
        <div className="flex items-center gap-2 text-[var(--text-muted)] select-none">
          <LayoutGrid size={16} className="max-md:hidden" />
          <span className="hidden sm:inline">Workspace</span>
        </div>
        <ChevronRight size={14} className="text-[var(--text-muted)] opacity-50" />
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 shadow-[inset_0_0_8px_rgba(255,255,255,0.05)] select-none">
          <Sparkles size={14} className="text-[var(--accent)] drop-shadow-[0_0_4px_var(--accent-glow)]" />
          <span className="tracking-wide">{PANEL_NAMES[panelId] || 'Video Editor'}</span>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="ml-auto flex items-center gap-3 shrink-0">
        <ThemeToggle />
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all relative group">
          <Bell size={17} className="group-hover:rotate-12 transition-transform" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--danger)] rounded-full border-2 border-[var(--bg-primary)] shadow-[0_0_8px_var(--danger)] animate-pulse"></span>
        </button>
        <div className="h-5 w-px bg-[var(--border)] mx-1 hidden sm:block"></div>
        <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity pl-1">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">MixFlow User</p>
            <p className="text-[0.6rem] text-[var(--text-muted)] font-medium">v1.0-beta</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-600 flex items-center justify-center text-white text-[0.65rem] font-bold shadow-lg shadow-[var(--accent)]/20 ring-2 ring-[var(--bg-primary)] ring-offset-1 ring-offset-[var(--border)]">
            MF
          </div>
        </div>
      </div>
    </header>
  );
}
