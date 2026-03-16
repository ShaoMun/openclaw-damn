import { createNoise2D } from 'simplex-noise';

// We use a deterministic seed so the terrain is always the same
const noise2D = createNoise2D(() => 0.42);

export const TERRAIN_WIDTH = 200;
export const TERRAIN_HEIGHT = 200;
export const TERRAIN_SEGMENTS = 250;

export function getTerrainZ(x: number, y: number): number {
  let z = 0;
  let amplitude = 14;
  let frequency = 0.015;
  for (let o = 0; o < 5; o++) {
    z += noise2D(x * frequency, y * frequency) * amplitude;
    amplitude *= 0.45;
    frequency *= 2.0;
  }
  const distFromCenter = Math.sqrt(x * x + y * y);
  const maxDist = TERRAIN_WIDTH / 2;
  const edgeFalloff = Math.max(0, 1 - Math.pow(distFromCenter / maxDist, 2));
  return z * edgeFalloff;
}

export function getWorldYFromTerrain(x: number, z: number): number {
  // Terrain is rotated -PI/2 on X, so its local Y is world -Z, and local X is world X.
  // Wait, let's check Terrain.tsx: rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}
  // A point (x, y, z_local) on the PlaneGeometry becomes:
  // World X = x
  // World Y = z_local - 5
  // World Z = -y
  
  // So local y = -World Z
  const localY = -z;
  const localX = x;
  
  const z_local = getTerrainZ(localX, localY);
  return z_local - 5;
}
