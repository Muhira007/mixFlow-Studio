'use client';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 max-md:px-3.5 max-md:py-3.5 content-scroll">
          {children}
        </main>
        <BottomNav />
      </div>
    </>
  );
}
