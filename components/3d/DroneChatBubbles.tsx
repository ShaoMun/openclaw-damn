'use client';

import { useRef, useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, selectDrones, type DroneReasoningEntry } from '@/lib/store';
import { dronePositions } from './Drones';

function DroneChatBubble({ droneId, entry, index }: { droneId: string; entry: DroneReasoningEntry; index: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Calculate age for opacity
  const age = Date.now() - entry.timestamp;
  const maxAge = 15000; // 15 seconds
  const opacity = Math.max(0, 1 - age / maxAge);

  useFrame(() => {
    // Get interpolated position from global tracker
    const dronePos = dronePositions.get(droneId);
    if (!dronePos || !groupRef.current) {
      if (isVisible) setIsVisible(false);
      return;
    }
    
    if (!isVisible) setIsVisible(true);
    
    // Stack bubbles vertically based on index
    const verticalOffset = 15 + (index * 7);
    groupRef.current.position.set(
      dronePos.x,
      dronePos.y + verticalOffset,
      dronePos.z
    );
  });

  if (opacity <= 0) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'action': return 'text-yellow-400';
      case 'observation': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <group ref={groupRef}>
      {isVisible && (
        <Html center zIndexRange={[100, 0]}>
          <div 
            className="pointer-events-auto flex flex-col items-center"
            style={{ 
              opacity,
              transition: 'opacity 0.5s ease-out',
              transform: 'translateY(-50%)'
            }}
          >
            <div className="relative">
              <div 
                className={`bg-black/60 backdrop-blur-md border border-white/20 px-3 py-2 rounded-sm shadow-2xl min-w-[200px]`}
                style={{
                  maxWidth: '220px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`text-[9px] font-mono text-white/40 uppercase tracking-widest leading-none`}>
                    {droneId}
                  </div>
                  <div className={`text-[8px] font-mono ${getTypeColor(entry.type)} uppercase tracking-wider`}>
                    {entry.type}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-white/90 whitespace-normal leading-relaxed break-words">
                  {entry.text}
                </div>
              </div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-black/60 border-r border-b border-white/20 rotate-45" />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function DroneChatBubbles() {
  const drones = useStore(selectDrones);
  const perDroneReasoning = useStore((s) => s.perDroneReasoning);
  const selectedDroneId = useStore((s) => s.selectedDroneId);

  // Get all reasoning entries for all drones, sorted by timestamp
  const allReasoning: Array<{ droneId: string; entry: DroneReasoningEntry }> = [];
  
  Object.entries(perDroneReasoning).forEach(([droneId, entries]) => {
    if (droneId === selectedDroneId) return;
    entries.slice(0, 3).forEach((entry) => {
      const age = Date.now() - entry.timestamp;
      if (age < 15000) {
        allReasoning.push({ droneId, entry });
      }
    });
  });

  return (
    <>
      {allReasoning.map((item, index) => (
        <DroneChatBubble
          key={`${item.droneId}-${item.entry.id}`}
          droneId={item.droneId}
          entry={item.entry}
          index={index % 3} // Cycle through 3 vertical positions
        />
      ))}
    </>
  );
}
