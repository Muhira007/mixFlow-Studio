'use client';

import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';

export default function OutputsPage() {
  const { state, dispatch, addToast } = useApp();

  return (
    <div className="animate-fade-slide-in">
      <div className="mb-5">
        <h1 className="text-[1.4rem] font-bold mb-0.5 leading-tight">
          📁 Output Videos
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          Video hasil render siap download. History disimpan di localStorage browser.
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto -mx-[18px] px-[18px] max-md:-mx-3.5 max-md:px-3.5">
          <table className="w-full border-collapse text-xs min-w-[600px]">
            <thead>
              <tr>
                <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">#</th>
                <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Nama File</th>
                <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Durasi</th>
                <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Ukuran</th>
                <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Dibuat</th>
                <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {state.outputHistory.length > 0 ? (
                state.outputHistory.map((item, i) => {
                  const date = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';
                  return (
                    <tr key={i}>
                      <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{i + 1}</td>
                      <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{item.name}</td>
                      <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{item.duration}</td>
                      <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{item.size}</td>
                      <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{date}</td>
                      <td className="py-2.5 px-2.5 border-b border-[var(--border)]">
                        <div className="flex gap-1">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => addToast('📥 Download dimulai... (backend dibutuhkan)', 'info')}
                          >
                            📥
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[var(--danger)]!"
                            onClick={() => {
                              dispatch({ type: 'REMOVE_OUTPUT', index: i });
                              addToast('🗑️ Output dihapus');
                            }}
                          >
                            🗑️
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                    📁 Belum ada video output. Render video dulu di Video Editor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
