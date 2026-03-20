'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Selection, EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { Terrain } from './Terrain';
import { Drones } from './Drones';
import { GridOverlay } from './GridOverlay';
import { SOSMarkers } from './SOSMarker';
import { RelayPaths } from './RelayPath';
import { CameraController } from './CameraController';
import { DroneChatBubbles } from './DroneChatBubbles';
import { ActiveScans } from './ActiveScans';
import { ClickMarkers } from './ClickMarkers';
import { GroundClickHandler } from './GroundClickHandler';
import { SOSDetectionMonitor } from './SOSDetectionMonitor';
import { Suspense } from 'react';

export function Scene() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-auto">
      <Canvas
        camera={{ position: [0, 180, 180], fov: 35 }}
        gl={{ antialias: true, alpha: true, stencil: true, depth: true }}
        dpr={[1, 2]}
      >
        <CameraController />
        <color attach="background" args={['#020202']} />
        <fog attach="fog" args={['#020202', 150, 450]} />
        
        <ambientLight intensity={0.4} />
        <pointLight position={[100, 100, 100]} intensity={1.5} color="#00d4ff" />
        <pointLight position={[-100, 50, -50]} intensity={1} color="#ff2200" />

        <Suspense fallback={null}>
          <Selection>
            <Terrain />
            <Drones />
            <GridOverlay />
            <SOSMarkers />
            <RelayPaths />
            <DroneChatBubbles />
            <ActiveScans />
            <ClickMarkers />
            <GroundClickHandler />
            <SOSDetectionMonitor />
          </Selection>

          <EffectComposer multisampling={4}>
            <Bloom 
              intensity={1.5} 
              luminanceThreshold={0.1} 
              luminanceSmoothing={0.9} 
              height={300} 
            />
            <Noise opacity={0.02} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Suspense>

        <OrbitControls 
          makeDefault
          enableZoom={true} 
          enablePan={false} 
          maxDistance={350}
          minDistance={100}
          maxPolarAngle={Math.PI / 2.2} 
          minPolarAngle={0}
          autoRotate={false} // Handled by CameraController
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
