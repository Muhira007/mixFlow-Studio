'use client';

import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';

export function AnalysisTable() {
  const { state } = useApp();

  return (
    <Card header="📊 Hasil Analisis Footage" icon="📊">
      <div className="overflow-x-auto -mx-[18px] px-[18px] max-md:-mx-3.5 max-md:px-3.5">
        <table className="w-full border-collapse text-xs min-w-[600px]">
          <thead>
            <tr>
              <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">#</th>
              <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">File</th>
              <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Durasi</th>
              <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Resolusi</th>
              <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Blur</th>
              <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Shake</th>
              <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Good Segment</th>
              <th className="text-left py-2 px-2.5 text-[var(--text-muted)] font-semibold text-[0.7rem] uppercase tracking-[0.05em] border-b border-[var(--border)] whitespace-nowrap">Kualitas</th>
            </tr>
          </thead>
          <tbody>
            {state.analysisResults.length > 0 ? (
              state.analysisResults.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{r.id}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{r.file}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{r.duration}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{r.resolution}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{r.blur}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{r.shake}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{r.goodSegment}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">
                    <Badge
                      label={r.quality === 'good' ? 'Good' : r.quality === 'ok' ? 'OK' : 'Trim'}
                      variant={r.quality === 'good' ? 'good' : r.quality === 'ok' ? 'warn' : 'bad'}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-8 text-[var(--text-muted)]">
                  Upload footage dan klik Analyze untuk melihat hasil analisis
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
