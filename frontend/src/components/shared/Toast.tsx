'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export function ToastContainer() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    if (state.toasts.length === 0) return;
    const timers = state.toasts.map((t) =>
      setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id: t.id }), 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, [state.toasts, dispatch]);

  if (state.toasts.length === 0) return null;

  const borderMap = {
    success: 'border-l-[var(--success)]',
    error: 'border-l-[var(--danger)]',
    warning: 'border-l-[var(--warning)]',
    info: 'border-l-[var(--info)]',
  };

  const iconMap = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
      {state.toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2 px-5 py-3 bg-[var(--bg-toast)] border border-[var(--border-toast)] text-[var(--text-toast)] border-l-4 rounded-xl shadow-xl text-sm pointer-events-auto animate-[toastIn_0.3s_ease] max-w-[calc(100vw-32px)] whitespace-nowrap',
            borderMap[t.type]
          )}
          onClick={() => dispatch({ type: 'REMOVE_TOAST', id: t.id })}
        >
          <span>{iconMap[t.type]}</span>
          <span>{t.message}</span>
          <X size={14} className="ml-2 cursor-pointer opacity-50 hover:opacity-100 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function cn(...args: (string | undefined | false | null)[]) {
  return args.filter(Boolean).join(' ');
}
