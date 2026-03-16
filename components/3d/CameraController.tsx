"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore, selectDrones, selectSOS } from "@/lib/store";

const AUTO_ROTATE_SPEED = 0.0008;

export function CameraController() {
  const { camera, controls } = useThree();
  const selectedDroneId = useStore((s) => s.selectedDroneId);
  const selectedSOSId = useStore((s) => s.selectedSOSId);
  const cameraFocusPoint = useStore((s) => s.cameraFocusPoint);
  const selectDrone = useStore((s) => s.selectDrone);
  const selectSOSAction = useStore((s) => s.selectSOS);
  const setCameraFocus = useStore((s) => s.setCameraFocus);
  const drones = useStore(selectDrones);
  const sosSignals = useStore(selectSOS);

  const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

  const targetLookAt = useRef(new THREE.Vector3());
  const targetCamPos = useRef(new THREE.Vector3());
  const autoRotateAngle = useRef(0);

  const isTransitioning = useRef(false);
  const lastFocusKey = useRef<string>("");
  const isInOverview = useRef(true);

  // ─── ESC key resets to overview ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        selectDrone(null);
        selectSOSAction(null);
        setCameraFocus(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectDrone, selectSOSAction, setCameraFocus]);

  // ─── Trigger transitions ──────────────────────────────────────────────────────
  useEffect(() => {
    const focusKey = selectedDroneId
      ? `drone:${selectedDroneId}`
      : selectedSOSId
        ? `sos:${selectedSOSId}`
        : cameraFocusPoint
          ? `pos:${cameraFocusPoint.join(",")}`
          : "";

    if (focusKey === lastFocusKey.current) return;
    lastFocusKey.current = focusKey;

    const currentTarget = controls
      ? (controls as any).target.clone()
      : OVERVIEW_TARGET.clone();
    let currentCamDir = camera.position.clone().sub(currentTarget).normalize();

    // Prevent the camera from getting too flat to the ground during transitions
    if (currentCamDir.y < 0.4) {
      currentCamDir.y = 0.4;
      currentCamDir.normalize();
    }

    if (!focusKey) {
      // ESC or deselect — pull back to overview
      isInOverview.current = true;
      targetLookAt.current.copy(OVERVIEW_TARGET);
      targetCamPos.current
        .copy(OVERVIEW_TARGET)
        .add(currentCamDir.multiplyScalar(240));
      targetCamPos.current.y = Math.max(160, targetCamPos.current.y);

      isTransitioning.current = true;
      if (controls) (controls as any).enabled = false;
      return;
    }

    // Something is selected - zoom to it
    isInOverview.current = false;
    let targetPos: [number, number, number] | null = null;

    if (selectedDroneId) {
      const drone = drones.find((d) => d.id === selectedDroneId);
      if (drone) targetPos = drone.position;
    } else if (selectedSOSId) {
      const sos = sosSignals.find((s) => s.id === selectedSOSId);
      if (sos) targetPos = sos.position;
    } else if (cameraFocusPoint) {
      targetPos = cameraFocusPoint;
    }

    if (!targetPos) return;

    const [x, y, z] = targetPos;

    // Final zoom target
    targetLookAt.current.set(x, y, z);

    // Calculate new cam position: 80 units away along the current viewing angle
    targetCamPos.current
      .copy(targetLookAt.current)
      .add(currentCamDir.multiplyScalar(80));

    isTransitioning.current = true;
    if (controls) (controls as any).enabled = false;
  }, [
    selectedDroneId,
    selectedSOSId,
    cameraFocusPoint,
    drones,
    sosSignals,
    controls,
    camera,
  ]);

  // ─── Frame-level lerp + auto-rotate ──────────────────────────────────────────
  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.1);

    // Handle transitions
    if (isTransitioning.current) {
      const lerpSpeed = safeDelta * 5;
      camera.position.lerp(targetCamPos.current, lerpSpeed);
      if (controls)
        (controls as any).target.lerp(targetLookAt.current, lerpSpeed);

      if (
        camera.position.distanceTo(targetCamPos.current) < 0.5 &&
        (controls as any).target.distanceTo(targetLookAt.current) < 0.5
      ) {
        isTransitioning.current = false;
        if (controls) (controls as any).enabled = true;
      }
      return;
    }

    // Auto-rotate when in overview mode
    if (isInOverview.current && controls && (controls as any).enabled) {
      autoRotateAngle.current += AUTO_ROTATE_SPEED;

      const radius = 240;
      const height = 180;

      const newX = Math.sin(autoRotateAngle.current) * radius;
      const newZ = Math.cos(autoRotateAngle.current) * radius;

      camera.position.x = newX;
      camera.position.y = height;
      camera.position.z = newZ;

      (controls as any).target.set(0, 0, 0);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}
