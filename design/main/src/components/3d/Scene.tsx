import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { Terrain } from './Terrain';
import { Suspense } from 'react';

export function Scene() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 120, 120], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 40, 250]} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        <Suspense fallback={null}>
          <Terrain />
        </Suspense>

        <OrbitControls 
          makeDefault
          enableZoom={false} 
          enablePan={false} 
          maxPolarAngle={Math.PI / 2.5} 
          minPolarAngle={Math.PI / 6}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
