import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface WebGLProbeResult {
  supported: boolean;
  isSoftwareGl: boolean;
}

let cachedProbe: WebGLProbeResult | null = null;

/**
 * Probes WebGL2/WebGL support and detects software WebGL renderers via the GPU renderer string
 * (never UA sniffing), freeing the probe context immediately.
 */
export function probeWebGLCapabilities(): WebGLProbeResult {
  if (cachedProbe) return cachedProbe;
  if (typeof document === 'undefined') {
    return { supported: false, isSoftwareGl: true };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) {
      cachedProbe = { supported: false, isSoftwareGl: true };
      return cachedProbe;
    }

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const rendererStr = String(gl.getParameter(param) || '');
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);

    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedProbe = { supported: true, isSoftwareGl };
    return cachedProbe;
  } catch {
    cachedProbe = { supported: false, isSoftwareGl: true };
    return cachedProbe;
  }
}

/**
 * Creates a procedural RoomEnvironment reflection map on every device so metallic rings,
 * probes, and atmospheric rims receive physically grounded specular light.
 */
export function applyStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmremGenerator.dispose();
  return envTex;
}

/**
 * Software-WebGL-safe frame pacing using WebGL2 fenceSync so headless/software rendering
 * finishes each draw before waiting 80ms and never starves the main thread.
 */
export function createFramePacer(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): {
  schedule: (cb: () => void) => void;
  cancel: () => void;
} {
  let rafId = 0;
  let timerId = 0;
  let active = true;

  const cancel = () => {
    active = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = 0;
    }
  };

  const schedule = (cb: () => void) => {
    active = true;
    if (!isSoftwareGl) {
      rafId = requestAnimationFrame(() => {
        if (active) cb();
      });
      return;
    }

    const gl = renderer.getContext();
    if ('fenceSync' in gl && typeof gl.fenceSync === 'function') {
      const gl2 = gl as WebGL2RenderingContext;
      const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl2.flush();
      const poll = () => {
        if (!active) {
          if (sync) gl2.deleteSync(sync);
          return;
        }
        const status = sync ? gl2.getSyncParameter(sync, gl2.SYNC_STATUS) : gl2.SIGNALED;
        if (status === gl2.UNSIGNALED) {
          timerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl2.deleteSync(sync);
          timerId = window.setTimeout(() => {
            if (active) cb();
          }, 80);
        }
      };
      timerId = window.setTimeout(poll, 5);
    } else {
      timerId = window.setTimeout(() => {
        if (active) cb();
      }, 90);
    }
  };

  return { schedule, cancel };
}

/**
 * Deterministic pseudo-noise helper for procedural planetary terrain and cloud layers.
 */
function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2d(ix, iy);
  const b = hash2d(ix + 1, iy);
  const c = hash2d(ix, iy + 1);
  const d = hash2d(ix + 1, iy + 1);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves = 4): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return value;
}

/**
 * Generates procedural equirectangular albedo, bump, roughness, and cloud textures for the
 * hero celestial exoplanet — zero external file requests, calibrated to COSMO WIRES palette.
 */
