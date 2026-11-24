import { Suspense, lazy, useEffect, useState } from 'react';
import { probeWebGLCapabilities } from '../../three/webglProbe';
import { RenderProfile, selectRenderQuality } from '../../utils/motion3dLogic';

const LazyHeroCelestialCanvas = lazy(() => import('./HeroCelestialCanvas'));

/**
 * Lightweight, zero-WebGL atmospheric celestial fallback rendered on ultra-low-power
 * hardware, browsers without WebGL support, or briefly while the 3D bundle initializes.
 */
function StaticCelestialFallback({ animate }: { animate: boolean }) {
  return (
    <div
      data-testid="hero-3d-fallback"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Layered drifting starfield */}
      <div className={`cosmic-starfield-layer absolute -inset-4 ${animate ? 'cosmic-drift' : ''}`} />
      <div
        className={`cosmic-starfield-deep absolute -inset-4 ${
          animate ? 'cosmic-drift-reverse' : ''
        }`}
      />

      {/* Soft blue/violet nebula atmospheric wash */}
      <div
        className={`absolute right-[-12%] top-[4%] sm:top-[10%] h-[300px] w-[300px] sm:h-[420px] sm:w-[420px] rounded-full ${
          animate ? 'cosmic-nebula-breathe' : ''
        }`}
        style={{
          background:
            'radial-gradient(circle, rgba(59, 130, 246, 0.24) 0%, rgba(139, 92, 246, 0.14) 44%, transparent 74%)',
        }}
      />

      {/* Atmospheric celestial sphere silhouette with tilted orbital rings & orbiting node */}
      <div className="absolute right-[-10%] top-[6%] sm:right-[-8%] sm:top-1/2 sm:-translate-y-1/2 h-[290px] w-[290px] sm:h-[420px] sm:w-[420px] opacity-80 sm:opacity-65">
        <div
          className="absolute inset-8 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, #93C5FD 0%, #2563EB 26%, #1E3A8A 48%, #0D121E 78%, #07090E 100%)',
            boxShadow:
              '0 0 68px rgba(59, 130, 246, 0.34), inset -28px -24px 48px rgba(7, 9, 14, 0.92), inset 10px 8px 26px rgba(139, 92, 246, 0.32)',
          }}
        />
        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full overflow-visible">
          <ellipse
            cx="200"
            cy="200"
            rx="192"
            ry="54"
            transform="rotate(-18 200 200)"
            fill="none"
            stroke="rgba(96, 165, 250, 0.44)"
            strokeWidth="1.5"
          />
          <ellipse
            cx="200"
            cy="200"
            rx="168"
            ry="44"
            transform="rotate(-18 200 200)"
            fill="none"
            stroke="rgba(139, 92, 246, 0.34)"
            strokeWidth="1.1"
            strokeDasharray="6 6"
          />
          <g className={animate ? 'origin-center cosmic-orbit-slow' : 'origin-center'}>
            <circle cx="364" cy="144" r="5" fill="#CBD5E1" opacity="0.92" />
            <circle cx="364" cy="144" r="10" fill="rgba(96, 165, 250, 0.25)" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export function HeroCelestialBackdrop() {
  const [contextFailed, setContextFailed] = useState(false);
  const [glInfo, setGlInfo] = useState<{ supported: boolean; isSoftwareGl: boolean } | null>(null);
  const [profile, setProfile] = useState<RenderProfile | null>(null);

  useEffect(() => {
    const gl = probeWebGLCapabilities();
    setGlInfo(gl);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const computeProfile = () => {
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

    computeProfile();
    window.addEventListener('resize', computeProfile, { passive: true });
    mediaQuery.addEventListener('change', computeProfile);
    return () => {
      window.removeEventListener('resize', computeProfile);
      mediaQuery.removeEventListener('change', computeProfile);
    };
  }, []);

  if (!profile || !glInfo || contextFailed || !profile.useWebGL) {
    return <StaticCelestialFallback animate={profile?.animate ?? false} />;
  }

  return (
    <Suspense fallback={<StaticCelestialFallback animate={profile.animate} />}>
      <LazyHeroCelestialCanvas
        isSoftwareGl={glInfo.isSoftwareGl}
        animate={profile.animate}
        pixelRatioCap={profile.pixelRatioCap}
        starCount={profile.starCount}
        enableParallax={profile.enableParallax}
        shadowsEnabled={profile.shadowsEnabled}
        geometryDetail={profile.geometryDetail}
        onContextFailed={() => setContextFailed(true)}
      />
    </Suspense>
  );
}
