import { cn } from '@/lib/utils';

type CardProps = {
  header?: string;
  icon?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export function Card({ header, icon, className, style, children }: CardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-[18px] mb-4 transition-all duration-200',
        className
      )}
      style={style}
    >
      {header && (
        <div className="flex items-center gap-2 text-sm font-semibold mb-3.5 leading-tight">
          {icon && <span className="text-lg shrink-0">{icon}</span>}
          {header}
        </div>
      )}
      {children}
    </div>
  );
}
