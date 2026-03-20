"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { CellState } from "@/lib/store";

export function GridMap2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const gridCells = useStore((s) => s.gridCells);
  const drones = useStore((s) => s.drones);
  const gridCoverageStats = useStore((s) => s.gridCoverageStats);
  const show2DGridMap = useStore((s) => s.show2DGridMap);
  const toggle2DGridMap = useStore((s) => s.toggle2DGridMap);

  // Redraw canvas when data changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gridSize = 16; // 16x16 grid
    const cellSize = canvas.width / gridSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw cells
    gridCells.forEach((cell) => {
      const x = cell.col * cellSize;
      const y = cell.row * cellSize;

      // Determine fill color based on state
      let fillColor = "#333333"; // default gray (unexplored)
      let strokeColor = "#444444";

      switch (cell.state) {
        case "connected":
          fillColor = "#00ff00"; // green
          strokeColor = "#00cc00";
          break;
        case "covered":
          fillColor = "#666666"; // light gray
          strokeColor = "#555555";
          break;
        case "dead":
          fillColor = "#ff0000"; // red
          strokeColor = "#cc0000";
          break;
        case "sos":
          fillColor = "#ffff00"; // yellow
          strokeColor = "#cccc00";
          break;
      }

      // Fill cell
      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, cellSize - 1, cellSize - 1);

      // Highlight hovered cell
      if (hoveredCell && hoveredCell.row === cell.row && hoveredCell.col === cell.col) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellSize - 1, cellSize - 1);
      } else {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize - 1, cellSize - 1);
      }
    });

    // Draw drone positions
    drones.forEach((drone) => {
      const gridCol = Math.floor((drone.position[0] + 88) / 11);
      const gridRow = Math.floor((drone.position[2] + 88) / 11);

      if (gridCol >= 0 && gridCol < gridSize && gridRow >= 0 && gridRow < gridSize) {
        const x = gridCol * cellSize + cellSize / 2;
        const y = gridRow * cellSize + cellSize / 2;

        // Draw drone dot
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = "#00ffff";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }, [gridCells, drones, hoveredCell]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridSize = 16;
    const cellSize = canvas.width / gridSize;

    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
      setHoveredCell({ row, col });
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  const getGridLabel = (row: number, col: number) => {
    const rowLabel = String.fromCharCode(65 + row); // A, B, C, ...
    return `${rowLabel}${col + 1}`;
  };

  const getCellInfo = () => {
    if (!hoveredCell) return null;

    const cell = gridCells.find(
      (c) => c.row === hoveredCell.row && c.col === hoveredCell.col
    );

    if (!cell) return null;

    const dronesInCell = drones.filter((drone) => {
      const gridCol = Math.floor((drone.position[0] + 88) / 11);
      const gridRow = Math.floor((drone.position[2] + 88) / 11);
      return gridCol === hoveredCell.col && gridRow === hoveredCell.row;
    });

    return {
      label: getGridLabel(hoveredCell.row, hoveredCell.col),
      state: cell.state,
      drones: dronesInCell,
    };
  };

  const cellInfo = getCellInfo();

  if (!show2DGridMap) return null;

  return (
    <div className="absolute bottom-4 right-4 w-80 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-white/10 px-4 py-2 border-b border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium text-white">2D Grid Coverage</span>
        </div>
        <button
          onClick={toggle2DGridMap}
          className="text-white/60 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-white/10">
        <div className="bg-white/5 rounded px-3 py-2">
          <div className="text-xs text-white/60 mb-1">Search Coverage</div>
          <div className="text-lg font-bold text-green-400">
            {gridCoverageStats.searchCoverage.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white/5 rounded px-3 py-2">
          <div className="text-xs text-white/60 mb-1">WiFi Coverage</div>
          <div className="text-lg font-bold text-cyan-400">
            {gridCoverageStats.wifiCoverage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="p-3">
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          className="w-full aspect-square rounded border border-white/20 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Legend */}
      <div className="px-3 pb-2">
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-white/60">Connected</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-600 rounded" />
            <span className="text-white/60">Covered</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-white/60">Dead</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span className="text-white/60">SOS</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-cyan-400 rounded-full" />
            <span className="text-white/60">Drone</span>
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {cellInfo && (
        <div className="absolute top-full right-0 mt-2 bg-black/80 backdrop-blur-md border border-white/20 rounded px-3 py-2 text-xs whitespace-nowrap">
          <div className="text-white font-medium">{cellInfo.label}</div>
          <div className="text-white/60 capitalize">{cellInfo.state}</div>
          {cellInfo.drones.length > 0 && (
            <div className="text-white/60 mt-1">
              {cellInfo.drones.length} drone{cellInfo.drones.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
