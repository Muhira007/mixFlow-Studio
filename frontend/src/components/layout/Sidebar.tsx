'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { Settings, Zap } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { state } = useApp();

  const mainItems = NAV_ITEMS.slice(0, 5);
  const outputItems = NAV_ITEMS.slice(5);

  return (
    <>
      {/* Overlay */}
      <div
        id="sidebar-overlay"
        className="hidden max-md:block fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] opacity-0 transition-all duration-300 pointer-events-none data-[open]:opacity-100 data-[open]:pointer-events-auto"
        onClick={() => {
          document.getElementById('sidebar')?.removeAttribute('data-open');
          document.getElementById('sidebar-overlay')?.removeAttribute('data-open');
        }}
      />

      {/* Sidebar */}
      <aside
        id="sidebar"
        className="w-[270px] max-w-[85vw] bg-[var(--bg-primary)] border-r border-[var(--border)] flex flex-col shrink-0 z-[100] transition-transform duration-300 ease-out
          max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:-translate-x-full max-md:shadow-2xl
          data-[open]:max-md:translate-x-0 relative overflow-hidden"
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[var(--accent)]/10 to-transparent pointer-events-none -z-10" />

        {/* Brand */}
        <div className="px-5 py-6 border-b border-[var(--border)]/50 shrink-0 relative">
          <Link href="/" className="flex items-center gap-3 text-2xl font-black no-underline tracking-tight group">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-purple-600 flex items-center justify-center text-xl text-white shrink-0 shadow-lg shadow-[var(--accent)]/20 group-hover:scale-105 transition-transform duration-300">
              🎬
            </span>
            <div className="flex flex-col">
              <span
                className="bg-gradient-to-r from-[var(--accent)] to-purple-400 bg-clip-text text-transparent leading-none"
              >
                mixFlow
              </span>
              <span className="text-[0.65rem] text-[var(--text-muted)] font-medium mt-1 tracking-wider uppercase">
                AI Video Editor
              </span>
            </div>
          </Link>
          
          {/* Close button (Mobile only) */}
          <button
            className="hidden max-md:flex absolute top-6 right-4 w-8 h-8 items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--danger)] hover:text-white hover:border-[var(--danger)] transition-all shadow-sm"
            onClick={() => {
              document.getElementById('sidebar')?.removeAttribute('data-open');
              document.getElementById('sidebar-overlay')?.removeAttribute('data-open');
            }}
            aria-label="Close Sidebar"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto content-scroll">
          <div className="text-[0.65rem] uppercase tracking-widest text-[var(--text-muted)] px-3 pt-2 pb-2 font-bold opacity-80">
            Main Menu
          </div>

          {mainItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => {
                  document.getElementById('sidebar')?.removeAttribute('data-open');
                  document.getElementById('sidebar-overlay')?.removeAttribute('data-open');
                }}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-300 text-sm font-medium border relative select-none no-underline min-h-[44px] group overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 text-white border-transparent shadow-[0_4px_15px_var(--accent-glow)] hover:brightness-110'
                    : 'text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] hover:border-[var(--border)]/80 hover:shadow-sm'
                )}
              >
                <span className={cn("text-lg w-6 text-center shrink-0 transition-transform duration-300", !isActive && "group-hover:scale-110")}>{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
                {item.badge && (
                  <span className={cn("ml-auto text-[0.65rem] px-2 py-0.5 rounded-full font-bold z-10 shadow-sm", isActive ? "bg-white/20 text-white" : "bg-[var(--accent)] text-white")}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="text-[0.65rem] uppercase tracking-widest text-[var(--text-muted)] px-3 pt-5 pb-2 font-bold opacity-80">
            Output
          </div>

          {outputItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => {
                  document.getElementById('sidebar')?.removeAttribute('data-open');
                  document.getElementById('sidebar-overlay')?.removeAttribute('data-open');
                }}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-300 text-sm font-medium border relative select-none no-underline min-h-[44px] group overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]/80 text-white border-transparent shadow-[0_4px_15px_var(--accent-glow)] hover:brightness-110'
                    : 'text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] hover:border-[var(--border)]/80 hover:shadow-sm'
                )}
              >
                <span className={cn("text-lg w-6 text-center shrink-0 transition-transform duration-300", !isActive && "group-hover:scale-110")}>{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Premium Footer Status */}
        <div className="p-4 border-t border-[var(--border)]/50 shrink-0 bg-[var(--bg-primary)]">
          <Link href="/settings" className="block no-underline">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-3 hover:border-[var(--accent)]/50 transition-colors group cursor-pointer shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-inner", state.apiKeys.elevenlabs ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-yellow-500/10 text-yellow-500")}>
                {state.apiKeys.elevenlabs ? <Zap size={16} /> : <Settings size={16} />}
              </div>
              
              <div className="flex-1 min-w-0 z-10">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  API Status
                </p>
                <p className="text-[0.65rem] text-[var(--text-muted)] truncate mt-0.5 flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full shadow-sm", state.apiKeys.elevenlabs ? "bg-[var(--success)] shadow-[var(--success)]" : "bg-yellow-500 shadow-yellow-500 animate-pulse")} />
                  {state.apiKeys.elevenlabs ? 'Connected' : 'Missing Keys'}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
