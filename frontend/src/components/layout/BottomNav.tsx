'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden max-md:block h-16 bg-[var(--bg-secondary)] border-t border-[var(--border)] shrink-0 px-1 pb-[env(safe-area-inset-bottom,0)]">
      <div className="flex h-full items-center justify-around">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.path}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg cursor-pointer text-[var(--text-muted)] text-[0.64rem] font-medium transition-all duration-200 flex-1 max-w-[80px] border-none bg-none font-inherit no-underline tap-highlight-transparent touch-manipulation active:bg-[var(--bg-card)]',
              pathname === item.path && 'text-[var(--accent)]'
            )}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="truncate max-w-full">{item.label === 'Video Editor' ? 'Editor' : item.label === 'Script Generator' ? 'Script' : item.label === 'Output Videos' ? 'Output' : item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
