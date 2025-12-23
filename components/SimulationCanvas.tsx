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
  
  // Spatial partitioning
  const gridRef = useRef<Map<string, number[]>>(new Map());
  const cellSize = 50;

  const scaleRef = useRef<number>(1);
  const dimensionsRef = useRef<{ w: number, h: number }>({ w: 1000, h: 1000 });

  const getGridKey = (x: number, y: number) => {
      const gx = Math.floor(x / cellSize);
      const gy = Math.floor(y / cellSize);
      return `${gx},${gy}`;
  };

  const addToGrid = (seg: TubeSegment, idx: number) => {
      const k1 = getGridKey(seg.x1, seg.y1);
      const k2 = getGridKey(seg.x2, seg.y2);
      
      if (!gridRef.current.has(k1)) gridRef.current.set(k1, []);
      gridRef.current.get(k1)!.push(idx);

      if (k1 !== k2) {
          if (!gridRef.current.has(k2)) gridRef.current.set(k2, []);
          gridRef.current.get(k2)!.push(idx);
      }
  };

  const spawnTip = (x: number, y: number, heading: number, hue: number, gen: number, targetArray?: Tip[]): boolean => {
      const cfg = configRef.current;
      const currentCount = tipsRef.current.length + (targetArray ? targetArray.length : 0);
      
      if (currentCount >= cfg.MAX_TIPS) return false;

      const newTip: Tip = {
          id: idCounterRef.current++,
          pos: { x, y },
          heading,
          hue,
          energy: 1.0,
          age: 0,
          generation: gen,
          isDead: false,
          interactionStress: 0,
          wobblePhase: Math.random() * Math.PI * 2
      };

      if (targetArray) targetArray.push(newTip);
      else tipsRef.current.push(newTip);
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
          // Use more natural, desaturated hues for a "garden" feel
          const baseHue = Math.random(); 

          for (let j = 0; j < cfg.ROOT_TIPS_COUNT; j++) {
              const angle = Math.random() * Math.PI * 2;
              spawnTip(rx, ry, angle, baseHue, 0);
          }
      }
  };

  // --- Relational Dynamics Engine ---
  // Returns: { steeringAdjustment, stressImpact }
  const calculateDynamics = (tip: Tip, scale: number): { steer: number, stress: number } => {
      const cfg = configRef.current;
      const senseRad = cfg.SENSOR_DIST * scale;
      const avoidRad = cfg.SAMPLE_RADIUS * scale;
      const grid = gridRef.current;

      // Vectors accumulators
      let alignX = 0, alignY = 0; // Alignment: Match direction of neighbors
      let attractX = 0, attractY = 0; // Attraction: Move towards neighbors
      let repelX = 0, repelY = 0; // Repulsion: Avoid collision
      
      let neighborCount = 0;
      let closeCount = 0;
      let maxLocalStress = 0; // The "scent" of previous reactions

      // 1. Query Grid
      // Check 3x3 grid cells around tip
      const gx = Math.floor(tip.pos.x / cellSize);
      const gy = Math.floor(tip.pos.y / cellSize);
      const candidates = new Set<number>();

      for(let i = -1; i <= 1; i++) {
        for(let j = -1; j <= 1; j++) {
            const key = `${gx+i},${gy+j}`;
            const cell = grid.get(key);
            if(cell) {
                for(const idx of cell) candidates.add(idx);
            }
        }
      }

      // 2. Process Candidates
      const avoidSq = avoidRad * avoidRad;
      const senseSq = senseRad * senseRad;

      for (const idx of candidates) {
          const seg = segmentsRef.current[idx];
          if (!seg) continue;

          // Midpoint of segment
          const mx = (seg.x1 + seg.x2) / 2;
          const my = (seg.y1 + seg.y2) / 2;
          
          const dx = mx - tip.pos.x;
          const dy = my - tip.pos.y;
          const dSq = dx*dx + dy*dy;

          if (dSq < senseSq && dSq > 0.1) {
              const d = Math.sqrt(dSq);
              neighborCount++;

              // Alignment vector (segment orientation)
              // Calculate segment vector
              const segDx = seg.x2 - seg.x1;
              const segDy = seg.y2 - seg.y1;
              // We want to align parallel, so pick the direction closer to current heading
              // Dot product to check orientation
              const dot = segDx * Math.cos(tip.heading) + segDy * Math.sin(tip.heading);
              if (dot > 0) {
                  alignX += segDx;
                  alignY += segDy;
              } else {
                  alignX -= segDx;
                  alignY -= segDy;
              }

              // Second-Order Dynamics:
              // If the neighbor is "stressed" (thick/knotted), it induces more stress in me.
              // Ecological memory transfer.
              if (seg.stressMarker > 0.3) {
                  maxLocalStress = Math.max(maxLocalStress, seg.stressMarker);
              }

              if (dSq < avoidSq) {
                  // Repulsion (too close)
                  closeCount++;
                  const force = (avoidRad - d) / avoidRad;
                  repelX -= (dx / d) * force;
                  repelY -= (dy / d) * force;
              } else {
                  // Attraction (Curiosity/Social) - "Dance"
                  // Only attract if not too crowded
                  const force = (1 - (d / senseRad)); 
                  attractX += (dx / d) * force;
                  attractY += (dy / d) * force;
              }
          }
      }

      // 3. Resolve Forces
      let desiredHeading = tip.heading;
      
      // Calculate resultant vector
      let rx = Math.cos(tip.heading);
      let ry = Math.sin(tip.heading);

      if (neighborCount > 0) {
          // Normalize accumulators (rough)
          alignX /= neighborCount;
          alignY /= neighborCount;
          attractX /= neighborCount;
          attractY /= neighborCount;

          // Apply weights
          rx += alignX * cfg.ALIGNMENT_FORCE * 10;
          ry += alignY * cfg.ALIGNMENT_FORCE * 10;
          
          rx += attractX * cfg.ATTRACTION_FORCE * 10;
          ry += attractY * cfg.ATTRACTION_FORCE * 10;

          // Repulsion overrides everything
          if (closeCount > 0) {
               repelX /= closeCount;
               repelY /= closeCount;
               rx += repelX * cfg.REPULSION_FORCE * 20;
               ry += repelY * cfg.REPULSION_FORCE * 20;
          }
      }

      // Calculate steer angle
      const targetAngle = Math.atan2(ry, rx);
      
      // Diff calculation ensuring shortest turn
      let steer = targetAngle - tip.heading;
      while (steer > Math.PI) steer -= Math.PI * 2;
      while (steer < -Math.PI) steer += Math.PI * 2;

      // Limit steer speed
      steer = Math.max(-cfg.TURN_SPEED, Math.min(cfg.TURN_SPEED, steer));

      // Calculate Stress Impact
      // Interaction causes stress. 
      // Crowding causes HIGH stress. 
      // Existing stress in environment amplifies this.
      let stressDelta = -cfg.STRESS_DECAY; // Default relaxation
      
      if (neighborCount > 0) {
          stressDelta += cfg.STRESS_ACCUMULATION; // Base interaction stress
          if (closeCount > 0) stressDelta += cfg.STRESS_ACCUMULATION * 2; // Collision stress
          
          // Feedback loop: 
          // If I am near highly stressed segments, I get stressed faster.
          stressDelta += maxLocalStress * cfg.STRESS_ACCUMULATION * 2;
      }

      return { steer, stress: stressDelta };
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

      const speed = cfg.GROWTH_SPEED * scale;
      const newSegments: TubeSegment[] = [];
      const newTipsBuffer: Tip[] = [];
      const activeTips = tipsRef.current;

      for (const tip of activeTips) {
          if (tip.isDead) continue;

          // --- Physics & Behavior ---
          const { steer, stress } = calculateDynamics(tip, scale);
          
          // Update State
          tip.heading += steer;
          tip.interactionStress = Math.min(1, Math.max(0, tip.interactionStress + stress));
          
          // --- Morphology (Character) ---
          // Jitter/Wobble increases with stress
          tip.wobblePhase += 0.2 + (tip.interactionStress * 0.5);
          const wobble = Math.sin(tip.wobblePhase) * cfg.JITTER_STRENGTH * tip.interactionStress;
          tip.heading += wobble;

          // Move
          const oldX = tip.pos.x;
          const oldY = tip.pos.y;
          
          tip.pos.x += Math.cos(tip.heading) * speed;
          tip.pos.y += Math.sin(tip.heading) * speed;

          // Wrap
          let wrapped = false;
          if (tip.pos.x < 0 || tip.pos.x > w || tip.pos.y < 0 || tip.pos.y > h) {
             tip.pos.x = wrap(tip.pos.x, 0, w);
             tip.pos.y = wrap(tip.pos.y, 0, h);
             wrapped = true;
          }

          if (!wrapped) {
              // Create Segment with Reaction History
              // Width depends on stress (Knots/Bulges)
              const stressWidth = tip.interactionStress * cfg.SEGMENT_WIDTH_VAR * scale;
              const baseWidth = cfg.SEGMENT_WIDTH_BASE * scale * (1 - tip.generation * 0.05);
              
              const seg: TubeSegment = {
                  id: idCounterRef.current++,
                  x1: oldX,
                  y1: oldY,
                  x2: tip.pos.x,
                  y2: tip.pos.y,
                  hue: tip.hue,
                  width: baseWidth + stressWidth,
                  opacity: 1.0,
                  age: 0,
                  stressMarker: tip.interactionStress
              };
              newSegments.push(seg);

              // Branching (Reaction -> Reaction)
              // Probability drastically increases with stress (interaction)
              const dynamicProb = cfg.BRANCH_PROBABILITY_BASE + (tip.interactionStress * cfg.BRANCH_STRESS_MULTIPLIER);
              
              if (Math.random() < dynamicProb && tip.generation < 8) {
                  // Branch usually shoots off to side
                  const branchAngle = tip.heading + (Math.random() < 0.5 ? -1 : 1) * cfg.SENSOR_ANGLE;
                  // Stress causes color shift (Reaction visibility)
                  const hueShift = (Math.random() - 0.5) * 0.1 + (tip.interactionStress * 0.2); 
                  const newHue = (tip.hue + hueShift + 1) % 1.0;
                  
                  spawnTip(tip.pos.x, tip.pos.y, branchAngle, newHue, tip.generation + 1, newTipsBuffer);
              }
          }

          tip.age++;
          // Die if too old, but stress keeps you alive longer (memory)
          const lifeSpan = 1500 + (tip.interactionStress * 1000);
          if (tip.age > lifeSpan) tip.isDead = true; 
      }

      if (newTipsBuffer.length > 0) tipsRef.current.push(...newTipsBuffer);

      // Add new segments
      for (const s of newSegments) {
          const idx = segmentsRef.current.push(s) - 1;
          addToGrid(s, idx);
      }

      // Cleanup
      const totalSegments = segmentsRef.current.length;
      if (totalSegments > cfg.MAX_SEGMENTS) {
          const removeCount = Math.floor(totalSegments * 0.02) + 1; 
          segmentsRef.current.splice(0, removeCount);
          gridRef.current.clear();
          segmentsRef.current.forEach((s, i) => addToGrid(s, i));
      }
      
      // Decay
      // Use backward loop for efficient removal? Or just filter.
      // JS filter is fine for ~5k elements.
      const survivingSegments: TubeSegment[] = [];
      let rebuildGrid = false;
      
      for (const seg of segmentsRef.current) {
          seg.age++;
          // Stressed segments last longer (Ecological memory)
          const decay = cfg.DECAY_RATE * (1 / (1 + seg.stressMarker * 4));
          seg.opacity -= decay;
          
          if (seg.opacity > 0.02) {
              survivingSegments.push(seg);
          } else {
              rebuildGrid = true;
          }
      }
      segmentsRef.current = survivingSegments;
      if (rebuildGrid) {
          gridRef.current.clear();
          segmentsRef.current.forEach((s, i) => addToGrid(s, i));
      }

      tipsRef.current = tipsRef.current.filter(t => !t.isDead);
      
      if (tipsRef.current.length < 2) {
          spawnTip(Math.random()*w, Math.random()*h, Math.random()*Math.PI*2, Math.random(), 0);
      }

      // Render
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Batch drawing by style for performance? 
      // For organic look, drawing in order is better for layering.
      
      for (const seg of segmentsRef.current) {
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.lineWidth = seg.width;
          
          // High stress = White/Desaturated, Low stress = Color
          // Or: High stress = more saturation?
          // Let's make stressed areas brighter and more intense.
          const l = 0.5 + (seg.stressMarker * 0.4); 
          const s = 0.6 + (seg.stressMarker * 0.4);
          
          ctx.strokeStyle = hslToRgbString(seg.hue, s, l, seg.opacity);
          ctx.stroke();
      }

      // Draw Tips
      for (const tip of tipsRef.current) {
          const r = (cfg.SEGMENT_WIDTH_BASE + cfg.SEGMENT_WIDTH_VAR * tip.interactionStress) * scale * 0.8;
          ctx.beginPath();
          ctx.arc(tip.pos.x, tip.pos.y, Math.max(1, r), 0, Math.PI * 2);
          // Tips glow white when stressed
          const l = 0.5 + (tip.interactionStress * 0.5);
          ctx.fillStyle = hslToRgbString(tip.hue, 1.0, l, 1.0);
          ctx.fill();
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
        initSimulation();
    });

    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }
    
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
    for(let i=0; i<3; i++) {
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
        <h1 className="text-white text-xs tracking-[0.2em] font-light uppercase">Neural Garden</h1>
      </div>
    </div>
  );
};

export default SimulationCanvas;