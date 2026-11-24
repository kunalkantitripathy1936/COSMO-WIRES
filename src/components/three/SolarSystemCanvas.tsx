import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  applyStudioEnvironment,
  createAtmosphereMaterial,
  createFramePacer,
  createHeroPlanetTextures,
  createSolarBodyTexture,
} from '../../three/celestialUtils';
import {
  SOLAR_SYSTEM_BODIES,
  SolarBodySpec,
  computeOrbitalPosition,
} from '../../utils/motion3dLogic';

interface SolarSystemCanvasProps {
  selectedBodyId: SolarBodySpec['id'];
  paused: boolean;
  isSoftwareGl: boolean;
  animate: boolean;
  pixelRatioCap: number;
  isMobile?: boolean;
  asteroidCount?: number;
  onSelectBody: (id: SolarBodySpec['id']) => void;
  onContextFailed: () => void;
}

const _targetVec = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndcPtr = new THREE.Vector2();

/**
 * Interactive 3D Solar System Orrery canvas.
 * Renders the Sun, inner terrestrial worlds, Earth-Moon system, instanced Main Asteroid Belt,
 * Jupiter, and ringed Saturn with smooth damped focus transitions, click-to-focus raycasting,
 * drag-to-orbit azimuth control (never hijacking scroll), and IntersectionObserver pause.
 */
