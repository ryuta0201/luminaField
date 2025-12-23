import React, { useState } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import { CONFIG } from './constants';
import { SimulationConfig } from './types';

// Helper to define slider ranges
const CONTROLS: Array<{ key: keyof SimulationConfig; min: number; max: number; step: number; label: string }> = [
  { key: 'NUM_ROOTS', min: 1, max: 20, step: 1, label: 'Roots' },
  { key: 'ROOT_TIPS_COUNT', min: 1, max: 20, step: 1, label: 'Tips per Root' },
  { key: 'MAX_TIPS', min: 50, max: 1000, step: 10, label: 'Max Active Tips' },
  { key: 'MAX_SEGMENTS', min: 100, max: 10000, step: 100, label: 'Max Segments' },
  
  { key: 'GROWTH_SPEED', min: 0.1, max: 10, step: 0.1, label: 'Growth Speed' },
  { key: 'TURN_SPEED', min: 0.01, max: 1.0, step: 0.01, label: 'Turn Speed' },
  { key: 'SENSOR_ANGLE', min: 0.1, max: 3.0, step: 0.1, label: 'Sensor Angle' },
  { key: 'SENSOR_DIST', min: 5, max: 100, step: 1, label: 'Sensor Distance' },
  { key: 'BRANCH_PROBABILITY', min: 0, max: 0.2, step: 0.001, label: 'Branch Chance' },
  
  { key: 'SEGMENT_WIDTH_BASE', min: 0.5, max: 10, step: 0.1, label: 'Tube Width' },
  { key: 'BASE_OPACITY', min: 0, max: 1, step: 0.01, label: 'Opacity' },
  { key: 'DECAY_RATE', min: 0, max: 0.05, step: 0.0001, label: 'Decay Rate' },
  
  { key: 'SAMPLE_RADIUS', min: 1, max: 50, step: 1, label: 'Collision Radius' },
];

const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(CONFIG);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  const handleUpdate = (key: keyof SimulationConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    alert('Configuration copied to clipboard!');
  };

  return (
    <div className="w-screen h-screen bg-[#050505] overflow-hidden relative">
      <SimulationCanvas config={config} />
      
      {/* Debug Toggle */}
      <button 
        onClick={() => setIsDebugOpen(!isDebugOpen)}
        className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white p-2 rounded backdrop-blur-sm transition-colors"
      >
        {isDebugOpen ? 'Close Debug' : 'Debug'}
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
              Copy JSON
            </button>
          </div>
          
          <div className="space-y-6 pb-20">
            {CONTROLS.map(ctrl => (
              <div key={ctrl.key} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <label htmlFor={ctrl.key}>{ctrl.label}</label>
                  <span>{Math.round(config[ctrl.key] * 1000) / 1000}</span>
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