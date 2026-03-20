/**
 * Connection Status Indicator
 *
 * Displays whether the frontend is connected to the real MCP drone swarm backend
 * or operating in mock data mode.
 */

'use client';

import { useStore } from '@/lib/store';

export function ConnectionStatus() {
  const mcpConnected = useStore((s) => s.mcpConnected);
  const mcpConnectionError = useStore((s) => s.mcpConnectionError);

  // Don't show anything if not connected and no error (initial state)
  if (!mcpConnected && !mcpConnectionError) {
    return null;
  }

  if (mcpConnected) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded flex items-center gap-2 animate-pulse">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="text-sm font-medium">
          Connected to MCP Drone Swarm
        </span>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-500/20 border border-yellow-500 text-yellow-400 px-4 py-2 rounded flex items-center gap-2">
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div className="flex flex-col">
        <span className="text-sm font-medium">
          Using Mock Data - MCP Unavailable
        </span>
        {mcpConnectionError && (
          <span className="text-xs text-yellow-300/70">
            {mcpConnectionError}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact version for embedding in other components
 */
export function ConnectionStatusBadge() {
  const mcpConnected = useStore((s) => s.mcpConnected);

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-2 h-2 rounded-full ${
          mcpConnected ? 'bg-green-500' : 'bg-yellow-500'
        }`}
      />
      <span className="text-xs text-gray-400">
        {mcpConnected ? 'Live MCP' : 'Mock Data'}
      </span>
    </div>
  );
}
