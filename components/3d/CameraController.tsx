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
        // Re-enable controls in case they were disabled mid-transition
        if (controls) (controls as any).enabled = true;
        isTransitioning.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controls, selectDrone, setCameraFocus]);

  const OVERVIEW_CAM = new THREE.Vector3(0, 180, 180);
  const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

  // ─── Trigger transitions ──────────────────────────────────────────────────────
  useEffect(() => {
    // Build a key so we only trigger when the target actually changes
    const focusKey = selectedDroneId
      ? `drone:${selectedDroneId}`
      : cameraFocusPoint
      ? `pos:${cameraFocusPoint.join(',')}`
      : '';

    if (focusKey === lastFocusKey.current) return;
    lastFocusKey.current = focusKey;

    if (!focusKey) {
      // ESC or deselect — zoom back to overview
      targetLookAt.current.copy(OVERVIEW_TARGET);
      targetCamPos.current.copy(OVERVIEW_CAM);
      isTransitioning.current = true;
      if (controls) (controls as any).enabled = false;
      return;
    }

    let targetPos: [number, number, number] | null = null;

    if (selectedDroneId) {
      const drone = drones.find((d) => d.id === selectedDroneId);
      if (drone) targetPos = drone.position;
    } else if (cameraFocusPoint) {
      targetPos = cameraFocusPoint;
    }

    if (!targetPos) return;

    const [x, y, z] = targetPos;
    targetLookAt.current.set(x, y, z);
    targetCamPos.current.set(x, y + 80, z + 80);
    isTransitioning.current = true;
    if (controls) (controls as any).enabled = false;
  }, [selectedDroneId, cameraFocusPoint, drones, controls]);

  // ─── Frame-level lerp ────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!isTransitioning.current) return;

    const lerpSpeed = Math.min(delta * 5, 1);
    camera.position.lerp(targetCamPos.current, lerpSpeed);
    if (controls) (controls as any).target.lerp(targetLookAt.current, lerpSpeed);

    if (camera.position.distanceTo(targetCamPos.current) < 0.5) {
      isTransitioning.current = false;
      if (controls) (controls as any).enabled = true;
    }
  });

  return null;
}
