import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { probeWebGLCapabilities } from '../../three/celestialUtils';
import {
  RenderProfile,
  SOLAR_SYSTEM_BODIES,
  SolarBodySpec,
  selectRenderQuality,
} from '../../utils/motion3dLogic';

const LazySolarSystemCanvas = lazy(() => import('./SolarSystemCanvas'));

/**
 * Interactive 2D SVG Orbital Map fallback for mobile screens, low-power devices,
 * or browsers without WebGL support — preserves 100% of body selection & orbital telemetry.
 */
function StaticOrreryFallback({
  selectedBodyId,
  onSelectBody,
}: {
  selectedBodyId: SolarBodySpec['id'];
  onSelectBody: (id: SolarBodySpec['id']) => void;
}) {
  return (
    <div
      data-testid="orrery-fallback-svg"
      className="relative flex h-full w-full items-center justify-center bg-[#07090E] p-4"
    >
      <svg
        viewBox="-220 -130 440 260"
        className="h-full max-h-[300px] w-full max-w-[540px]"
        role="img"
        aria-label="Schematic orbital diagram of the Solar System"
      >
        <defs>
          <radialGradient id="sun-fallback-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r="28" fill="url(#sun-fallback-glow)" />

        {SOLAR_SYSTEM_BODIES.map((body) => {
          const rx = body.orbitRadius * 23;
          const ry = body.orbitRadius * 11.2;
          const px = Math.cos(body.initialAngle) * rx;
          const py = Math.sin(body.initialAngle) * ry;
          const isSelected = body.id === selectedBodyId;
          const r = Math.max(4.5, body.visualRadius * 11.5);

          return (
            <g key={body.id}>
              {body.orbitRadius > 0 && (
                <ellipse
                  cx="0"
                  cy="0"
                  rx={rx}
                  ry={ry}
                  fill="none"
                  stroke={isSelected ? 'rgba(96, 165, 250, 0.7)' : 'rgba(51, 65, 85, 0.55)'}
                  strokeWidth={isSelected ? '1.35' : '0.85'}
                />
              )}
              <g
                onClick={() => onSelectBody(body.id)}
                className="cursor-pointer"
              >
                {isSelected && (
                  <circle
                    cx={px}
                    cy={py}
                    r={r + 5}
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="1.2"
                  />
                )}
                {body.hasRings && (
                  <ellipse
                    cx={px}
                    cy={py}
                    rx={r * 2.1}
                    ry={r * 0.65}
                    transform={`rotate(-18 ${px} ${py})`}
                    fill="none"
                    stroke="#E5D3B3"
                    strokeWidth="1.5"
                    opacity="0.75"
                  />
                )}
                <circle cx={px} cy={py} r={r} fill={body.colorHex} />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function SolarSystemOrrery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [contextFailed, setContextFailed] = useState(false);
  const [selectedBodyId, setSelectedBodyId] = useState<SolarBodySpec['id']>('sun');
  const [paused, setPaused] = useState(false);
  const [glInfo, setGlInfo] = useState<{ supported: boolean; isSoftwareGl: boolean } | null>(null);
  const [profile, setProfile] = useState<RenderProfile | null>(null);

  // Lazy-mount the 3D scene only when scrolled near viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: '260px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const gl = probeWebGLCapabilities();
    setGlInfo(gl);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compute = () => {
      const nav = navigator as Navigator & { deviceMemory?: number };
      setProfile(
        selectRenderQuality({
          hasWebGL: gl.supported,
          isSoftwareGl: gl.isSoftwareGl,
          prefersReducedMotion: mediaQuery.matches,
          viewportWidth: window.innerWidth,
          deviceMemory: nav.deviceMemory,
          hardwareConcurrency: navigator.hardwareConcurrency,
        })
      );
    };

    compute();
    window.addEventListener('resize', compute, { passive: true });
    mediaQuery.addEventListener('change', compute);
    return () => {
      window.removeEventListener('resize', compute);
      mediaQuery.removeEventListener('change', compute);
    };
  }, []);

  const selectedBody =
    SOLAR_SYSTEM_BODIES.find((b) => b.id === selectedBodyId) ?? SOLAR_SYSTEM_BODIES[0];
  const useWebGL = Boolean(shouldLoad && profile?.useWebGL && glInfo?.supported && !contextFailed);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-2xl border border-[#1E293B]/90 bg-[#0D121E]/90 shadow-[0_16px_42px_rgba(3,7,18,0.45)]"
    >
      {/* Top Minimal Observatory Header Bar (non-occluding) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] bg-[#090D16] px-5 py-3.5">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#60A5FA]">
            Interactive Orbital Atlas · Heliocentric Reference
          </p>
          <p className="mt-0.5 text-xs text-[#94A3B8]">
            {useWebGL
              ? 'Drag gently to adjust inclination or select a world below to inspect its orbital telemetry.'
              : 'Select any planetary body below to inspect its orbital period and heliocentric distance.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {useWebGL && profile?.animate && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1E293B] bg-[#0D121E] px-3.5 py-1.5 text-xs font-medium text-[#CBD5E1] hover:border-[#3B82F6]/60 hover:text-white transition-colors cursor-pointer"
            >
              {paused ? (
                <>
                  <Play className="h-3.5 w-3.5 text-[#60A5FA]" strokeWidth={1.75} aria-hidden="true" />
                  <span>Resume Orbits</span>
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5 text-[#60A5FA]" strokeWidth={1.75} aria-hidden="true" />
                  <span>Pause Orbits</span>
                </>
              )}
            </button>
          )}
          {selectedBodyId !== 'sun' && (
            <button
              type="button"
              onClick={() => setSelectedBodyId('sun')}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1E293B] bg-[#0D121E] px-3.5 py-1.5 text-xs font-medium text-[#CBD5E1] hover:border-[#3B82F6]/60 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span>Overview</span>
            </button>
          )}
        </div>
      </div>

      {/* Unobstructed 3D Viewport */}
      <div className="relative h-[300px] sm:h-[360px] lg:h-[400px] w-full bg-[#07090E]">
        {useWebGL && glInfo && profile ? (
          <Suspense
            fallback={
              <StaticOrreryFallback
                selectedBodyId={selectedBodyId}
                onSelectBody={setSelectedBodyId}
              />
            }
          >
            <LazySolarSystemCanvas
              selectedBodyId={selectedBodyId}
              paused={paused}
              isSoftwareGl={glInfo.isSoftwareGl}
              animate={profile.animate}
              pixelRatioCap={profile.pixelRatioCap}
              onSelectBody={setSelectedBodyId}
              onContextFailed={() => setContextFailed(true)}
            />
          </Suspense>
        ) : (
          <StaticOrreryFallback
            selectedBodyId={selectedBodyId}
            onSelectBody={setSelectedBodyId}
          />
        )}
      </div>

      {/* Unified Bottom Control Dock & Telemetry Strip (Zero Viewport Occlusion) */}
      <div className="border-t border-[#1E293B] bg-[#090D16] px-5 py-4">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Select Solar System body"
        >
          {SOLAR_SYSTEM_BODIES.map((body) => {
            const active = body.id === selectedBodyId;
            return (
              <button
                key={body.id}
                type="button"
                onClick={() => setSelectedBodyId(body.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'border border-[#1E293B] bg-[#0D121E] text-[#94A3B8] hover:border-[#334155] hover:text-white'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: body.colorHex }}
                />
                <span>{body.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 border-t border-[#1E293B]/80 pt-4 text-xs">
          <div className="md:col-span-3">
            <p className="font-mono text-[11px] text-[#64748B]">Selected Body</p>
            <p className="mt-0.5 font-serif text-lg font-medium text-[#F8FAFC]">
              {selectedBody.name}
            </p>
            <p className="text-[11px] text-[#60A5FA]">{selectedBody.classification}</p>
          </div>

          <div className="md:col-span-3 flex gap-6 md:flex-col md:gap-2">
            <div>
              <p className="font-mono text-[11px] text-[#64748B]">Mean Heliocentric Distance</p>
              <p className="mt-0.5 font-mono text-sm text-[#E2E8F0] tabular-nums">
                {selectedBody.distanceAu}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] text-[#64748B]">Orbital Period</p>
              <p className="mt-0.5 font-mono text-sm text-[#E2E8F0] tabular-nums">
                {selectedBody.orbitalPeriod}
              </p>
            </div>
          </div>

          <div className="md:col-span-6 flex items-center">
            <p className="text-xs sm:text-sm leading-relaxed text-[#CBD5E1]">
              {selectedBody.summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