export default function SolarSystemCanvas({
  selectedBodyId,
  paused,
  isSoftwareGl,
  animate,
  pixelRatioCap,
  isMobile = false,
  asteroidCount = 160,
  onSelectBody,
  onContextFailed,
}: SolarSystemCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    selectedBodyId,
    paused,
    animate,
    onSelectBody,
    onContextFailed,
  });
  stateRef.current = { selectedBodyId, paused, animate, onSelectBody, onContextFailed };

  const triggerSingleRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    triggerSingleRenderRef.current?.();
  }, [selectedBodyId, paused, animate]);

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
      stateRef.current.onContextFailed();
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));
    renderer.setClearColor(0x07090e, 1);

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090e, 0.018);
    const envTex = applyStudioEnvironment(renderer, scene);
    scene.environmentIntensity = 0.28;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 160);
    camera.position.set(0, 7.2, 13.8);
    camera.lookAt(0, 0, 0);

    // Calibrated solar point light + subtle cool deep-space fill for authentic day/night terminators
    const sunPointLight = new THREE.PointLight(0xfff1d6, 15, 75, 1.05);
    sunPointLight.position.set(0, 0, 0);
    scene.add(sunPointLight);

    const hemiFill = new THREE.HemisphereLight(0x3b82f6, 0x05070d, 0.26);
    scene.add(hemiFill);

    const disposables: Array<{ dispose: () => void }> = [];
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const sharedRingTextures = createHeroPlanetTextures(maxAniso);
    disposables.push(
      sharedRingTextures.albedoMap,
      sharedRingTextures.bumpMap,
      sharedRingTextures.roughnessMap,
      sharedRingTextures.cloudMap,
      sharedRingTextures.ringMap,
      sharedRingTextures.moonMap
    );

    const orreryRoot = new THREE.Group();
    scene.add(orreryRoot);

    // Background deep starfield ring
    const starGeo = new THREE.OctahedronGeometry(0.032, 0);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.55,
    });
    const starCount = isMobile ? 110 : isSoftwareGl ? 140 : 240;
    const starMesh = new THREE.InstancedMesh(starGeo, starMat, starCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < starCount; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const radius = 24 + (i % 7) * 2.5;
      dummy.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) * 0.55,
        radius * Math.sin(phi) * Math.sin(theta)
      );
      dummy.scale.setScalar(0.6 + (i % 4) * 0.3);
      dummy.updateMatrix();
      starMesh.setMatrixAt(i, dummy.matrix);
    }
    starMesh.instanceMatrix.needsUpdate = true;
    starMesh.computeBoundingSphere();
    scene.add(starMesh);
    disposables.push(starGeo, starMat);

    // Procedural Main Asteroid Belt between Mars (4.4) and Jupiter (6.2) in 1 single draw call
    const effectiveAsteroidCount = Math.max(48, Math.min(180, asteroidCount));
    const asteroidGeo = new THREE.DodecahedronGeometry(0.036, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.92,
      metalness: 0.14,
    });
    const asteroidBelt = new THREE.InstancedMesh(asteroidGeo, asteroidMat, effectiveAsteroidCount);
    const astColor = new THREE.Color();
    for (let i = 0; i < effectiveAsteroidCount; i++) {
      const seed = (i + 1) * 1.61803398875;
      const angle = (i / effectiveAsteroidCount) * Math.PI * 2 + Math.sin(seed * 9.3) * 0.18;
      const radius = 5.05 + ((Math.sin(seed * 31.7) * 0.5 + 0.5) * 0.72);
      const yOff = Math.sin(seed * 17.4) * 0.24;
      dummy.position.set(Math.cos(angle) * radius, yOff, Math.sin(angle) * radius);
      dummy.rotation.set(seed * 2.1, seed * 3.7, seed * 1.4);
      dummy.scale.set(
        0.7 + ((i * 13) % 10) * 0.08,
        0.55 + ((i * 7) % 10) * 0.07,
        0.65 + ((i * 19) % 10) * 0.08
      );
      dummy.updateMatrix();
      asteroidBelt.setMatrixAt(i, dummy.matrix);
      astColor.setHSL(0.6, 0.12, 0.42 + ((i * 11) % 10) * 0.03);
      asteroidBelt.setColorAt(i, astColor);
    }
    asteroidBelt.instanceMatrix.needsUpdate = true;
    if (asteroidBelt.instanceColor) asteroidBelt.instanceColor.needsUpdate = true;
    asteroidBelt.computeBoundingSphere();
    orreryRoot.add(asteroidBelt);
    disposables.push(asteroidGeo, asteroidMat);

    // Construct planetary bodies & elliptical orbit lines
    const clickableMeshes: THREE.Object3D[] = [];
    const bodyNodes = new Map<
      SolarBodySpec['id'],
      {
        spec: SolarBodySpec;
        group: THREE.Group;
        spinMesh: THREE.Mesh;
        moonPivot?: THREE.Group;
      }
    >();

    SOLAR_SYSTEM_BODIES.forEach((spec, index) => {
      const bodyGroup = new THREE.Group();
      orreryRoot.add(bodyGroup);

      // Orbit path ellipse
      if (spec.orbitRadius > 0) {
        const orbitPts: THREE.Vector3[] = [];
        const segs = 96;
        for (let s = 0; s <= segs; s++) {
          const angle = (s / segs) * Math.PI * 2;
          const pos = computeOrbitalPosition(spec.orbitRadius, angle, spec.inclinationDeg);
          orbitPts.push(new THREE.Vector3(pos.x, pos.y, pos.z));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
        const orbitMat = new THREE.LineBasicMaterial({
          color: spec.id === 'earth' ? 0x3b82f6 : 0x334155,
          transparent: true,
          opacity: spec.id === 'earth' ? 0.55 : 0.4,
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        orreryRoot.add(orbitLine);
        disposables.push(orbitGeo, orbitMat);
      }

      const sphereGeo = new THREE.SphereGeometry(
        spec.visualRadius,
        isMobile ? 20 : 28,
        isMobile ? 16 : 22
      );
      disposables.push(sphereGeo);

      let spinMesh: THREE.Mesh;
      if (spec.id === 'sun') {
        const sunTex = createSolarBodyTexture('#F59E0B', '#FDE68A', 11);
        const sunMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: sunTex,
        });
        spinMesh = new THREE.Mesh(sphereGeo, sunMat);
        bodyGroup.add(spinMesh);

        // Coronal Fresnel aura shell
        const coronaGeo = new THREE.SphereGeometry(spec.visualRadius * 1.28, 28, 20);
        const coronaMat = createAtmosphereMaterial('#F59E0B', '#FDE68A', 0.9);
        const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
        bodyGroup.add(coronaMesh);
        disposables.push(sunTex, sunMat, coronaGeo, coronaMat);
      } else {
        const planetTex = createSolarBodyTexture(spec.colorHex, spec.accentHex, index * 7 + 3);
        const planetMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: planetTex,
          roughness: spec.id === 'jupiter' || spec.id === 'saturn' ? 0.65 : 0.78,
          metalness: 0.08,
        });
        spinMesh = new THREE.Mesh(sphereGeo, planetMat);
        spinMesh.rotation.z = THREE.MathUtils.degToRad(spec.axialTiltDeg);
        bodyGroup.add(spinMesh);
        disposables.push(planetTex, planetMat);

        if (spec.id === 'earth') {
          const earthAtmoGeo = new THREE.SphereGeometry(spec.visualRadius * 1.14, 24, 18);
          const earthAtmoMat = createAtmosphereMaterial('#3B82F6', '#93C5FD', 0.7);
          bodyGroup.add(new THREE.Mesh(earthAtmoGeo, earthAtmoMat));
          disposables.push(earthAtmoGeo, earthAtmoMat);
        }

        if (spec.hasRings) {
          const innerR = spec.visualRadius * 1.38;
          const outerR = spec.visualRadius * 2.35;
          const satRingGeo = new THREE.RingGeometry(innerR, outerR, 56, 1);
          const posAttr = satRingGeo.attributes.position;
          const uvAttr = satRingGeo.attributes.uv;
          for (let i = 0; i < posAttr.count; i++) {
            const vx = posAttr.getX(i);
            const vy = posAttr.getY(i);
            const dist = Math.sqrt(vx * vx + vy * vy);
            uvAttr.setXY(i, (dist - innerR) / (outerR - innerR), 0.5);
          }
          const satRingMat = new THREE.MeshStandardMaterial({
            color: 0xf1dfc3,
            map: sharedRingTextures.ringMap,
            transparent: true,
            opacity: 0.82,
            roughness: 0.5,
            metalness: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const satRingMesh = new THREE.Mesh(satRingGeo, satRingMat);
          satRingMesh.rotation.x = Math.PI / 2;
          satRingMesh.rotation.y = THREE.MathUtils.degToRad(24);
          bodyGroup.add(satRingMesh);
          disposables.push(satRingGeo, satRingMat);
        }
      }

      let moonPivot: THREE.Group | undefined;
      if (spec.hasMoon) {
        moonPivot = new THREE.Group();
        const mGeo = new THREE.SphereGeometry(0.068, 14, 12);
        const mMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          roughness: 0.9,
          metalness: 0.04,
        });
        const mMesh = new THREE.Mesh(mGeo, mMat);
        mMesh.position.set(0.55, 0.04, 0);
        moonPivot.add(mMesh);
        bodyGroup.add(moonPivot);
        disposables.push(mGeo, mMat);
      }

      spinMesh.userData.bodyId = spec.id;
      clickableMeshes.push(spinMesh);
      bodyNodes.set(spec.id, { spec, group: bodyGroup, spinMesh, moonPivot });
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Gentle pointer drag to inspect orbital inclination + direct click-to-focus on planets
    // Touch gestures yield immediately to native vertical scrolling when vertical intent dominates.
    let isDragging = false;
    let dragPointerType: string = 'mouse';
    let touchAxisLocked: 'none' | 'horizontal' = 'none';
    let pointerDownX = 0;
    let pointerDownY = 0;
    let lastPtrX = 0;
    let lastPtrY = 0;
    let viewportAspect = width / Math.max(1, height);
    let userAzimuthTarget = 0.25;
    let userElevationTarget = viewportAspect < 1.35 ? 0.52 : 0.42;
    let userAzimuthCurr = 0.25;
    let userElevationCurr = userElevationTarget;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragPointerType = e.pointerType || 'mouse';
      touchAxisLocked = 'none';
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      if (dragPointerType === 'touch' && touchAxisLocked === 'none') {
        const totalDx = Math.abs(e.clientX - pointerDownX);
        const totalDy = Math.abs(e.clientY - pointerDownY);
        if (totalDx + totalDy < 6) return;
        if (totalDy > totalDx) {
          // Vertical scroll intent: release drag immediately so page scrolls naturally
          isDragging = false;
          return;
        }
        touchAxisLocked = 'horizontal';
      }
      const dx = e.clientX - lastPtrX;
      const dy = e.clientY - lastPtrY;
      lastPtrX = e.clientX;
      lastPtrY = e.clientY;
      userAzimuthTarget -= dx * 0.006;
      if (dragPointerType !== 'touch') {
        userElevationTarget = THREE.MathUtils.clamp(userElevationTarget + dy * 0.004, 0.14, 1.05);
      }
      if (!stateRef.current.animate || stateRef.current.paused) {
        renderSingleFrame();
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (isDragging) {
        const travel = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
        if (travel < 8) {
          const rect = renderer.domElement.getBoundingClientRect();
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            _ndcPtr.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            _ndcPtr.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            _raycaster.setFromCamera(_ndcPtr, camera);
            const hits = _raycaster.intersectObjects(clickableMeshes, false);
            const hitBodyId = hits[0]?.object?.userData?.bodyId as SolarBodySpec['id'] | undefined;
            if (hitBodyId) {
              stateRef.current.onSelectBody(hitBodyId);
            }
          }
        }
      }
      isDragging = false;
      touchAxisLocked = 'none';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 320);
      viewportAspect = w / h;
      camera.aspect = viewportAspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderSingleFrame();
    });
    resizeObserver.observe(container);

    let simTime = 0;
    let lastTs = performance.now();
    let isVisible = true;
    let isTabVisible = !document.hidden;
    const pacer = createFramePacer(renderer, isSoftwareGl);

    const currentLookTarget = new THREE.Vector3(0, 0, 0);

    const updateOrbits = (t: number) => {
      asteroidBelt.rotation.y = t * 0.045;
      bodyNodes.forEach(({ spec, group, spinMesh, moonPivot }) => {
        const angle = spec.initialAngle + t * spec.orbitalSpeed;
        const pos = computeOrbitalPosition(spec.orbitRadius, angle, spec.inclinationDeg);
        group.position.set(pos.x, pos.y, pos.z);
        spinMesh.rotation.y = t * (spec.id === 'sun' ? 0.14 : 0.45);
        if (moonPivot) {
          moonPivot.rotation.y = t * 1.45;
        }
      });
    };

    const updateCamera = (dt: number) => {
      userAzimuthCurr = THREE.MathUtils.damp(userAzimuthCurr, userAzimuthTarget, 5.0, dt);
      userElevationCurr = THREE.MathUtils.damp(userElevationCurr, userElevationTarget, 5.0, dt);

      const focused = bodyNodes.get(stateRef.current.selectedBodyId);
      if (focused && focused.spec.id !== 'sun') {
        _targetVec.copy(focused.group.position);
        const focusScale = viewportAspect < 1.3 ? 1.18 : 1;
        const focusDist = Math.max(2.6, focused.spec.visualRadius * 6.8) * focusScale;
        _camGoal.set(
          _targetVec.x + Math.sin(userAzimuthCurr) * focusDist * Math.cos(userElevationCurr),
          _targetVec.y + Math.sin(userElevationCurr) * focusDist + 0.55,
          _targetVec.z + Math.cos(userAzimuthCurr) * focusDist * Math.cos(userElevationCurr)
        );
      } else {
        _targetVec.set(0, 0, 0);
        // Desktop wide aspect keeps exact 15.2 overview distance; narrower mobile frames pull back cleanly
        const overviewDist =
          viewportAspect < 1.35
            ? THREE.MathUtils.clamp(15.2 * (1.42 / Math.max(0.85, viewportAspect)), 15.8, 22.8)
            : 15.2;
        _camGoal.set(
          Math.sin(userAzimuthCurr) * overviewDist * Math.cos(userElevationCurr),
          Math.sin(userElevationCurr) * overviewDist,
          Math.cos(userAzimuthCurr) * overviewDist * Math.cos(userElevationCurr)
        );
      }

      const lambda = dt > 0.2 ? 12 : 4.2;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, lambda, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, lambda, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, lambda, dt);

      currentLookTarget.x = THREE.MathUtils.damp(currentLookTarget.x, _targetVec.x, lambda, dt);
      currentLookTarget.y = THREE.MathUtils.damp(currentLookTarget.y, _targetVec.y, lambda, dt);
      currentLookTarget.z = THREE.MathUtils.damp(currentLookTarget.z, _targetVec.z, lambda, dt);
      camera.lookAt(currentLookTarget);
    };

    const renderSingleFrame = () => {
      updateOrbits(simTime);
      updateCamera(0.35);
      renderer.render(scene, camera);
    };
    triggerSingleRenderRef.current = () => {
      if (!isVisible || !isTabVisible) return;
      if (!stateRef.current.animate || stateRef.current.paused) {
        renderSingleFrame();
      } else {
        startLoop();
      }
    };

    const tick = () => {
      if (!isVisible || !isTabVisible || !stateRef.current.animate) {
        container.setAttribute('data-render-state', stateRef.current.animate ? 'paused' : 'static');
        return;
      }

      const now = performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      if (!stateRef.current.paused) {
        simTime += dt;
      }

      updateOrbits(simTime);
      updateCamera(dt);
      renderer.render(scene, camera);
      container.setAttribute('data-render-state', stateRef.current.paused ? 'paused' : 'active');
      pacer.schedule(tick);
    };

    const startLoop = () => {
      pacer.cancel();
      if (!stateRef.current.animate) {
        updateOrbits(simTime);
        updateCamera(1.0);
        renderer.render(scene, camera);
        container.setAttribute('data-render-state', 'static');
        return;
      }
      if (isVisible && isTabVisible) {
        lastTs = performance.now();
        tick();
      } else {
        container.setAttribute('data-render-state', 'paused');
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        isVisible = Boolean(entries[0]?.isIntersecting);
        startLoop();
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    const onVisChange = () => {
      isTabVisible = !document.hidden;
      startLoop();
    };
    document.addEventListener('visibilitychange', onVisChange);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      pacer.cancel();
      stateRef.current.onContextFailed();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

    startLoop();

    return () => {
      pacer.cancel();
      io.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisChange);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      disposables.forEach((d) => d.dispose());
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isSoftwareGl, pixelRatioCap, isMobile, asteroidCount]);

  return (
    <div
      ref={mountRef}
      data-testid="orrery-3d-canvas"
      className="h-full w-full cursor-grab active:cursor-grabbing touch-pan-y"
    />
  );
}
