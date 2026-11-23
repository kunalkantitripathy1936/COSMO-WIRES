import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  applyStudioEnvironment,
  createAtmosphereMaterial,
  createFramePacer,
  createHeroPlanetTextures,
} from '../../three/celestialUtils';

interface HeroCelestialCanvasProps {
  isSoftwareGl: boolean;
  animate: boolean;
  pixelRatioCap: number;
  starCount: number;
  enableParallax: boolean;
  onContextFailed: () => void;
}

// Pre-allocated scratch helpers outside render loop (zero GC in tick)
const _dummyObj = new THREE.Object3D();

/**
 * Isolated WebGL Three.js celestial sphere for the COSMO WIRES Hero section:
 * composite exoplanet (albedo + bump + cloud deck + Fresnel atmospheric scattering),
 * multi-band rings, cratered orbiting moon, multi-part deep-space telemetry probe,
 * instanced starfield, pointer/scroll depth damping, and IntersectionObserver pause.
 */
export default function HeroCelestialCanvas({
  isSoftwareGl,
  animate,
  pixelRatioCap,
  starCount,
  enableParallax,
  onContextFailed,
}: HeroCelestialCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const configRef = useRef({ animate, enableParallax, onContextFailed });
  configRef.current = { animate, enableParallax, onContextFailed };
  const syncRenderModeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    syncRenderModeRef.current?.();
  }, [animate]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      configRef.current.onContextFailed();
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const envTex = applyStudioEnvironment(renderer, scene);
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 120);
    camera.position.set(0, 0.22, 9.0);

    // Warm-key / cool-fill / subtle-violet rim lighting rig for sharp astronomical terminator
    const keyLight = new THREE.DirectionalLight(0xfff4e0, 3.1);
    keyLight.position.set(8.2, 4.0, 5.4);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.radius = 2.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 20;
      const d = 4.2;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
    }
    scene.add(keyLight);

    const hemiFill = new THREE.HemisphereLight(0x3b82f6, 0x05070d, 0.35);
    scene.add(hemiFill);

    const rimLight = new THREE.DirectionalLight(0x8b5cf6, 1.85);
    rimLight.position.set(-7.5, -2.0, -4.5);
    scene.add(rimLight);

    // Procedural Textures (100% in-memory, zero external 404s)
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const { albedoMap, bumpMap, roughnessMap, cloudMap, ringMap, moonMap } =
      createHeroPlanetTextures(maxAniso);

    // Root Planet Assembly balanced clearly in the open focal gap between headline and featured card
    const celestialSystem = new THREE.Group();
    celestialSystem.position.set(0.32, 0.08, 0);
    celestialSystem.scale.setScalar(0.92);
    scene.add(celestialSystem);

    const planetTiltGroup = new THREE.Group();
    planetTiltGroup.rotation.z = THREE.MathUtils.degToRad(19.5);
    planetTiltGroup.rotation.x = THREE.MathUtils.degToRad(8.0);
    celestialSystem.add(planetTiltGroup);

    // 1. Primary Planet Surface Sphere with ocean-vs-continent specular roughness variation
    const planetGeo = new THREE.SphereGeometry(1.72, 48, 36);
    const planetMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: albedoMap,
      bumpMap,
      bumpScale: 0.052,
      roughnessMap,
      roughness: 1.0,
      metalness: 0.12,
    });
    const planetMesh = new THREE.Mesh(planetGeo, planetMat);
    planetMesh.castShadow = !isSoftwareGl;
    planetMesh.receiveShadow = !isSoftwareGl;
    planetTiltGroup.add(planetMesh);

    // 2. Dynamic Translucent Cloud Deck
    const cloudGeo = new THREE.SphereGeometry(1.752, 40, 28);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cloudMap,
      transparent: true,
      opacity: 0.62,
      roughness: 0.9,
      metalness: 0.0,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    planetTiltGroup.add(cloudMesh);

    // 3. Dual-Layer Atmospheric Scattering (tight Rayleigh horizon + subtle outer exosphere limb)
    const atmoGeo = new THREE.SphereGeometry(1.86, 40, 28);
    const atmoMat = createAtmosphereMaterial('#60A5FA', '#3B82F6', 0.96, 2.75);
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    planetTiltGroup.add(atmoMesh);

    const exosphereGeo = new THREE.SphereGeometry(2.01, 36, 24);
    const exosphereMat = createAtmosphereMaterial('#60A5FA', '#8B5CF6', 0.48, 4.4);
    const exosphereMesh = new THREE.Mesh(exosphereGeo, exosphereMat);
    planetTiltGroup.add(exosphereMesh);

    // 4. Multi-Band Planetary Ring Disc (radial UV remapping)
    const ringInner = 2.18;
    const ringOuter = 3.22;
    const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 72, 1);
    const posAttr = ringGeo.attributes.position;
    const uvAttr = ringGeo.attributes.uv;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const dist = Math.sqrt(vx * vx + vy * vy);
      const radialT = (dist - ringInner) / (ringOuter - ringInner);
      uvAttr.setXY(i, radialT, 0.5);
    }
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: ringMap,
      transparent: true,
      opacity: 0.78,
      roughness: 0.45,
      metalness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.receiveShadow = !isSoftwareGl;
    planetTiltGroup.add(ringMesh);

    // 5. Fine Metallic Orbital Telemetry Track Ring
    const trackGeo = new THREE.TorusGeometry(3.48, 0.0085, 10, 96);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.85,
      transparent: true,
      opacity: 0.45,
    });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.rotation.x = Math.PI / 2 + 0.14;
    trackMesh.rotation.y = 0.22;
    celestialSystem.add(trackMesh);

    // 6. Orbiting Natural Moon
    const moonOrbitGroup = new THREE.Group();
    moonOrbitGroup.rotation.z = THREE.MathUtils.degToRad(-12);
    celestialSystem.add(moonOrbitGroup);

    const moonGeo = new THREE.SphereGeometry(0.24, 24, 20);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: moonMap,
      roughness: 0.88,
      metalness: 0.04,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.castShadow = !isSoftwareGl;
    moonMesh.receiveShadow = !isSoftwareGl;
    moonOrbitGroup.add(moonMesh);

    // 7. Composite Multi-Part Deep-Space Telemetry Probe (bus + dish + twin solar arrays)
    const probeGroup = new THREE.Group();
    const busGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.12, 8);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.28,
      metalness: 0.88,
    });
    const busMesh = new THREE.Mesh(busGeo, busMat);
    probeGroup.add(busMesh);

    const dishGeo = new THREE.ConeGeometry(0.075, 0.04, 16, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.32,
      metalness: 0.6,
      side: THREE.DoubleSide,
    });
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.position.y = 0.085;
    dishMesh.rotation.x = Math.PI;
    probeGroup.add(dishMesh);

    const panelGeo = new THREE.BoxGeometry(0.28, 0.008, 0.09);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.3,
      roughness: 0.22,
      metalness: 0.72,
    });
    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.x = -0.2;
    probeGroup.add(leftPanel);
    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.x = 0.2;
    probeGroup.add(rightPanel);

    const probeOrbitGroup = new THREE.Group();
    probeOrbitGroup.rotation.x = 0.14;
    probeOrbitGroup.rotation.y = 0.22;
    celestialSystem.add(probeOrbitGroup);
    probeOrbitGroup.add(probeGroup);

    // 8. Instanced Ambient Star & Cosmic Dust Field
    const starGeo = new THREE.OctahedronGeometry(0.022, 0);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
    });
    const starField = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const starColor = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      // Deterministic golden-angle spatial spread across hero frustum
      const seed = (i + 1) * 1.61803398875;
      const sx = ((Math.sin(seed * 12.9898) * 43758.5453) % 1) * 18;
      const sy = ((Math.sin(seed * 78.233) * 24634.6345) % 1) * 11;
      const sz = -2.5 - Math.abs((Math.sin(seed * 37.719) * 15973.13) % 1) * 14;
      const sScale = 0.45 + Math.abs((Math.sin(seed * 53.1) * 9123.7) % 1) * 1.15;
      _dummyObj.position.set(sx, sy, sz);
      _dummyObj.scale.setScalar(sScale);
      _dummyObj.updateMatrix();
      starField.setMatrixAt(i, _dummyObj.matrix);

      // Restrained star temperatures: ice white, electric blue, soft violet
      const tintPick = i % 7;
      if (tintPick === 0) starColor.set('#60A5FA');
      else if (tintPick === 1) starColor.set('#A78BFA');
      else starColor.set('#E2E8F0');
      starField.setColorAt(i, starColor);
    }
    starField.instanceMatrix.needsUpdate = true;
    if (starField.instanceColor) starField.instanceColor.needsUpdate = true;
    starField.computeBoundingSphere();
    scene.add(starField);

    // Pre-warm shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer & Scroll Parallax Targets (exponentially damped in loop)
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerCurrX = 0;
    let pointerCurrY = 0;
    let scrollOffsetTarget = 0;
    let scrollOffsetCurr = 0;

    const handlePointerMove = (e: PointerEvent) => {
      if (!configRef.current.enableParallax) return;
      const normX = e.clientX / Math.max(1, window.innerWidth) - 0.5;
      const normY = e.clientY / Math.max(1, window.innerHeight) - 0.5;
      pointerTargetX = normX;
      pointerTargetY = normY;
    };

    const handleScroll = () => {
      if (!configRef.current.enableParallax) return;
      const ratio = Math.min(1.2, window.scrollY / Math.max(1, window.innerHeight));
      scrollOffsetTarget = ratio;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // ResizeObserver keeps aspect ratio accurate without layout thrash
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      // Shift planet horizontally on narrower tablet screens for clean framing
      celestialSystem.position.x = w >= 1024 ? 0.32 : 0.15;
      if (!configRef.current.animate) {
        renderer.render(scene, camera);
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Pause loop cleanly when Hero is off-screen or browser tab is hidden
    let isVisible = true;
    let isTabVisible = !document.hidden;
    const pacer = createFramePacer(renderer, isSoftwareGl);
    let elapsedSim = 0;
    let lastTimestamp = performance.now();

    const updateRenderStateAttr = (state: 'active' | 'paused' | 'static') => {
      container.setAttribute('data-render-state', state);
    };

    const positionOrbiters = (t: number) => {
      planetMesh.rotation.y = t * 0.078;
      cloudMesh.rotation.y = t * 0.112;
      cloudMesh.rotation.z = Math.sin(t * 0.08) * 0.015;
      ringMesh.rotation.z = t * 0.016;

      // Slight Keplerian elliptical eccentricity on orbiting moon
      const moonAngle = t * 0.24 + 0.9;
      moonMesh.position.set(
        Math.cos(moonAngle) * 3.82,
        Math.sin(moonAngle * 2) * 0.08,
        Math.sin(moonAngle) * 3.62
      );
      moonMesh.rotation.y = moonAngle + Math.PI;

      const probeAngle = -t * 0.31 + 2.4;
      probeGroup.position.set(Math.cos(probeAngle) * 3.48, 0, Math.sin(probeAngle) * 3.48);
      probeGroup.lookAt(celestialSystem.position);

      starField.rotation.y = t * 0.008;
      starField.rotation.x = t * 0.0035;
    };

    const renderFrame = (now: number) => {
      const dt = Math.min(0.1, Math.max(0.001, (now - lastTimestamp) / 1000));
      lastTimestamp = now;
      elapsedSim += dt;

      positionOrbiters(elapsedSim);

      // Refined exponential damping for weighty, liquid-smooth mouse & scroll parallax
      pointerCurrX = THREE.MathUtils.damp(pointerCurrX, pointerTargetX, 2.5, dt);
      pointerCurrY = THREE.MathUtils.damp(pointerCurrY, pointerTargetY, 2.5, dt);
      scrollOffsetCurr = THREE.MathUtils.damp(scrollOffsetCurr, scrollOffsetTarget, 3.8, dt);

      camera.position.x = pointerCurrX * 0.72;
      camera.position.y = 0.25 - pointerCurrY * 0.44 - scrollOffsetCurr * 0.72;
      camera.lookAt(0.35, -scrollOffsetCurr * 0.22, 0);

      celestialSystem.rotation.y = pointerCurrX * 0.18;
      celestialSystem.rotation.x = pointerCurrY * 0.11;

      renderer.render(scene, camera);
    };

    const tick = () => {
      if (!isVisible || !isTabVisible || !configRef.current.animate) {
        updateRenderStateAttr(configRef.current.animate ? 'paused' : 'static');
        return;
      }
      updateRenderStateAttr('active');
      renderFrame(performance.now());
      pacer.schedule(tick);
    };

    const startOrRenderOnce = () => {
      pacer.cancel();
      if (!configRef.current.animate) {
        // Reduced-motion mode: render one refined static frame and stop
        positionOrbiters(2.4);
        camera.lookAt(0.35, 0, 0);
        renderer.render(scene, camera);
        updateRenderStateAttr('static');
        return;
      }
      if (isVisible && isTabVisible) {
        lastTimestamp = performance.now();
        tick();
      } else {
        updateRenderStateAttr('paused');
      }
    };
    syncRenderModeRef.current = startOrRenderOnce;

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = Boolean(entry?.isIntersecting);
        startOrRenderOnce();
      },
      { threshold: 0.02 }
    );
    intersectionObserver.observe(container);

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      startOrRenderOnce();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      pacer.cancel();
      configRef.current.onContextFailed();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    startOrRenderOnce();

    return () => {
      pacer.cancel();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      planetGeo.dispose();
      planetMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      exosphereGeo.dispose();
      exosphereMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      trackGeo.dispose();
      trackMat.dispose();
      moonGeo.dispose();
      moonMat.dispose();
      busGeo.dispose();
      busMat.dispose();
      dishGeo.dispose();
      dishMat.dispose();
      panelGeo.dispose();
      panelMat.dispose();
      starGeo.dispose();
      starMat.dispose();

      albedoMap.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
      cloudMap.dispose();
      ringMap.dispose();
      moonMap.dispose();
      envTex.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isSoftwareGl, pixelRatioCap, starCount]);

  return (
    <div
      ref={mountRef}
      data-testid="hero-3d-canvas"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
