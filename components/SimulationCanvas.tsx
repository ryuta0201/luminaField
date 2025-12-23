import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Agent, Vector, TrailPoint } from '../types';
import { CONFIG } from '../constants';
import { distSq, averageHue, hslToRgbString, wrap } from '../utils/math';

const SimulationCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const agentsRef = useRef<Agent[]>([]);
  const frameIdRef = useRef<number>(0);
  const stagnationCounterRef = useRef<number>(0);
  const idCounterRef = useRef<number>(0);
  
  // Dynamic scaling factors
  const scaleRef = useRef<number>(1);
  const dimensionsRef = useRef<{ w: number, h: number }>({ w: 1000, h: 1000 });

  // Initialize
  useEffect(() => {
    // Initial Seed - larger population for immediate effect
    // We delay slightly to ensure dimensions are set
    const timer = setTimeout(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Scale number of agents by screen area
        const area = w * h;
        const count = Math.min(Math.floor(area / 15000), 150); // ~130 agents for 1080p
        
        for (let i = 0; i < count; i++) {
            spawnAgent({ 
                x: w / 2 + (Math.random() - 0.5) * (w * 0.5), 
                y: h / 2 + (Math.random() - 0.5) * (h * 0.5) 
            });
        }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const spawnAgent = (pos: Vector, forceHue?: number, forceMutation?: boolean) => {
    const id = idCounterRef.current++;
    
    // Neighborhood color inheritance
    let hue = Math.random();
    let isMutant = false;

    // Use current scale for neighborhood check radius
    const searchRadius = CONFIG.NEIGHBOR_RADIUS_BASE * scaleRef.current;

    if (forceHue !== undefined) {
      hue = forceHue;
    } else if (agentsRef.current.length > 0) {
      // Find nearby
      const nearbyHues: number[] = [];
      for (const a of agentsRef.current) {
        if (distSq(pos, a.pos) < searchRadius * searchRadius) {
          nearbyHues.push(a.hue);
        }
      }

      if (nearbyHues.length > 0) {
        hue = averageHue(nearbyHues);
        
        // Mutation
        if (forceMutation || Math.random() < CONFIG.MUTATION_CHANCE) {
          hue = (hue + 0.5) % 1.0; // Opposite color
          isMutant = true;
        } else {
            // Small drift
            hue = (hue + (Math.random() - 0.5) * 0.03 + 1.0) % 1.0;
        }
      }
    }

    const newAgent: Agent = {
      id,
      pos: { ...pos },
      vel: { x: (Math.random() - 0.5), y: (Math.random() - 0.5) },
      hue,
      energy: 0.8 + Math.random() * 0.2,
      age: 0,
      isDead: false,
      trail: [],
      neighborsCount: 0,
      mutationFactor: isMutant ? 1 : 0
    };

    agentsRef.current.push(newAgent);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Spawn a small burst
    for(let i=0; i<3; i++) {
        spawnAgent({ 
            x: x + (Math.random() - 0.5) * 20, 
            y: y + (Math.random() - 0.5) * 20 
        });
    }
  };

  // Main Loop
  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = dimensionsRef.current.w;
    const height = dimensionsRef.current.h;
    const scale = scaleRef.current;

    // Scaled Parameters
    const neighborRadius = CONFIG.NEIGHBOR_RADIUS_BASE * scale;
    const agentRadius = CONFIG.AGENT_RADIUS_BASE * scale;
    const maxSpeed = CONFIG.MAX_SPEED_BASE * scale;
    const trailLengthMax = CONFIG.TRAIL_LENGTH_BASE * (scale * 1.5); // Trails scale slightly more
    const repulsionDist = agentRadius * 4;

    // Fade effect
    ctx.fillStyle = 'rgba(5, 5, 5, 0.15)'; 
    ctx.fillRect(0, 0, width, height);

    const agents = agentsRef.current;
    let totalVelocity = 0;

    // --- Spatial Awareness & Physics ---
    for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        if (a.isDead) continue;

        let neighbors = 0;
        let avgVelX = 0;
        let avgVelY = 0;
        let avgPosX = 0;
        let avgPosY = 0;
        let separateX = 0;
        let separateY = 0;

        for (let j = 0; j < agents.length; j++) {
            if (i === j) continue;
            const b = agents[j];
            if (b.isDead) continue;

            const dx = a.pos.x - b.pos.x;
            const dy = a.pos.y - b.pos.y;
            
            // Simple wrap-around distance check approximation
            // (Strict wrap distance is expensive, skipping for performance/minimalism)
            if (Math.abs(dx) > neighborRadius || Math.abs(dy) > neighborRadius) continue;

            const dSq = dx*dx + dy*dy;

            // Neighbor Influence
            if (dSq < neighborRadius * neighborRadius) {
                neighbors++;
                
                // Alignment accumulator
                avgVelX += b.vel.x;
                avgVelY += b.vel.y;

                // Cohesion accumulator
                avgPosX += b.pos.x;
                avgPosY += b.pos.y;
                
                // Separation
                if (dSq < repulsionDist * repulsionDist && dSq > 0.01) {
                    const d = Math.sqrt(dSq);
                    const force = (repulsionDist - d) / repulsionDist;
                    separateX += (dx / d) * force;
                    separateY += (dy / d) * force;
                }
            }
        }

        a.neighborsCount = neighbors;

        // --- Apply Rules ---
        
        // 1. Steering
        if (neighbors > 0) {
            // Alignment (match velocity)
            a.vel.x += (avgVelX / neighbors) * CONFIG.ALIGNMENT_FORCE;
            a.vel.y += (avgVelY / neighbors) * CONFIG.ALIGNMENT_FORCE;

            // Cohesion (move to center of group)
            const centerX = avgPosX / neighbors;
            const centerY = avgPosY / neighbors;
            const dirX = centerX - a.pos.x;
            const dirY = centerY - a.pos.y;
            // Normalize direction approx
            a.vel.x += dirX * CONFIG.COHESION_FORCE;
            a.vel.y += dirY * CONFIG.COHESION_FORCE;
        }

        // Random Wander
        a.vel.x += (Math.random() - 0.5) * CONFIG.WANDER_STRENGTH * scale;
        a.vel.y += (Math.random() - 0.5) * CONFIG.WANDER_STRENGTH * scale;

        // Separation (avoid crowding)
        a.vel.x += separateX * CONFIG.REPULSION_FORCE;
        a.vel.y += separateY * CONFIG.REPULSION_FORCE;

        // 2. Life & Energy
        let energyDelta = -0.0005; // Tiny metabolic cost

        if (neighbors >= CONFIG.IDEAL_NEIGHBORS_MIN && neighbors <= CONFIG.IDEAL_NEIGHBORS_MAX) {
            energyDelta += CONFIG.ENERGY_GAIN_RATE;
        } else if (neighbors > CONFIG.CROWD_LIMIT) {
            energyDelta -= CONFIG.ENERGY_LOSS_RATE * 1.5;
        } else if (neighbors < 1) {
            energyDelta -= CONFIG.ENERGY_LOSS_RATE;
        }

        a.energy = Math.min(Math.max(a.energy + energyDelta, 0), 1);
        a.age++;

        // 3. Death
        let deathChance = CONFIG.DEATH_CHANCE_BASE;
        if (a.energy <= 0.01) deathChance = 0.02; // Starvation
        if (a.age > CONFIG.MAX_AGE) deathChance += 0.005; // Old age

        if (Math.random() < deathChance) {
            a.isDead = true;
        }

        // 4. Physics Integration
        a.vel.x *= CONFIG.FRICTION;
        a.vel.y *= CONFIG.FRICTION;

        // Speed Limit
        const speedSq = a.vel.x * a.vel.x + a.vel.y * a.vel.y;
        if (speedSq > maxSpeed * maxSpeed) {
            const currentSpeed = Math.sqrt(speedSq);
            a.vel.x = (a.vel.x / currentSpeed) * maxSpeed;
            a.vel.y = (a.vel.y / currentSpeed) * maxSpeed;
        }

        a.pos.x += a.vel.x;
        a.pos.y += a.vel.y;

        // Screen Wrap
        a.pos.x = wrap(a.pos.x, 0, width);
        a.pos.y = wrap(a.pos.y, 0, height);

        totalVelocity += Math.sqrt(speedSq);
    }

    // --- Stagnation ---
    const avgSystemSpeed = agents.length > 0 ? totalVelocity / agents.length : 0;
    if (agents.length > 10 && avgSystemSpeed < CONFIG.STAGNATION_VELOCITY_THRESHOLD * scale) {
        stagnationCounterRef.current++;
        if (stagnationCounterRef.current > CONFIG.STAGNATION_FRAMES_TRIGGER) {
            stagnationCounterRef.current = 0;
            // Rare event
            spawnAgent({ x: Math.random() * width, y: Math.random() * height }, Math.random(), true);
        }
    } else {
        stagnationCounterRef.current = Math.max(0, stagnationCounterRef.current - 1);
    }

    // --- Drawing ---
    agents.forEach(a => {
        // Update Trail
        if (!a.isDead) {
            a.trail.unshift({ x: a.pos.x, y: a.pos.y, opacity: 1 });
            if (a.trail.length > trailLengthMax) a.trail.pop();
        } else {
            // Fast decay if dead
            if (a.trail.length > 0) a.trail.pop();
            if (a.trail.length > 0) a.trail.pop();
        }

        // Draw Trail
        if (a.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(a.trail[0].x, a.trail[0].y);
            // Draw every point for smoothness
            for (let t = 1; t < a.trail.length; t++) {
                ctx.lineTo(a.trail[t].x, a.trail[t].y);
            }
            
            const lightness = a.isDead ? 0.2 : 0.4 + (a.energy * 0.3);
            const saturation = a.mutationFactor > 0.5 ? 0.9 : 0.6;
            const alpha = a.isDead ? 0.1 : CONFIG.BASE_OPACITY * (a.energy > 0.5 ? 1 : 0.5);
            
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = hslToRgbString(a.hue, saturation, lightness, alpha);
            ctx.lineWidth = CONFIG.TRAIL_WIDTH_BASE * scale;
            ctx.stroke();
        }

        // Draw Head (only if healthy or new)
        if (!a.isDead && a.trail.length < 5) {
            ctx.beginPath();
            ctx.arc(a.pos.x, a.pos.y, agentRadius, 0, Math.PI * 2);
            ctx.fillStyle = hslToRgbString(a.hue, 0.8, 0.6, 1);
            ctx.fill();
        }
    });

    // Cleanup
    agentsRef.current = agents.filter(a => !a.isDead || a.trail.length > 0);
    
    // Rare autonomous birth
    if (agents.length < 300 && Math.random() < 0.05) {
         const randomAgent = agents[Math.floor(Math.random() * agents.length)];
         if (randomAgent && !randomAgent.isDead && 
             randomAgent.neighborsCount >= 3 && 
             randomAgent.neighborsCount <= 5 &&
             randomAgent.energy > 0.9) {
             
             spawnAgent({
                 x: randomAgent.pos.x + (Math.random() - 0.5) * 10 * scale,
                 y: randomAgent.pos.y + (Math.random() - 0.5) * 10 * scale
             });
         }
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
        
        // Calculate Scale
        // Base scale: 1.0 at 1920x1080 (approx 2M pixels)
        // Scaled down for mobile, slightly up for 4k
        const diagonal = Math.sqrt(w*w + h*h);
        scaleRef.current = Math.max(0.5, Math.min(2.5, diagonal / 1200));
    });

    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    frameIdRef.current = requestAnimationFrame(update);

    return () => {
        cancelAnimationFrame(frameIdRef.current);
        resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full block"
      />
      <div className="absolute top-4 left-6 pointer-events-none select-none opacity-50 mix-blend-difference">
        <h1 className="text-white text-xs tracking-[0.2em] font-light uppercase">Lumina Field</h1>
      </div>
    </div>
  );
};

export default SimulationCanvas;