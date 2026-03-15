import { Html } from '@react-three/drei';
import { WifiIcon } from '@/components/ui/WifiIcon';
import { WifiOffIcon } from '@/components/ui/WifiOffIcon';
import { useState } from 'react';

export interface MarkerData {
  position: [number, number, number];
  type: 'safe' | 'danger';
  delay: number;
}

function Marker({ position, type, delay }: MarkerData) {
  const [hovered, setHovered] = useState(false);

  return (
    <group 
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Target Mesh for pointer events */}
      <mesh position={[0, 0, 0]} visible={false}>
        <sphereGeometry args={[5, 16, 16]} />
      </mesh>

      <Html position={[0, 0, 25]} center>
        <div className="pointer-events-none flex flex-col items-center gap-4 transition-all duration-300"
          style={{
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
            opacity: hovered ? 1 : 0.9
          }}
        >
          <div className={type === 'safe' ? 'text-white' : 'text-red-500'}>
            {type === 'safe' ? (
              <WifiIcon className="w-16 h-16 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
            ) : (
              <WifiOffIcon className="w-16 h-16 drop-shadow-[0_0_30px_rgba(255,0,0,1)]" />
            )}
          </div>
          <div className="px-4 py-1.5 rounded-sm bg-black/70 backdrop-blur-md border border-white/20 whitespace-nowrap shadow-2xl">
            <span className={`text-[14px] font-mono font-black uppercase tracking-[0.3em] ${type === 'safe' ? 'text-white' : 'text-red-400'}`}>
              {type === 'safe' ? 'WIFI ZONE' : 'NO-WIFI ZONE'}
            </span>
          </div>
          {/* Vertical line down to terrain */}
          <div className={`w-[3px] h-20 mx-auto ${
            type === 'safe' ? 'bg-gradient-to-b from-white to-transparent' : 'bg-gradient-to-b from-red-500 to-transparent'
          }`} />
        </div>
      </Html>
    </group>
  );
}

export function Markers({ markers }: { markers: MarkerData[] }) {
  return (
    <>
      {markers.map((marker, i) => (
        <Marker key={i} {...marker} />
      ))}
    </>
  );
}
