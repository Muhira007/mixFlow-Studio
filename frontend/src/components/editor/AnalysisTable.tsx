'use client';

import { useApp } from '@/contexts/AppContext';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';

export function AnalysisTable({ results, hideLoading, noCard }: { results?: any[], hideLoading?: boolean, noCard?: boolean }) {
  const { state } = useApp();
  const dataToUse = results || state.analysisResults;
  const isLoading = !results && state.pipelineStep === 'analyze' && state.analysisResults.length === 0;

  const content = (
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
            {isLoading && !hideLoading ? (
              <tr key="loading">
                <td colSpan={8} className="text-center py-8">
                  <span className="text-[var(--accent)] text-xs animate-pulse">
                    🔍 Menganalisis footage... Mohon tunggu
                  </span>
                </td>
              </tr>
            ) : dataToUse.length > 0 ? (
              dataToUse.map((r, i) => (
                <tr key={r.file_id || i}>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{i + 1}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)] max-w-[140px] truncate">{r.file}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{r.duration}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{r.resolution}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{typeof r.blur === 'number' ? r.blur.toFixed(1) : r.blur}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{typeof r.shake === 'number' ? r.shake.toFixed(1) : r.shake}</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">{r.good_start_sec?.toFixed(1)}s - {r.good_end_sec?.toFixed(1)}s</td>
                  <td className="py-2.5 px-2.5 border-b border-[var(--border)]">
                    <Badge
                      label={r.quality === 'good' ? 'Good' : r.quality === 'ok' ? 'OK' : 'Trim'}
                      variant={r.quality === 'good' ? 'good' : r.quality === 'ok' ? 'warn' : 'bad'}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr key="empty">
                <td colSpan={8} className="text-center py-8 text-[var(--text-muted)]">
                  Upload footage dan klik Analyze untuk melihat hasil analisis
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
  );

  if (noCard) {
    return content;
  }

  return (
    <Card header="Hasil Analisis Footage" icon="📊">
      {content}
    </Card>
  );
}
