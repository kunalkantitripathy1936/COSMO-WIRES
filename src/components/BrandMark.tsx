import { BRAND } from '../config/brand';

interface BrandMarkProps {
  size?: 'sm' | 'md';
  showName?: boolean;
}

/**
 * Refined COSMO WIRES celestial emblem featuring a circular orbital housing,
 * electric-blue meridian arc, subtle violet planetary ring, and luminous core.
 */
export function BrandMark({ size = 'md', showName = true }: BrandMarkProps) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';
  const svgDim = size === 'sm' ? 22 : 24;
  const textClass =
    size === 'sm'
      ? 'font-serif text-base font-semibold tracking-[0.06em]'
      : 'font-serif text-base xl:text-[17px] font-semibold tracking-[0.06em]';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <span
        className={`relative inline-flex ${dim} items-center justify-center rounded-full border border-[#3B82F6]/35 bg-gradient-to-br from-[#13203A] via-[#0D1426] to-[#1A1336] shadow-[0_0_18px_rgba(59,130,246,0.18)] shrink-0`}
        aria-hidden="true"
      >
        <svg width={svgDim} height={svgDim} viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient id="cw-ring-grad" x1="4" y1="24" x2="28" y2="8" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>
            <radialGradient id="cw-core-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="65%" stopColor="#93C5FD" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="16" cy="16" r="10.5" stroke="#3B82F6" strokeOpacity="0.45" strokeWidth="1.25" />
          <ellipse
            cx="16"
            cy="16"
            rx="13"
            ry="4.7"
            transform="rotate(-28 16 16)"
            stroke="url(#cw-ring-grad)"
            strokeWidth="1.5"
          />
          <circle cx="16" cy="16" r="5" fill="url(#cw-core-grad)" />
          <circle cx="16" cy="16" r="2.4" fill="#F8FAFC" />
          <circle cx="24.8" cy="10.8" r="1.5" fill="#A78BFA" />
        </svg>
      </span>
      {showName && <span className={textClass}>{BRAND.name}</span>}
    </span>
  );
}
