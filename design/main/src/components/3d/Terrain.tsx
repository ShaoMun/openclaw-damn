import { useRef, useMemo, useState } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { shaderMaterial } from '@react-three/drei';
import { Markers, MarkerData } from './Markers';

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
    uColorSafeBase: new THREE.Color('#777777'),
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

    float alpha = 0.4 + intensityDanger * 0.6 + intensitySafe * 0.4;

    gl_FragColor = vec4(finalColor, alpha);
  }
  `
);

extend({ TerrainMaterial });

export function Terrain() {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<any>(null);
  const noise2D = useMemo(() => createNoise2D(), []);
  const [zoomTarget, setZoomTarget] = useState<THREE.Vector3 | null>(null);
  const isTransitioning = useRef(false);
  const targetCamPos = useRef(new THREE.Vector3(0, 120, 120));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  const width = 200;
  const height = 200;
  const segments = 250;

  const { geometry, markers } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height, segments, segments);
    const posAttribute = geo.attributes.position;

    const getZ = (x: number, y: number) => {
      let z = 0;
      let amplitude = 14;
      let frequency = 0.015;
      for (let o = 0; o < 5; o++) {
        z += noise2D(x * frequency, y * frequency) * amplitude;
        amplitude *= 0.45;
        frequency *= 2.0;
      }
      const distFromCenter = Math.sqrt(x*x + y*y);
      const maxDist = width / 2;
      const edgeFalloff = Math.max(0, 1 - Math.pow(distFromCenter / maxDist, 2));
      return z * edgeFalloff;
    };

    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i);
      posAttribute.setZ(i, getZ(x, y));
    }

    geo.computeVertexNormals();

    const generatedMarkers: MarkerData[] = [
      { position: [20, -15, getZ(20, -15)], type: 'danger', delay: 0 },
      { position: [-40, 30, getZ(-40, 30)], type: 'safe', delay: 1 },
      { position: [50, 40, getZ(50, 40)], type: 'safe', delay: 2 },
      { position: [-20, -50, getZ(-20, -50)], type: 'safe', delay: 3 },
    ];

    return { geometry: geo, markers: generatedMarkers };
  }, [noise2D]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }

    const { camera, controls } = state;

    if (controls) {
      (controls as any).autoRotate = !zoomTarget;
    }

    if (isTransitioning.current) {
      const lerpSpeed = delta * 5;
      camera.position.lerp(targetCamPos.current, lerpSpeed);
      if (controls) {
        (controls as any).target.lerp(targetLookAt.current, lerpSpeed);
      }

      if (camera.position.distanceTo(targetCamPos.current) < 0.5) {
        isTransitioning.current = false;
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (zoomTarget) {
      setZoomTarget(null);
      targetCamPos.current.set(0, 120, 120);
      targetLookAt.current.set(0, 0, 0);
    } else {
      setZoomTarget(e.point.clone());
      targetCamPos.current.copy(e.point).add(new THREE.Vector3(0, 40, 40));
      targetLookAt.current.copy(e.point);
    }
    isTransitioning.current = true;
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'crosshair';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  return (
    <group 
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -5, 0]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <mesh geometry={geometry}>
        {/* @ts-ignore */}
        <terrainMaterial ref={materialRef} wireframe transparent />
      </mesh>
      <mesh geometry={geometry} position={[0, 0, -2]}>
        <meshBasicMaterial color="#777777" wireframe transparent opacity={0.15} />
      </mesh>
      <Markers markers={markers} />
    </group>
  );
}
