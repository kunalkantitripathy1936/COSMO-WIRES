import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
  id?: string;
  kicker: string;
  title: string;
  accent?: 'blue' | 'violet';
  actionLabel?: string;
  onAction?: () => void;
  rightSlot?: React.ReactNode;
}

export function SectionHeader({
  id,
  kicker,
  title,
  accent = 'blue',
  actionLabel,
  onAction,
  rightSlot,
}: SectionHeaderProps) {
  const accentColor = accent === 'violet' ? 'text-[#A78BFA]' : 'text-[#60A5FA]';
  const actionHover =
    accent === 'violet'
      ? 'text-[#A78BFA] hover:text-[#C4B5FD]'
      : 'text-[#60A5FA] hover:text-[#93C5FD]';

  return (
    <div className="flex flex-col gap-4 border-b border-[#1E293B] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={`text-xs font-mono tracking-wider ${accentColor}`}>{kicker}</p>
        <h2
          id={id}
          className="mt-2 font-serif text-3xl lg:text-4xl font-medium text-[#F1F5F9]"
        >
          {title}
        </h2>
      </div>

      {rightSlot ? (
        <div className="shrink-0">{rightSlot}</div>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={`group inline-flex items-center gap-2 rounded-full border border-[#1E293B] bg-[#0D121E]/85 pl-4 pr-1.5 py-1.5 text-sm font-medium transition-all duration-200 hover:border-[#3B82F6]/45 hover:bg-[#121A2B] whitespace-nowrap self-start sm:self-auto cursor-pointer ${actionHover}`}
        >
          <span>{actionLabel}</span>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#121A2B] border border-[#1E293B] transition-transform duration-200 group-hover:translate-x-0.5">
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          </span>
        </button>
      ) : null}
    </div>
  );
}
