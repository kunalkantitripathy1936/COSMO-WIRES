export interface WebGLProbeResult {
  supported: boolean;
  isSoftwareGl: boolean;
}

let cachedProbe: WebGLProbeResult | null = null;

/**
 * Probes WebGL2/WebGL support and detects software WebGL renderers via the GPU renderer string
 * (never UA sniffing), freeing the probe context immediately.
 * Kept in a Three.js-free module so eager components never pull Three.js into the initial bundle.
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
