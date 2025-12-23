import React, { useEffect, useRef } from 'react';
import { Tip, TubeSegment, SimulationConfig } from '../types';
import { hslToRgbString, wrap } from '../utils/math';

interface Props {
  config: SimulationConfig;
}

const SimulationCanvas: React.FC<Props> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<SimulationConfig>(config);
  
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // State
  const tipsRef = useRef<Tip[]>([]);
  const segmentsRef = useRef<TubeSegment[]>([]);
  const idCounterRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);
  
  // Spatial partitioning for performance (simple grid)
  // Store segment indices in grid cells
  const gridRef = useRef<Map<string, number[]>>(new Map());
  const cellSize = 40;

  const scaleRef = useRef<number>(1);
  const dimensionsRef = useRef<{ w: number, h: number }>({ w: 1000, h: 1000 });

  const getGridKey = (x: number, y: number) => {
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      return `${gx},${gy}`;
  };

  const addToGrid = (seg: TubeSegment, idx: number) => {
      // Add start and end points
      const k1 = getGridKey(seg.x1, seg.y1);
      const k2 = getGridKey(seg.x2, seg.y2);
      
      if (!gridRef.current.has(k1)) gridRef.current.set(k1, []);
      gridRef.current.get(k1)!.push(idx);

      if (k1 !== k2) {
          if (!gridRef.current.has(k2)) gridRef.current.set(k2, []);
          gridRef.current.get(k2)!.push(idx);
      }
  };

  // --- Spawning ---
  // Returns true if successful, false if limit reached
  const spawnTip = (x: number, y: number, heading: number, hue: number, gen: number, targetArray?: Tip[]): boolean => {
      const cfg = configRef.current;
      // Check total population limit (current active + any buffered new ones)
      const currentCount = tipsRef.current.length + (targetArray ? targetArray.length : 0);
      
      if (currentCount >= cfg.MAX_TIPS) {
        return false;
      }

      const newTip: Tip = {
          id: idCounterRef.current++,
          pos: { x, y },
          heading,
          hue,
          energy: 1.0,
          age: 0,
          generation: gen,
          isDead: false
      };

      if (targetArray) {
          targetArray.push(newTip);
      } else {
          tipsRef.current.push(newTip);
      }
      return true;
  };

  const initSimulation = () => {
      const w = dimensionsRef.current.w;
      const h = dimensionsRef.current.h;
      if (w === 0 || h === 0) return;

      const cfg = configRef.current;
      tipsRef.current = [];
      segmentsRef.current = [];
      gridRef.current.clear();

      for (let i = 0; i < cfg.NUM_ROOTS; i++) {
          const rx = Math.random() * w;
          const ry = Math.random() * h;
          const baseHue = Math.random();

          for (let j = 0; j < cfg.ROOT_TIPS_COUNT; j++) {
              const angle = Math.random() * Math.PI * 2;
              spawnTip(rx, ry, angle, baseHue, 0);
          }
      }
  };

  // --- Sensing Algorithm (The "Search" part) ---
  // Returns the best heading adjustment (-1: left, 0: straight, 1: right)
  const senseEnvironment = (tip: Tip, scale: number): number => {
      const cfg = configRef.current;
      const sensorDist = cfg.SENSOR_DIST * scale;
      const angle = cfg.SENSOR_ANGLE;

      const angles = [
          tip.heading - angle, // Left
          tip.heading,         // Center
          tip.heading + angle  // Right
      ];

      const densities = angles.map(a => {
          const sx = tip.pos.x + Math.cos(a) * sensorDist;
          const sy = tip.pos.y + Math.sin(a) * sensorDist;
          
          // Query grid for density
          const key = getGridKey(sx, sy);
          const indices = gridRef.current.get(key);
          if (!indices) return 0;
          
          // Count distinct segments in range
          let count = 0;
          const rSq = (cfg.SAMPLE_RADIUS * scale) ** 2;
          for (const idx of indices) {
              const seg = segmentsRef.current[idx];
              if (!seg) continue;
              // Distance to segment midpoint approx
              const mx = (seg.x1 + seg.x2) / 2;
              const my = (seg.y1 + seg.y2) / 2;
              const d = (sx - mx)**2 + (sy - my)**2;
              if (d < rSq) count++;
          }
          return count;
      });

      // Greedy choice: lowest density
      const minDensity = Math.min(...densities);
      
      // If all blocked, random or die?
      if (minDensity > 5) return (Math.random() - 0.5) * 2; // Panic

      // Prefer keeping straight if density is equal
      if (densities[1] === minDensity) return 0;
      if (densities[0] === minDensity) return -1;
      return 1;
  };

  const update = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const cfg = configRef.current;
      const w = dimensionsRef.current.w;
      const h = dimensionsRef.current.h;
      const scale = scaleRef.current;

      // 1. Update Tips
      const speed = cfg.GROWTH_SPEED * scale;
      const newSegments: TubeSegment[] = [];
      const newTipsBuffer: Tip[] = [];

      // Create a snapshot of current tips to iterate over. 
      // This prevents the loop from processing newly spawned tips in the same frame (infinite loop prevention)
      // and keeps performance predictable.
      const activeTips = tipsRef.current;

      for (const tip of activeTips) {
          if (tip.isDead) continue;

          // Search / Sense
          const turnDir = senseEnvironment(tip, scale);
          tip.heading += turnDir * cfg.TURN_SPEED;
          
          // Wiggle
          tip.heading += (Math.random() - 0.5) * 0.1;

          // Move
          const oldX = tip.pos.x;
          const oldY = tip.pos.y;
          
          tip.pos.x += Math.cos(tip.heading) * speed;
          tip.pos.y += Math.sin(tip.heading) * speed;

          // Wrap (Simulation of infinite petri dish)
          // To make segments look good on wrap, we break the segment.
          let wrapped = false;
          if (tip.pos.x < 0 || tip.pos.x > w || tip.pos.y < 0 || tip.pos.y > h) {
             tip.pos.x = wrap(tip.pos.x, 0, w);
             tip.pos.y = wrap(tip.pos.y, 0, h);
             wrapped = true;
          }

          if (!wrapped) {
              // Create Segment
              const seg: TubeSegment = {
                  id: idCounterRef.current++,
                  x1: oldX,
                  y1: oldY,
                  x2: tip.pos.x,
                  y2: tip.pos.y,
                  hue: tip.hue,
                  width: Math.max(0.5, cfg.SEGMENT_WIDTH_BASE * scale * (1 - tip.generation * 0.05)),
                  opacity: 1.0,
                  age: 0
              };
              newSegments.push(seg);

              // Branching
              if (Math.random() < cfg.BRANCH_PROBABILITY && tip.generation < 10) {
                  const branchAngle = tip.heading + (Math.random() < 0.5 ? -1 : 1) * cfg.SENSOR_ANGLE;
                  // Hue shift
                  const newHue = (tip.hue + (Math.random() - 0.5) * 0.1 + 1) % 1.0;
                  // Spawn into buffer, not directly into tipsRef.current
                  spawnTip(tip.pos.x, tip.pos.y, branchAngle, newHue, tip.generation + 1, newTipsBuffer);
              }
          }

          tip.age++;
          // Random death based on age or density?
          // Let's rely on sensing density. If stuck, maybe stop?
          if (tip.age > 1000) tip.isDead = true; 
      }

      // Merge Buffer
      if (newTipsBuffer.length > 0) {
          tipsRef.current.push(...newTipsBuffer);
      }

      // Add new segments
      for (const s of newSegments) {
          const idx = segmentsRef.current.push(s) - 1;
          addToGrid(s, idx);
      }

      // 2. Segment Management (Limit & Decay)
      // Soft limit: decay opacity if too many
      const totalSegments = segmentsRef.current.length;
      if (totalSegments > cfg.MAX_SEGMENTS) {
          // Remove oldest chunks
          const removeCount = Math.floor(totalSegments * 0.05) + 1; // Remove 5%
          segmentsRef.current.splice(0, removeCount);
          
          gridRef.current.clear();
          segmentsRef.current.forEach((s, i) => addToGrid(s, i));
      }
      
      // Decay opacity of older segments
      for (const seg of segmentsRef.current) {
          seg.age++;
          seg.opacity -= cfg.DECAY_RATE;
      }
      // Remove invisible
      const beforeCount = segmentsRef.current.length;
      segmentsRef.current = segmentsRef.current.filter(s => s.opacity > 0.05);
      if (segmentsRef.current.length !== beforeCount) {
          gridRef.current.clear();
          segmentsRef.current.forEach((s, i) => addToGrid(s, i));
      }

      // Cleanup Tips
      tipsRef.current = tipsRef.current.filter(t => !t.isDead && t.age < 2000);
      
      // Respawn if empty
      if (tipsRef.current.length < 2) {
          const rx = Math.random() * w;
          const ry = Math.random() * h;
          spawnTip(rx, ry, Math.random() * Math.PI*2, Math.random(), 0);
      }

      // 3. Render
      // Clear slightly for trails? No, we draw segments directly.
      // Clear completely
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      // Draw Segments
      ctx.lineCap = 'round';
      for (const seg of segmentsRef.current) {
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.lineWidth = seg.width;
          // Color logic: HSL
          ctx.strokeStyle = hslToRgbString(seg.hue, 0.7, 0.5, seg.opacity);
          ctx.stroke();
      }

      // Draw Active Tips (Glowing heads)
      for (const tip of tipsRef.current) {
          ctx.beginPath();
          ctx.arc(tip.pos.x, tip.pos.y, (cfg.SEGMENT_WIDTH_BASE + 1) * scale, 0, Math.PI * 2);
          ctx.fillStyle = hslToRgbString(tip.hue, 1.0, 0.7, 1.0);
          ctx.fill();
          
          // Debug Sensors?
          // ctx.beginPath();
          // ctx.moveTo(tip.pos.x, tip.pos.y);
          // ctx.lineTo(tip.pos.x + Math.cos(tip.heading)*20, tip.pos.y + Math.sin(tip.heading)*20);
          // ctx.strokeStyle = 'white';
          // ctx.lineWidth = 1;
          // ctx.stroke();
      }

      frameIdRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
        if (!canvasRef.current) return;
        const entry = entries[0];
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        
        canvasRef.current.width = w;
        canvasRef.current.height = h;
        dimensionsRef.current = { w, h };
        
        const diagonal = Math.sqrt(w*w + h*h);
        scaleRef.current = Math.max(0.5, Math.min(2.5, diagonal / 1200));

        // Restart sim on massive resize to keep scale logic simple
        initSimulation();
    });

    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }
    
    // Initial Spawn delayed
    setTimeout(() => {
        if (tipsRef.current.length === 0) initSimulation();
    }, 100);

    frameIdRef.current = requestAnimationFrame(update);

    return () => {
        cancelAnimationFrame(frameIdRef.current);
        resizeObserver.disconnect();
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Spawn a new root at click
    for(let i=0; i<5; i++) {
        spawnTip(x, y, Math.random()*Math.PI*2, Math.random(), 0);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full block"
      />
      <div className="absolute top-4 left-6 pointer-events-none select-none opacity-50 mix-blend-difference">
        <h1 className="text-white text-xs tracking-[0.2em] font-light uppercase">Neural Growth</h1>
      </div>
    </div>
  );
};

export default SimulationCanvas;