'use client';

import { useApp } from '@/contexts/AppContext';
import { PIPELINE_STEPS } from '@/lib/constants';
import { Card } from '@/components/shared/Card';

export function ProgressPipeline() {
  const { state } = useApp();
  const stepIndex = state.pipelineStep === 'idle' ? -1 : state.pipelineStep === 'done' ? PIPELINE_STEPS.length : PIPELINE_STEPS.findIndex((s) => s.id === state.pipelineStep);

  return (
    <Card header="🔄 Progress Pipeline" icon="🔄">
      <div className="flex items-start gap-0 my-4 flex-nowrap">
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.id} className="flex items-start gap-0 flex-1 min-w-0">
            {/* Step */}
            <div className="flex-1 text-center min-w-0">
              <div
                className={`w-8 h-8 max-md:w-7 max-md:h-7 max-[400px]:w-6 max-[400px]:h-6 rounded-full border-2 flex items-center justify-center mx-auto mb-1.5 text-xs transition-all shrink-0 ${
                  i < stepIndex
                    ? 'bg-[var(--success)] border-[var(--success)] text-white'
                    : i === stepIndex
                    ? 'bg-[var(--accent)] border-[var(--accent)] shadow-[0_0_14px_var(--accent-glow)]'
                    : 'bg-[var(--bg-card)] border-[var(--border)]'
                }`}
              >
                {i < stepIndex ? '✓' : step.icon}
              </div>
              <span
                className={`text-[0.65rem] font-medium leading-tight ${
                  i < stepIndex
                    ? 'text-[var(--success)]'
                    : i === stepIndex
                    ? 'text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {i < PIPELINE_STEPS.length - 1 && (
              <div
                className={`flex-[0_0_24px] max-md:flex-[0_0_12px] max-[400px]:flex-[0_0_8px] h-0.5 self-center mb-5 min-w-[6px] ${
                  i < stepIndex
                    ? 'bg-[var(--success)]'
                    : i === stepIndex
                    ? 'bg-[var(--accent)]'
                    : 'bg-[var(--border)]'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
