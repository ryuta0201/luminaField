import React, { useState, useCallback } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import { CONFIG } from './constants';
import { SimulationConfig } from './types';

// Helper to define slider ranges
const CONTROLS: Array<{ key: keyof SimulationConfig; min: number; max: number; step: number; label: string }> = [
  { key: 'SAFETY_TIPS_LIMIT', min: 100, max: 1000, step: 10, label: 'Max Active Tips' },
  { key: 'SAFETY_SEGMENTS_LIMIT', min: 1000, max: 10000, step: 100, label: 'Max Segments' },

  { key: 'GROWTH_SPEED', min: 0.2, max: 5, step: 0.1, label: 'Growth Speed' },
  { key: 'TURN_SPEED', min: 0.01, max: 0.5, step: 0.01, label: 'Turn Speed' },
  
  { key: 'ALIGNMENT_FORCE', min: 0, max: 0.2, step: 0.001, label: 'Alignment (Flow)' },
  { key: 'ATTRACTION_FORCE', min: 0, max: 0.1, step: 0.001, label: 'Attraction (Curiosity)' },
  { key: 'REPULSION_FORCE', min: 0, max: 0.5, step: 0.01, label: 'Repulsion (Space)' },
  
  { key: 'BRANCH_PROBABILITY_BASE', min: 0, max: 0.05, step: 0.001, label: 'Base Branching' },
  { key: 'BRANCH_STRESS_MULTIPLIER', min: 0, max: 0.2, step: 0.001, label: 'Stress Branching' },
  
  { key: 'STRESS_ACCUMULATION', min: 0, max: 0.2, step: 0.001, label: 'Reaction Sensitivity' },
  { key: 'JITTER_STRENGTH', min: 0, max: 2.0, step: 0.01, label: 'Wobble Intensity' },
  
  { key: 'DECAY_RATE', min: 0.0001, max: 0.01, step: 0.0001, label: 'Decay Rate' },
];

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(CONFIG);
  const [isDebugOpen, setIsDebugOpen] = useState(true);
  const [atmosphere, setAtmosphere] = useState<string[]>([]);

  const handleUpdate = (key: keyof SimulationConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleAtmosphereChange = useCallback((descriptors: string[]) => {
    setAtmosphere(descriptors);
  }, []);

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    alert('Configuration copied to clipboard!');
  };

  return (
    <div className="w-screen h-screen bg-[#050505] overflow-hidden relative selection:bg-none">
      <SimulationCanvas config={config} onAtmosphereChange={handleAtmosphereChange} />
      
      {/* Atmosphere Monitor (Bottom Left) */}
      <div className="absolute bottom-8 left-8 pointer-events-none select-none mix-blend-difference z-0">
        <h1 className="text-white/40 text-xs tracking-[0.3em] font-light uppercase mb-2">
          Atmosphere
        </h1>
        <div className="flex gap-4">
          {atmosphere.map((tag, i) => (
            <span key={i} className="text-white/80 text-sm font-light tracking-widest uppercase">
              {tag}
            </span>
          ))}
        </div>
      </div>
      
      {/* Debug Toggle */}
      <button 
        onClick={() => setIsDebugOpen(!isDebugOpen)}
        className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white p-2 rounded backdrop-blur-sm transition-colors text-xs uppercase tracking-widest"
      >
        {isDebugOpen ? 'Hide Controls' : 'Controls'}
      </button>

      {/* Debug Panel */}
      {isDebugOpen && (
        <div className="absolute top-0 right-0 h-full w-80 bg-black/80 backdrop-blur-md text-white overflow-y-auto p-4 border-l border-white/10 z-40 transition-transform">
          <div className="flex justify-between items-center mb-6 mt-12">
            <h2 className="text-xl font-light tracking-wider">Parameters</h2>
            <button 
              onClick={copyConfig}
              className="text-xs bg-emerald-600/50 hover:bg-emerald-600 px-2 py-1 rounded"
            >
              Copy
            </button>
          </div>
          
          <div className="space-y-6 pb-20">
            {CONTROLS.map(ctrl => (
              <div key={ctrl.key} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <label htmlFor={ctrl.key}>{ctrl.label}</label>
                  <span>{Math.round(config[ctrl.key] * 10000) / 10000}</span>
                </div>
                <input
                  id={ctrl.key}
                  type="range"
                  min={ctrl.min}
                  max={ctrl.max}
                  step={ctrl.step}
                  value={config[ctrl.key]}
                  onChange={(e) => handleUpdate(ctrl.key, parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;