export function createHeroPlanetTextures(maxAnisotropy: number): {
  albedoMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  cloudMap: THREE.CanvasTexture;
  ringMap: THREE.CanvasTexture;
  moonMap: THREE.CanvasTexture;
} {
  const width = 512;
  const height = 256;

  // 1. Planet Albedo, Bump & Physically-Calibrated Roughness Maps (Ocean Glint vs Matte Land)
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(width, height);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;
  const bImg = bCtx.createImageData(width, height);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rghCtx = roughCanvas.getContext('2d')!;
  const rghImg = rghCtx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI; // -pi/2 .. pi/2
    const poleFactor = Math.pow(Math.abs(Math.sin(lat)), 4.2);

    for (let x = 0; x < width; x++) {
      const u = x / width;
      const angle = u * Math.PI * 2;
      // Seamless longitude sampling via cylindrical projection into noise domain
      const nx = Math.cos(angle) * 2.2 + 4.1;
      const nz = Math.sin(angle) * 2.2 + 4.1;
      const ny = v * 4.6;

      const base = fbm(nx + ny * 0.25, nz + ny * 1.15, 4);
      const ridge = fbm(nx * 2.4 - 1.3, nz * 2.4 + ny * 2.1, 3);
      const band = Math.sin(v * Math.PI * 9 + base * 2.8) * 0.5 + 0.5;
      const elevation = base * 0.62 + ridge * 0.26 + band * 0.12;

      // Deep oceanic sapphire -> continental slate-indigo -> luminous polar ice frost
      let r: number;
      let g: number;
      let b: number;

      if (elevation < 0.48) {
        const t = elevation / 0.48;
        r = 11 + t * 18;
        g = 24 + t * 44;
        b = 58 + t * 76;
      } else if (elevation < 0.68) {
        const t = (elevation - 0.48) / 0.2;
        r = 32 + t * 48;
        g = 62 + t * 56;
        b = 116 + t * 62;
      } else {
        const t = (elevation - 0.68) / 0.32;
        r = 82 + t * 72;
        g = 118 + t * 64;
        b = 176 + t * 54;
      }

      // Subtle violet mineral streaks along mid-latitude ridges
      const violetTint = Math.max(0, ridge - 0.58) * 1.4;
      r += violetTint * 48;
      g += violetTint * 14;
      b += violetTint * 66;

      // Polar frost caps
      r = r * (1 - poleFactor * 0.72) + 216 * (poleFactor * 0.72);
      g = g * (1 - poleFactor * 0.72) + 230 * (poleFactor * 0.72);
      b = b * (1 - poleFactor * 0.72) + 248 * (poleFactor * 0.72);

      const idx = (y * width + x) * 4;
      aImg.data[idx] = Math.min(255, Math.max(0, Math.round(r)));
      aImg.data[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
      aImg.data[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
      aImg.data[idx + 3] = 255;

      const bumpVal = Math.min(255, Math.max(0, Math.round(elevation * 255)));
      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;

      // Specular oceans (~0.34 roughness) vs matte continental ridges & polar ice (~0.84-0.92)
      const isOcean = elevation < 0.48 && poleFactor < 0.32;
      const roughFloat = isOcean ? 0.34 + elevation * 0.16 : 0.82 + poleFactor * 0.1;
      const roughVal = Math.min(255, Math.max(60, Math.round(roughFloat * 255)));
      rghImg.data[idx] = roughVal;
      rghImg.data[idx + 1] = roughVal;
      rghImg.data[idx + 2] = roughVal;
      rghImg.data[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rghCtx.putImageData(rghImg, 0, 0);

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.wrapS = THREE.RepeatWrapping;
  albedoMap.wrapT = THREE.ClampToEdgeWrapping;
  albedoMap.anisotropy = Math.min(8, maxAnisotropy);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

  // 2. Translucent Atmospheric Cloud Deck Texture
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 512;
  cloudCanvas.height = 256;
  const cCtx = cloudCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(512, 256);

  for (let y = 0; y < 256; y++) {
    const v = y / 256;
    for (let x = 0; x < 512; x++) {
      const u = x / 512;
      const angle = u * Math.PI * 2;
      const swirl = Math.sin(v * Math.PI * 6) * 0.35;
      const n = fbm(Math.cos(angle) * 3.1 + 8.4 + swirl, Math.sin(angle) * 3.1 + v * 5.2, 4);
      const alpha = Math.max(0, (n - 0.52) * 2.4);
      const idx = (y * 512 + x) * 4;
      cImg.data[idx] = 214;
      cImg.data[idx + 1] = 232;
      cImg.data[idx + 2] = 255;
      cImg.data[idx + 3] = Math.min(180, Math.round(alpha * 220));
    }
  }
  cCtx.putImageData(cImg, 0, 0);
  const cloudMap = new THREE.CanvasTexture(cloudCanvas);
  cloudMap.colorSpace = THREE.SRGBColorSpace;
  cloudMap.wrapS = THREE.RepeatWrapping;
  cloudMap.wrapT = THREE.ClampToEdgeWrapping;

  // 3. Radial Planetary Ring Band Texture (1D gradient strip mapped radially)
  const ringCanvas = document.createElement('canvas');
  ringCanvas.width = 512;
  ringCanvas.height = 16;
  const rCtx = ringCanvas.getContext('2d')!;
  for (let x = 0; x < 512; x++) {
    const t = x / 511; // 0 = inner edge, 1 = outer edge
    const envelope = Math.sin(t * Math.PI);
    const fineBands =
      0.55 +
      0.25 * Math.sin(t * 72) +
      0.2 * Math.cos(t * 148 + 1.1);
    // Subtle Cassini-style division around t = 0.62
    const gap = Math.abs(t - 0.62) < 0.045 ? 0.12 : 1.0;
    const alpha = Math.max(0, Math.min(0.68, envelope * fineBands * gap * 0.65));

    const r = Math.round(138 + t * 52);
    const g = Math.round(174 + (1 - t) * 38);
    const b = Math.round(238);
    rCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
    rCtx.fillRect(x, 0, 1, 16);
  }
  const ringMap = new THREE.CanvasTexture(ringCanvas);
  ringMap.colorSpace = THREE.SRGBColorSpace;
  ringMap.anisotropy = Math.min(8, maxAnisotropy);

  // 4. Cratered Moon Texture
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = 256;
  moonCanvas.height = 128;
  const mCtx = moonCanvas.getContext('2d')!;
  mCtx.fillStyle = '#94A3B8';
  mCtx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 42; i++) {
    const cx = hash2d(i * 1.7, 3.1) * 256;
    const cy = hash2d(i * 2.3, 7.9) * 128;
    const rad = 3 + hash2d(i * 4.1, 1.3) * 12;
    const grad = mCtx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad);
    grad.addColorStop(0, 'rgba(51, 65, 85, 0.55)');
    grad.addColorStop(0.8, 'rgba(71, 85, 105, 0.35)');
    grad.addColorStop(1, 'rgba(203, 213, 225, 0.25)');
    mCtx.fillStyle = grad;
    mCtx.beginPath();
    mCtx.arc(cx, cy, rad, 0, Math.PI * 2);
    mCtx.fill();
  }
  const moonMap = new THREE.CanvasTexture(moonCanvas);
  moonMap.colorSpace = THREE.SRGBColorSpace;

  return { albedoMap, bumpMap, roughnessMap, cloudMap, ringMap, moonMap };
}

/**
 * Generates a lightweight striped/banded procedural canvas texture for solar system planets.
 */
export function createSolarBodyTexture(
  baseHex: string,
  accentHex: string,
  seed: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, accentHex);
  grad.addColorStop(0.25, baseHex);
  grad.addColorStop(0.5, accentHex);
  grad.addColorStop(0.75, baseHex);
  grad.addColorStop(1, accentHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  // Subtle zonal bands
  for (let y = 0; y < 128; y += 6) {
    const alpha = 0.06 + hash2d(y * 0.3, seed) * 0.14;
    ctx.fillStyle =
      y % 12 === 0
        ? `rgba(255, 255, 255, ${alpha.toFixed(3)})`
        : `rgba(7, 9, 14, ${alpha.toFixed(3)})`;
    ctx.fillRect(0, y, 256, 3 + hash2d(seed, y) * 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * Custom GLSL Fresnel atmospheric limb scattering shader — restrained electric blue + violet.
 */
export function createAtmosphereMaterial(
  innerHex = '#3B82F6',
  outerHex = '#8B5CF6',
  intensity = 0.72,
  rimPower = 3.2
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uInnerColor: { value: new THREE.Color(innerHex) },
      uOuterColor: { value: new THREE.Color(outerHex) },
      uIntensity: { value: intensity },
      uRimPower: { value: rimPower },
      uSunDir: { value: new THREE.Vector3(0.8, 0.35, 0.5).normalize() },
    },
    vertexShader: `
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uInnerColor;
      uniform vec3 uOuterColor;
      uniform float uIntensity;
      uniform float uRimPower;
      uniform vec3 uSunDir;
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;

      void main() {
        float viewDot = clamp(dot(normalize(vNormalWorld), normalize(vViewDir)), 0.0, 1.0);
        float rim = pow(1.0 - viewDot, uRimPower);
        float sunFacing = smoothstep(-0.32, 0.78, dot(normalize(vNormalWorld), uSunDir));
        vec3 col = mix(uOuterColor, uInnerColor, sunFacing);
        float alpha = rim * (0.24 + 0.76 * sunFacing) * uIntensity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}
