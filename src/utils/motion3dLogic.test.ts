import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOLAR_SYSTEM_BODIES,
  computeOrbitalPosition,
  computeScrollProgress,
  computeTiltTransform,
  selectRenderQuality,
} from './motion3dLogic';

test('computeScrollProgress clamps cleanly across boundaries', () => {
  assert.equal(computeScrollProgress(0, 2000, 900), 0);
  assert.equal(computeScrollProgress(550, 2000, 900), 0.5);
  assert.equal(computeScrollProgress(1500, 2000, 900), 1);
  assert.equal(computeScrollProgress(-100, 2000, 900), 0);
  assert.equal(computeScrollProgress(200, 800, 900), 0);
});

test('computeTiltTransform clamps cursor offsets and maps axes correctly', () => {
  const center = computeTiltTransform(0, 0, 5);
  assert.deepEqual(center, { rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });

  const topRight = computeTiltTransform(0.5, -0.5, 4.5);
  assert.equal(topRight.rotateY, 4.5);
  assert.equal(topRight.rotateX, 4.5);
  assert.equal(topRight.glareX, 100);
  assert.equal(topRight.glareY, 0);

  const clamped = computeTiltTransform(2.5, 3.0, 4);
  assert.equal(clamped.rotateY, 4);
  assert.equal(clamped.rotateX, -4);
});

test('selectRenderQuality degrades gracefully for no-WebGL, mobile, software GL, and reduced motion', () => {
  const noGl = selectRenderQuality({
    hasWebGL: false,
    isSoftwareGl: false,
    prefersReducedMotion: false,
    viewportWidth: 1440,
  });
  assert.equal(noGl.tier, 'static-fallback');
  assert.equal(noGl.useWebGL, false);

  const mobile = selectRenderQuality({
    hasWebGL: true,
    isSoftwareGl: false,
    prefersReducedMotion: false,
    viewportWidth: 390,
  });
  assert.equal(mobile.tier, 'static-fallback');
  assert.equal(mobile.useWebGL, false);
  assert.equal(mobile.enableCardTilt, false);

  const reduced = selectRenderQuality({
    hasWebGL: true,
    isSoftwareGl: false,
    prefersReducedMotion: true,
    viewportWidth: 1440,
  });
  assert.equal(reduced.useWebGL, true);
  assert.equal(reduced.animate, false);
  assert.equal(reduced.enableParallax, false);
  assert.equal(reduced.enableCardTilt, false);

  const softwareDesktop = selectRenderQuality({
    hasWebGL: true,
    isSoftwareGl: true,
    prefersReducedMotion: false,
    viewportWidth: 1440,
  });
  assert.equal(softwareDesktop.tier, 'balanced');
  assert.equal(softwareDesktop.pixelRatioCap, 1);
  assert.equal(softwareDesktop.useWebGL, true);

  const gpuDesktop = selectRenderQuality({
    hasWebGL: true,
    isSoftwareGl: false,
    prefersReducedMotion: false,
    viewportWidth: 1440,
    deviceMemory: 8,
    hardwareConcurrency: 8,
  });
  assert.equal(gpuDesktop.tier, 'full');
  assert.equal(gpuDesktop.pixelRatioCap, 2);
  assert.equal(gpuDesktop.enableCardTilt, true);
});

test('computeOrbitalPosition places Sun at origin and computes inclined planetary coordinates', () => {
  assert.deepEqual(computeOrbitalPosition(0, 1.2, 0), { x: 0, y: 0, z: 0 });

  const earthAtZero = computeOrbitalPosition(3.8, 0, 0, 0);
  assert.ok(Math.abs(earthAtZero.x - 3.8) < 1e-6);
  assert.ok(Math.abs(earthAtZero.y) < 1e-6);
  assert.ok(Math.abs(earthAtZero.z) < 1e-6);

  const inclined = computeOrbitalPosition(5, Math.PI / 2, 10, 0);
  assert.ok(inclined.y > 0.8);
  assert.ok(inclined.z > 4.9);
  assert.equal(SOLAR_SYSTEM_BODIES.length, 7);
});
