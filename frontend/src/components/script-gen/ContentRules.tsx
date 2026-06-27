import { Card } from '@/components/shared/Card';
import { CONTENT_RULES_FORBIDDEN, CONTENT_RULES_ALLOWED } from '@/lib/constants';

export function ContentRules() {
  return (
    <Card
      header="Aturan Konten (otomatis di system prompt)"
      icon="⚠️"
      className="border-l-[3px] border-l-[var(--warning)]"
    >
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {CONTENT_RULES_FORBIDDEN.map((rule) => (
          <div key={rule} className="text-[var(--danger)]">{rule}</div>
        ))}
        {CONTENT_RULES_ALLOWED.map((rule) => (
          <div key={rule} className="text-[var(--success)]">{rule}</div>
        ))}
      </div>
    </Card>
  );
}
