import React from 'react';
import SimulationCanvas from './components/SimulationCanvas';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen bg-[#050505] overflow-hidden">
      <SimulationCanvas />
    </div>
  );
};

export default App;