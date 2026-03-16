"use client";

import { useState, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore, selectSOS } from "@/lib/store";

// ─── Single SOS beacon ──────────────────────────────────────────────────────

function SOSBeacon({
  id,
  position,
  timestamp,
  strength,
  gridLabel,
  isSelected,
  onSelect,
}: {
  id: string;
  position: [number, number, number];
  timestamp: number;
  strength: number;
  gridLabel: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const lineRef = useRef<THREE.Mesh>(null);
  const groundRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Pulse for the vertical line - faster/brighter if selected
    if (lineRef.current) {
      const baseOpacity = isSelected ? 0.7 : 0.4;
      const pulseSpeed = isSelected ? 10 : 4;
      const pulseAmp = isSelected ? 0.25 : 0.15;
      (lineRef.current.material as THREE.MeshBasicMaterial).opacity =
        baseOpacity + Math.sin(t * pulseSpeed) * pulseAmp;
    }
    // Ground circle pulse
    if (groundRef.current) {
      const scale = isSelected
        ? 1.2 + Math.sin(t * 6) * 0.2
        : 1 + Math.sin(t * 3) * 0.1;
      groundRef.current.scale.set(scale, scale, 1);
    }
  });

  const elapsed = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  // Color based on strength
  const strengthColor =
    strength > 0.7 ? "#22c55e" : strength > 0.4 ? "#eab308" : "#ef4444";

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {/* Hitarea for interaction */}
      <mesh visible={false}>
        <sphereGeometry args={[15, 16, 16]} />
      </mesh>

      {/* Vertical Line (Red Pulsing) */}
      <mesh ref={lineRef} position={[0, 25, 0]}>
        <cylinderGeometry
          args={[isSelected ? 0.5 : 0.25, isSelected ? 0.5 : 0.25, 50, 8]}
        />
        <meshBasicMaterial
          color={isSelected ? "#ff3333" : "#ff0000"}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Ground Point */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
      >
        <ringGeometry args={[isSelected ? 3 : 2, isSelected ? 5 : 3.5, 32]} />
        <meshBasicMaterial
          color={isSelected ? "#ff3333" : "#ff0000"}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Inner ground glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
        <circleGeometry args={[isSelected ? 3 : 2, 32]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.5} />
      </mesh>

      {/* SOS Label with strength indicator */}
      <Html
        center
        position={[0, 65, 0]}
        distanceFactor={40}
        zIndexRange={[0, 0]}
      >
        <div
          className="pointer-events-none flex flex-col items-center gap-1 transition-all duration-300"
          style={{
            transform: hovered || isSelected ? "scale(1.3)" : "scale(1)",
          }}
        >
          {/* Main SOS Text */}
          <div className="flex flex-col items-center">
            <span
              className={`font-black tracking-widest leading-none drop-shadow-[0_0_30px_rgba(255,0,0,0.9)] ${
                isSelected ? "animate-pulse" : ""
              }`}
              style={{
                color: "#ff0000",
                fontSize: isSelected ? "5rem" : "4rem",
                WebkitTextStroke: isSelected
                  ? "2px rgba(255, 50, 50, 0.8)"
                  : "1px rgba(255, 0, 0, 0.5)",
              }}
            >
              SOS
            </span>

            {/* Sector + Time */}
            <div
              className={`mt-3 px-3 py-1.5 border backdrop-blur-sm ${
                isSelected
                  ? "bg-red-600/20 border-red-500/50"
                  : "bg-red-600/10 border-red-500/30"
              }`}
            >
              <div className="text-[11px] font-mono text-red-400 font-bold tracking-widest uppercase">
                {gridLabel} · {mins}m {secs}s
              </div>
            </div>

            {/* Signal Strength Bar */}
            <div className="mt-2 w-24 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${strength * 100}%`,
                  backgroundColor: strengthColor,
                }}
              />
            </div>
            <div
              className="text-[9px] font-mono font-bold mt-1"
              style={{ color: strengthColor }}
            >
              {Math.round(strength * 100)}% SIGNAL
            </div>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="mt-2 px-2 py-0.5 bg-white/10 border border-white/20 rounded-sm">
              <span className="text-[8px] font-mono text-white uppercase tracking-wider">
                SELECTED
              </span>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// ─── All SOS markers ─────────────────────────────────────────────────────────

export function SOSMarkers() {
  const sosSignals = useStore(selectSOS);
  const selectedSOSId = useStore((s) => s.selectedSOSId);
  const selectSOSAction = useStore((s) => s.selectSOS);

  return (
    <group>
      {sosSignals.map((sos) => (
        <SOSBeacon
          key={sos.id}
          id={sos.id}
          position={sos.position}
          timestamp={sos.timestamp}
          strength={sos.strength}
          gridLabel={sos.gridLabel}
          isSelected={sos.id === selectedSOSId}
          onSelect={selectSOSAction}
        />
      ))}
    </group>
  );
}
