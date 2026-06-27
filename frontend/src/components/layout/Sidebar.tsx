'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { state } = useApp();

  const mainItems = NAV_ITEMS.slice(0, 3);
  const outputItems = NAV_ITEMS.slice(3);

  return (
    <>
      {/* Overlay */}
      <div
        className="hidden max-md:block fixed inset-0 bg-black/60 z-[99] opacity-0 transition-opacity pointer-events-none peer-data-[open]:opacity-100 peer-data-[open]:pointer-events-auto"
        onClick={() => {
          document.getElementById('sidebar')?.removeAttribute('data-open');
        }}
      />

      {/* Sidebar */}
      <aside
        id="sidebar"
        className="w-[260px] max-w-[85vw] bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col shrink-0 z-[100] transition-transform duration-200
          max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:-translate-x-full max-md:shadow-2xl
          data-[open]:max-md:translate-x-0"
      >
        {/* Brand */}
        <div className="px-4 py-5 border-b border-[var(--border)] shrink-0">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-bold no-underline">
            <span className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center text-lg text-white shrink-0">
              🎬
            </span>
            <span
              className="gradient-primary bg-clip-text"
              style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              mixFlow
            </span>
          </Link>
          <p className="text-[0.72rem] text-[var(--text-muted)] mt-1 pl-[46px]">
            AI Video Editor for Affiliate
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <div className="text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-muted)] px-2.5 pt-3.5 pb-1.5 font-bold">
            Main Menu
          </div>

          {mainItems.map((item) => (
            <Link
              key={item.id}
              href={item.path}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-[var(--text-secondary)] font-medium text-sm border border-transparent relative select-none no-underline min-h-[42px] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] active:scale-[0.97]',
                pathname === item.path &&
                  'bg-[var(--bg-card)] text-white border-[var(--border)] shadow-[0_0_20px_var(--accent-glow)] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[18px] before:rounded-r before:gradient-primary'
              )}
            >
              <span className="text-lg w-6 text-center shrink-0">{item.icon}</span>
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-[var(--accent)] text-white text-[0.62rem] px-2 py-0.5 rounded-full font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}

          <div className="text-[0.62rem] uppercase tracking-[0.1em] text-[var(--text-muted)] px-2.5 pt-3.5 pb-1.5 font-bold">
            Output
          </div>

          {outputItems.map((item) => (
            <Link
              key={item.id}
              href={item.path}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 text-[var(--text-secondary)] font-medium text-sm border border-transparent relative select-none no-underline min-h-[42px] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] active:scale-[0.97]',
                pathname === item.path &&
                  'bg-[var(--bg-card)] text-white border-[var(--border)] shadow-[0_0_20px_var(--accent-glow)] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[18px] before:rounded-r before:gradient-primary'
              )}
            >
              <span className="text-lg w-6 text-center shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3.5 border-t border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)] animate-pulse" />
            {state.apiKeys.elevenlabs ? 'API Keys tersimpan' : 'Menunggu konfigurasi'}
          </div>
        </div>
      </aside>
    </>
  );
}
