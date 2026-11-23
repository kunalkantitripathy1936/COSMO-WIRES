import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { computeTiltTransform } from '../../utils/motion3dLogic';

const EDITORIAL_EASE = [0.19, 1, 0.22, 1] as const;

/**
 * Ultra-thin electric-blue to violet reading progress indicator pinned along the top edge.
 */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    restDelta: 0.001,
  });

  return (
    <div
      data-testid="scroll-progress-bar"
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent"
    >
      <motion.div
        style={{ scaleX, transformOrigin: '0% 50%' }}
        className="h-full w-full bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#8B5CF6]"
      />
    </div>
  );
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

/**
 * Subtle viewport-triggered upward fade reveal that never blocks interaction and
 * collapses cleanly under prefers-reduced-motion.
 */
export function Reveal({ children, className = '', delay = 0, y = 18 }: RevealProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 'some', margin: '0px 0px -24px 0px' }}
      transition={{ duration: 0.5, delay, ease: EDITORIAL_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerGridProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
}

/**
 * Staggered grid container for news cards, categories, and calendar previews.
 */
export function StaggerGrid({ children, className = '', stagger = 0.055 }: StaggerGridProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 'some', margin: '0px 0px -20px 0px' }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className = '' }: StaggerItemProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: EDITORIAL_EASE },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ParallaxFrameProps {
  children: ReactNode;
  className?: string;
  offsetPx?: number;
}

/**
 * Subtle scroll-linked parallax wrapper for photography frames and astronomical plates.
 * Automatically collapses to static framing under prefers-reduced-motion.
 */
export function ParallaxFrame({
  children,
  className = '',
  offsetPx = 18,
}: ParallaxFrameProps) {
  const prefersReduced = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-offsetPx, offsetPx]);

  if (prefersReduced) {
    return <div className={`relative overflow-hidden ${className}`}>{children}</div>;
  }

  return (
    <div ref={frameRef} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y }} className="h-[112%] w-full -mt-[6%] will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTiltDeg?: number;
  disabled?: boolean;
}

/**
 * Restrained 3D perspective tilt surface for selected showcase cards (Lead story,
 * Hero featured dispatch, Discoveries spotlight). Automatically disabled on touch
 * screens and under prefers-reduced-motion.
 */
export function TiltCard({
  children,
  className = '',
  maxTiltDeg = 4,
  disabled = false,
}: TiltCardProps) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, active: false });
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const enabled = !disabled && !prefersReduced && canHover;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    const res = computeTiltTransform(normX, normY, maxTiltDeg);
    setTilt({ ...res, active: true });
  };

  const handlePointerLeave = () => {
    if (!tilt.active) return;
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, active: false });
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative [perspective:1200px] ${className}`}
    >
      <div
        className="relative h-full w-full transition-transform duration-300 ease-out will-change-transform"
        style={
          enabled
            ? {
                transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(0)`,
                transformStyle: 'preserve-3d',
              }
            : undefined
        }
      >
        {children}
        {enabled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg transition-opacity duration-300"
            style={{
              opacity: tilt.active ? 1 : 0,
              background: `radial-gradient(420px circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(96, 165, 250, 0.12), rgba(139, 92, 246, 0.04) 40%, transparent 72%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

interface OrbitalAccentProps {
  variant?: 'blue' | 'violet';
  position?: 'top-right' | 'bottom-left';
}

/**
 * Quiet, architectural 3D CSS orbital ring accent placed delicately behind section margins
 * to reinforce spatial depth without competing with editorial copy.
 */
export function OrbitalAccent({
  variant = 'blue',
  position = 'top-right',
}: OrbitalAccentProps) {
  const strokeColor = variant === 'violet' ? 'rgba(139, 92, 246, 0.22)' : 'rgba(59, 130, 246, 0.22)';
  const nodeColor = variant === 'violet' ? '#A78BFA' : '#60A5FA';
  const posClasses =
    position === 'top-right'
      ? '-right-24 -top-20'
      : '-left-24 -bottom-20';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${posClasses} h-44 w-44 md:h-72 md:w-72 select-none opacity-45 md:opacity-65`}
    >
      <svg viewBox="0 0 280 280" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id={`orb-glow-${variant}-${position}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={nodeColor} stopOpacity="0.16" />
            <stop offset="100%" stopColor={nodeColor} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="140" cy="140" r="110" fill={`url(#orb-glow-${variant}-${position})`} />
        <g className="origin-center cosmic-orbit-slow">
          <ellipse
            cx="140"
            cy="140"
            rx="118"
            ry="44"
            transform="rotate(-24 140 140)"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1"
            strokeDasharray="4 6"
          />
          <circle cx="244" cy="96" r="3" fill={nodeColor} opacity="0.8" />
        </g>
        <ellipse
          cx="140"
          cy="140"
          rx="86"
          ry="86"
          fill="none"
          stroke="rgba(148, 163, 184, 0.1)"
          strokeWidth="0.75"
        />
      </svg>
    </div>
  );
}

/**
 * Lightweight, GPU-composited deep-space ambient atmosphere exclusively for mobile
 * viewports (< 768px). Provides continuous animated starfield parallax, drifting
 * cosmic dust, and soft blue/violet nebula depth without altering desktop layout.
 */
export function MobileCosmicAtmosphere() {
  const prefersReduced = useReducedMotion();

  return (
    <div
      data-testid="mobile-cosmic-atmosphere"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden md:hidden"
    >
      {/* Distant animated starfield layer */}
      <div
        className={`cosmic-starfield-layer absolute -inset-6 opacity-50 ${
          prefersReduced ? '' : 'cosmic-drift'
        }`}
      />
      {/* Closer counter-drifting cosmic particle layer */}
      <div
        className={`cosmic-starfield-deep absolute -inset-6 opacity-45 ${
          prefersReduced ? '' : 'cosmic-drift-reverse'
        }`}
      />
      {/* Soft blue atmospheric nebula wash (upper atmosphere) */}
      <div
        className={`absolute -top-24 -right-24 h-80 w-80 rounded-full ${
          prefersReduced ? '' : 'cosmic-nebula-breathe'
        }`}
        style={{
          background:
            'radial-gradient(circle, rgba(59, 130, 246, 0.16) 0%, rgba(37, 99, 235, 0.06) 45%, transparent 72%)',
        }}
      />
      {/* Soft violet deep-space glow (lower horizon) */}
      <div
        className={`absolute bottom-[-6rem] -left-24 h-80 w-80 rounded-full ${
          prefersReduced ? '' : 'cosmic-nebula-breathe'
        }`}
        style={{
          animationDelay: '-8s',
          background:
            'radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, rgba(99, 102, 241, 0.05) 45%, transparent 72%)',
        }}
      />
    </div>
  );
}
