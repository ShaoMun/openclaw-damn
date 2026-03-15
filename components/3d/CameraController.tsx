'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, selectDrones } from '@/lib/store';

export function CameraController() {
  const { camera, controls } = useThree();
  const selectedDroneId = useStore((s) => s.selectedDroneId);
  const cameraFocusPoint = useStore((s) => s.cameraFocusPoint);
  const selectDrone = useStore((s) => s.selectDrone);
  const setCameraFocus = useStore((s) => s.setCameraFocus);
  const drones = useStore(selectDrones);

  const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

  const targetLookAt = useRef(new THREE.Vector3());
  const targetCamPos = useRef(new THREE.Vector3());
  
  const isTransitioning = useRef(false);
  const lastFocusKey = useRef<string>('');

  // ─── ESC key resets to overview ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectDrone(null);
        setCameraFocus(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectDrone, setCameraFocus]);

  // ─── Trigger transitions ──────────────────────────────────────────────────────
  useEffect(() => {
    const focusKey = selectedDroneId
      ? `drone:${selectedDroneId}`
      : cameraFocusPoint
      ? `pos:${cameraFocusPoint.join(',')}`
      : '';

    if (focusKey === lastFocusKey.current) return;
    lastFocusKey.current = focusKey;

    const currentTarget = controls ? (controls as any).target.clone() : OVERVIEW_TARGET.clone();
    let currentCamDir = camera.position.clone().sub(currentTarget).normalize();
    
    // Prevent the camera from getting too flat to the ground during transitions
    if (currentCamDir.y < 0.4) {
      currentCamDir.y = 0.4;
      currentCamDir.normalize();
    }

    if (!focusKey) {
      // ESC or deselect — pull back to dynamic godsview based on current angle
      targetLookAt.current.copy(OVERVIEW_TARGET);
      targetCamPos.current.copy(OVERVIEW_TARGET).add(currentCamDir.multiplyScalar(240));
      targetCamPos.current.y = Math.max(160, targetCamPos.current.y);

      isTransitioning.current = true;
      if (controls) (controls as any).enabled = false;
      return;
    }

    // Target selected
    let targetPos: [number, number, number] | null = null;
    if (selectedDroneId) {
      const drone = drones.find((d) => d.id === selectedDroneId);
      if (drone) targetPos = drone.position;
    } else if (cameraFocusPoint) {
      targetPos = cameraFocusPoint;
    }

    if (!targetPos) return;

    const [x, y, z] = targetPos;
    
    // Final zoom target
    targetLookAt.current.set(x, y, z);
    
    // Calculate new cam position: 80 units away along the current viewing angle
    // This provides a direct, glitch-free slide over to the new target
    targetCamPos.current.copy(targetLookAt.current).add(currentCamDir.multiplyScalar(80));

    isTransitioning.current = true;
    if (controls) (controls as any).enabled = false;
  }, [selectedDroneId, cameraFocusPoint, drones, controls, camera]);

  // ─── Frame-level lerp ────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!isTransitioning.current) return;

    // Cap delta to avoid wild jumps on lag spikes
    const safeDelta = Math.min(delta, 0.1);

    const lerpSpeed = safeDelta * 5;
    camera.position.lerp(targetCamPos.current, lerpSpeed);
    if (controls) (controls as any).target.lerp(targetLookAt.current, lerpSpeed);

    if (camera.position.distanceTo(targetCamPos.current) < 0.5 &&
        (controls as any).target.distanceTo(targetLookAt.current) < 0.5) {
      isTransitioning.current = false;
      if (controls) (controls as any).enabled = true;
    }
  });

  return null;
}
