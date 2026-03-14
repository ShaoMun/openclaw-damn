'use client';

import { useRef, useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, selectRelays, type RelayPath } from '@/lib/store';

// ─── Animated data-packet sphere ─────────────────────────────────────────────

function Packet({ curve, speed, color }: { curve: THREE.CatmullRomCurve3; speed: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random()); // stagger start

  useFrame((_, delta) => {
    t.current = (t.current + delta * speed) % 1;
    if (ref.current) {
      const p = curve.getPoint(t.current);
      ref.current.position.copy(p);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.6, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

// ─── Single relay path ───────────────────────────────────────────────────────

function RelayLine({ path }: { path: RelayPath }) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(path.hops.map((h) => new THREE.Vector3(...h))),
    [path.hops],
  );

  return (
    <group>
      <Line
        points={path.hops}
        color="#ffffff"
        lineWidth={1.5}
        transparent
        opacity={0.6}
      />
      {/* Two packets travelling at different speeds */}
      <Packet curve={curve} speed={0.25} color="#ffffff" />
      <Packet curve={curve} speed={0.18} color="#cccccc" />
    </group>
  );
}

// ─── All relay paths ─────────────────────────────────────────────────────────

export function RelayPaths() {
  const paths = useStore(selectRelays);
  const visible = useStore((s) => s.showRelayPaths);

  if (!visible || paths.length === 0) return null;

  return (
    <group>
      {paths.map((p) => (
        <RelayLine key={p.id} path={p} />
      ))}
    </group>
  );
}
