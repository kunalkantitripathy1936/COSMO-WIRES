import { Suspense, lazy, useEffect, useState } from 'react';
import { probeWebGLCapabilities } from '../../three/webglProbe';
import { RenderProfile, selectRenderQuality } from '../../utils/motion3dLogic';

const LazyHeroCelestialCanvas = lazy(() => import('./HeroCelestialCanvas'));

/**
 * Lightweight, zero-WebGL atmospheric celestial fallback rendered on mobile devices,
 * low-power hardware, or browsers without WebGL support.
 */
function StaticCelestialFallback({ animate }: { animate: boolean }) {
  return (
    <div
      data-testid="hero-3d-fallback"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Subtle drifting star flecks */}
      <div className={`cosmic-starfield-layer absolute inset-0 ${animate ? 'cosmic-drift' : ''}`} />

      {/* Atmospheric celestial sphere silhouette with tilted orbital rings */}
      <div className="absolute right-[-14%] top-1/2 -translate-y-1/2 h-[340px] w-[340px] sm:h-[420px] sm:w-[420px] opacity-55">
        <div
          className="absolute inset-8 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 32% 32%, #60A5FA 0%, #1E3A8A 36%, #0D121E 74%, #07090E 100%)',
            boxShadow:
              '0 0 64px rgba(59, 130, 246, 0.25), inset -28px -24px 48px rgba(7, 9, 14, 0.92), inset 10px 8px 24px rgba(139, 92, 246, 0.24)',
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
            stroke="rgba(96, 165, 250, 0.36)"
            strokeWidth="1.4"
          />
          <ellipse
            cx="200"
            cy="200"
            rx="168"
            ry="44"
            transform="rotate(-18 200 200)"
            fill="none"
            stroke="rgba(139, 92, 246, 0.26)"
            strokeWidth="1"
            strokeDasharray="6 6"
          />
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
    <Suspense fallback={<StaticCelestialFallback animate={false} />}>
      <LazyHeroCelestialCanvas
        isSoftwareGl={glInfo.isSoftwareGl}
        animate={profile.animate}
        pixelRatioCap={profile.pixelRatioCap}
        starCount={profile.starCount}
        enableParallax={profile.enableParallax}
        onContextFailed={() => setContextFailed(true)}
      />
    </Suspense>
  );
}
