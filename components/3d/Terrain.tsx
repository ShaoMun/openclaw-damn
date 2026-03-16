import { useRef, useMemo, useState } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { Markers, MarkerData } from './Markers';
import { dronePositions } from './Drones';
import { useStore } from '@/lib/store';
import { getTerrainZ, TERRAIN_WIDTH, TERRAIN_HEIGHT, TERRAIN_SEGMENTS } from '@/lib/terrain';

const TerrainMaterial = shaderMaterial(
  {
    uTime: 0,
    uDangerCenter: new THREE.Vector2(20, -15),
    uDangerRadius: 35.0,
    uSafeCenters: [
      new THREE.Vector2(-40, 30),
      new THREE.Vector2(50, 40),
      new THREE.Vector2(-20, -50)
    ],
    uColorSafeBase: new THREE.Color('#444444'),
    uColorSafeGlow: new THREE.Color('#ffffff'),
    uColorDanger: new THREE.Color('#ff2200'),
    uColorDangerCore: new THREE.Color(4.0, 0.5, 0.0), // High intensity for bloom
  },
  // vertex shader
  `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  // fragment shader
  `
  uniform float uTime;
  uniform vec2 uDangerCenter;
  uniform float uDangerRadius;
  uniform vec2 uSafeCenters[3];
  uniform vec3 uColorSafeBase;
  uniform vec3 uColorSafeGlow;
  uniform vec3 uColorDanger;
  uniform vec3 uColorDangerCore;

  varying vec3 vPosition;

  void main() {
    // Danger Zone
    float distDanger = distance(vPosition.xy, uDangerCenter);
    float normDanger = 1.0 - clamp(distDanger / uDangerRadius, 0.0, 1.0);
    float intensityDanger = pow(normDanger, 2.5);
    float pulseDanger = (sin(uTime * 3.0) * 0.2 + 0.8);
    intensityDanger *= pulseDanger;

    // Safe Zones
    float intensitySafe = 0.0;
    for(int i=0; i<3; i++) {
      float d = distance(vPosition.xy, uSafeCenters[i]);
      float n = 1.0 - clamp(d / 25.0, 0.0, 1.0);
      intensitySafe += pow(n, 2.0);
    }
    float pulseSafe = (sin(uTime * 2.0) * 0.1 + 0.9);
    intensitySafe *= pulseSafe;
    intensitySafe = clamp(intensitySafe, 0.0, 1.0);

    // Vignette: fade out towards edges
    float distFromCenter = length(vPosition.xy);
    float vignetteStart = 50.0;
    float vignetteEnd = 100.0;
    float vignette = 1.0 - smoothstep(vignetteStart, vignetteEnd, distFromCenter);

    vec3 finalColor = uColorSafeBase;
    
    // Mix safe glow
    if (intensitySafe > 0.0) {
      finalColor = mix(finalColor, uColorSafeGlow, intensitySafe * 0.8);
    }

    // Mix danger glow (overrides safe)
    if (intensityDanger > 0.0) {
      vec3 dangerMix = mix(uColorDanger, uColorDangerCore, intensityDanger);
      finalColor = mix(finalColor, dangerMix, intensityDanger * 1.5);
    }

    float alpha = (0.4 + intensityDanger * 0.6 + intensitySafe * 0.4) * vignette;

    gl_FragColor = vec4(finalColor, alpha);
  }
  `
);

const TerrainScansMaterial = shaderMaterial(
  {
    uTime: 0,
    uScanCount: 0,
    uScanCenters: [
      new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()
    ],
    uScanRadii: [0, 0, 0, 0, 0],
    uScanStartTimes: [0, 0, 0, 0, 0],
    uScanDurations: [0, 0, 0, 0, 0],
  },
  // vertex shader
  `
  varying vec3 vPosition;
  void main() {
    vPosition = position; // Local plane coords
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  // fragment shader
  `
  uniform float uTime;
  uniform int uScanCount;
  uniform vec2 uScanCenters[5];
  uniform float uScanRadii[5];
  uniform float uScanStartTimes[5];
  uniform float uScanDurations[5];

  varying vec3 vPosition;

  vec2 random2(vec2 st){
      st = vec2( dot(st,vec2(127.1,311.7)),
                dot(st,vec2(269.5,183.3)) );
      return -1.0 + 2.0*fract(sin(st)*43758.5453123);
  }

  float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      vec2 u = f*f*(3.0-2.0*f);
      return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                       dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                  mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                       dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
  }

  vec3 getThermalColor(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.0, 0.6);
    vec3 blue = vec3(0.0, 0.4, 1.0);
    vec3 cyan = vec3(0.0, 1.0, 1.0);
    vec3 green = vec3(0.0, 1.0, 0.0);
    vec3 yellow = vec3(1.0, 1.0, 0.0);
    vec3 red = vec3(1.0, 0.0, 0.0);
    
    // Skew the color mapping so the lower 60% of heat values are purely blue/cyan
    if (t < 0.3) return mix(deepBlue, blue, t / 0.3);
    if (t < 0.6) return mix(blue, cyan, (t - 0.3) / 0.3);
    if (t < 0.8) return mix(cyan, green, (t - 0.6) / 0.2);
    if (t < 0.9) return mix(green, yellow, (t - 0.8) / 0.1);
    return mix(yellow, red, (t - 0.9) / 0.1);
  }

  void main() {
    vec3 totalColor = vec3(0.0);
    float totalAlpha = 0.0;

    for (int i = 0; i < 5; i++) {
      if (i >= uScanCount) break;

      vec2 center = uScanCenters[i];
      float radius = uScanRadii[i];
      float startTime = uScanStartTimes[i];
      float duration = uScanDurations[i];
      
      float elapsed = uTime - startTime;
      if (elapsed < 0.0 || elapsed > duration) continue;

      float dist = distance(vPosition.xy, center);
      if (dist > radius) continue;

      float fade = 1.0;
      if (duration - elapsed < 1.0) {
        fade = (duration - elapsed) / 1.0;
      }

      vec2 offset = vPosition.xy - center;
      float angle = atan(offset.y, offset.x);

      // Sweep angle
      float sweepAngle = mod(-elapsed * 4.0, 6.28318) - 3.14159;
      float diff = mod(angle - sweepAngle + 6.28318, 6.28318);
      float beam = exp(-diff * 3.0);

      float noiseVal = noise(vPosition.xy * 0.1 + elapsed * 0.5) * 0.5 + 0.5;
      float heat = mix(0.0, 0.8, noiseVal);
      heat += sin(dist * 1.5 - elapsed * 2.0) * 0.15;

      vec3 color = getThermalColor(heat);
      color += vec3(0.5, 0.8, 1.0) * smoothstep(0.0, 0.05, diff) * (1.0 - smoothstep(0.05, 0.1, diff)); // Cyan/Blue hot beam edge

      float alpha = 1.0 - smoothstep(radius * 0.8, radius, dist);
      alpha *= max(beam, 0.4) * fade;

      totalColor += color * alpha;
      totalAlpha += alpha;
    }

    if (totalAlpha <= 0.0) discard;
    
    // Boost contrast for ultra saturation!
    totalColor = pow(totalColor, vec3(0.8)) * 2.0;

    gl_FragColor = vec4(totalColor, clamp(totalAlpha, 0.0, 0.9));
  }
  `
);

const TerrainCommsMaterial = shaderMaterial(
  {
    uTime: 0,
    uDroneCount: 0,
    uDroneCenters: [
      new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(),
      new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()
    ]
  },
  `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  `
  uniform float uTime;
  uniform int uDroneCount;
  uniform vec2 uDroneCenters[10];

  varying vec3 vPosition;

  void main() {
    vec3 totalColor = vec3(0.0);
    float totalAlpha = 0.0;
    
    for(int i=0; i<10; i++) {
      if (i >= uDroneCount) break;
      float dist = distance(vPosition.xy, uDroneCenters[i]);
      
      // Draw communication ring (45m radius)
      float ring = smoothstep(44.0, 45.0, dist) * (1.0 - smoothstep(45.0, 46.0, dist));
      
      // Dashed effect
      vec2 offset = vPosition.xy - uDroneCenters[i];
      float angle = atan(offset.y, offset.x);
      float dashes = step(0.5, sin(angle * 40.0 - uTime * 1.5));
      
      // Inner faint coverage (very subtle)
      float inner = smoothstep(0.0, 45.0, dist) * 0.01;
      
      // Much more subtle intensity
      float intensity = (ring * (0.1 + 0.3 * dashes)) + inner;
      if (intensity > 0.0) {
         // Deep, dim cyan
         totalColor += vec3(0.0, 0.4, 0.6) * intensity;
         totalAlpha += intensity;
      }
    }
    
    if (totalAlpha <= 0.0) discard;
    // Lower max opacity for subtlety
    gl_FragColor = vec4(totalColor, clamp(totalAlpha, 0.0, 0.2));
  }
  `
);

extend({ TerrainMaterial, TerrainScansMaterial, TerrainCommsMaterial });

export function Terrain() {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<any>(null);
  const scansMaterialRef = useRef<any>(null);
  const commsMaterialRef = useRef<any>(null);
  const setCameraFocus = useStore((s) => s.setCameraFocus);
  const activeScans = useStore((s) => s.activeScans);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const width = TERRAIN_WIDTH;
  const height = TERRAIN_HEIGHT;
  const segments = TERRAIN_SEGMENTS;

  const { geometry, markers } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, segments, segments);
    const posAttribute = geo.attributes.position;

    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i);
      posAttribute.setZ(i, getTerrainZ(x, y));
    }

    geo.computeVertexNormals();

    const generatedMarkers: MarkerData[] = [
      { position: [20, -15, getTerrainZ(20, -15)], type: 'danger', delay: 0 },
      { position: [-40, 30, getTerrainZ(-40, 30)], type: 'safe', delay: 1 },
      { position: [50, 40, getTerrainZ(50, 40)], type: 'safe', delay: 2 },
      { position: [-20, -50, getTerrainZ(-20, -50)], type: 'safe', delay: 3 },
    ];

    return { geometry: geo, markers: generatedMarkers };
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
    if (scansMaterialRef.current) {
      scansMaterialRef.current.uTime = state.clock.elapsedTime;
      
      const count = Math.min(activeScans.length, 5);
      scansMaterialRef.current.uScanCount = count;
      
      // Update uniform arrays
      for (let i = 0; i < count; i++) {
        const scan = activeScans[i];
        // Scan position is in World coords (x, y, z)
        // Terrain local plane is rotated -PI/2 on X.
        // So a world point (X, Y, Z) maps to local (X, -Z)
        scansMaterialRef.current.uScanCenters[i].set(scan.position[0], -scan.position[2]);
        scansMaterialRef.current.uScanRadii[i] = scan.radius;
        // Using actual seconds for time
        scansMaterialRef.current.uScanStartTimes[i] = state.clock.elapsedTime - (Date.now() - scan.startTime) / 1000;
        scansMaterialRef.current.uScanDurations[i] = scan.duration / 1000;
      }
    }
    
    if (commsMaterialRef.current) {
      commsMaterialRef.current.uTime = state.clock.elapsedTime;
      const onlineDrones = useStore.getState().drones.filter(d => d.status === 'online');
      const count = Math.min(onlineDrones.length, 10);
      commsMaterialRef.current.uDroneCount = count;
      
      for (let i = 0; i < count; i++) {
        // Safe check for dronePositions
        const dPos = dronePositions.get(onlineDrones[i].id);
        if (dPos) {
           commsMaterialRef.current.uDroneCenters[i].set(dPos.x, -dPos.z);
        } else {
           commsMaterialRef.current.uDroneCenters[i].set(onlineDrones[i].position[0], -onlineDrones[i].position[2]);
        }
      }
    }
  });

  return (
    <group 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -5, 0]}
      onPointerDown={(e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        if (!pointerDownPos.current) return;
        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        pointerDownPos.current = null;

        // Only treat as click if pointer barely moved (not a drag)
        if (dist < 4) {
          e.stopPropagation();
          setCameraFocus([e.point.x, e.point.y, e.point.z]);
        }
      }}
    >
      {/* Base Wireframe Terrain */}
      <mesh geometry={geometry}>
        {/* @ts-ignore */}
        <terrainMaterial ref={materialRef} wireframe transparent />
      </mesh>
      
      {/* Scan Overlay Mesh (Solid, perfectly hugs terrain geometry) */}
      <mesh geometry={geometry}>
        {/* @ts-ignore */}
        <terrainScansMaterial 
          ref={scansMaterialRef} 
          transparent={true} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending} 
          polygonOffset={true} 
          polygonOffsetFactor={-1} 
        />
      </mesh>

      {/* Comms Range Radial Overlay */}
      <mesh geometry={geometry}>
        {/* @ts-ignore */}
        <terrainCommsMaterial 
          ref={commsMaterialRef} 
          transparent={true} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending} 
          polygonOffset={true} 
          polygonOffsetFactor={-2} 
        />
      </mesh>
      
      <Markers markers={markers} />
    </group>
  );
}
