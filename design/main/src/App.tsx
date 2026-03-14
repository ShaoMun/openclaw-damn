/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Scene } from './components/3d/Scene';
import { Dashboard } from './components/ui/Dashboard';

export default function App() {
  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans selection:bg-white/30">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      <Scene />
      <Dashboard />
    </div>
  );
}
