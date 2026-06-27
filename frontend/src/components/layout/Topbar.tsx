'use client';

import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { PANEL_NAMES } from '@/lib/constants';

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
    <header className="h-14 border-b border-[var(--border)] flex items-center px-4 gap-3 bg-[var(--bg-secondary)] shrink-0">
      {/* Hamburger */}
      <button
        className="hidden max-md:flex w-9 h-9 items-center justify-center bg-none border-none text-[var(--text-primary)] text-2xl cursor-pointer rounded-lg shrink-0 p-0 active:bg-[var(--bg-card)]"
        onClick={() => {
          const sidebar = document.getElementById('sidebar');
          if (sidebar) {
            if (sidebar.hasAttribute('data-open')) {
              sidebar.removeAttribute('data-open');
            } else {
              sidebar.setAttribute('data-open', '');
            }
          }
        }}
        aria-label="Menu"
      >
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <div className="text-xs text-[var(--text-muted)] truncate">
        mixFlow / <span className="text-[var(--text-primary)] font-semibold">
          {PANEL_NAMES[panelId] || 'Video Editor'}
        </span>
      </div>

      {/* Actions */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <span className="text-[0.68rem] text-[var(--text-muted)]">v1.0-beta</span>
      </div>
    </header>
  );
}
