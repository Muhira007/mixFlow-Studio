'use client';

import { Card } from '@/components/shared/Card';

type ApiKeyField = {
  id: string;
  label: string;
  placeholder: string;
  hint: string;
};

type Props = {
  title: string;
  icon: string;
  fields: ApiKeyField[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
};

export function ApiKeyInput({ title, icon, fields, values, onChange }: Props) {
  return (
    <Card header={title} icon={icon}>
      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
        {fields.map((f) => (
          <div key={f.id}>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              {f.label}
            </label>
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  values[f.id]
                    ? 'bg-[var(--success)] shadow-[0_0_6px_var(--success)]'
                    : 'bg-[var(--text-muted)]'
                }`}
              />
              <input
                type="password"
                className="flex-1 px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-inherit outline-hidden transition-all"
                placeholder={f.placeholder}
                value={values[f.id] || ''}
                onChange={(e) => onChange(f.id, e.target.value)}
              />
            </div>
            <p className="text-[0.72rem] text-[var(--text-muted)] mt-1">{f.hint}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
