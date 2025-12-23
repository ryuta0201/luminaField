// ryuta0201/luminafield/luminaField.../components/SimulationCanvas.tsx
import React, { useEffect, useRef } from 'react';
import { Tip, TubeSegment, SimulationConfig, AtmosphereState } from '../types';
import { hslToRgbString, wrap } from '../utils/math';
import { initAtmosphere, updateAtmosphere, getAtmosphereDescription } from '../utils/atmosphere';

interface Props {
  config: SimulationConfig;
  onAtmosphereChange?: (descriptors: string[]) => void;
}

const SimulationCanvas: React.FC<Props> = ({ config, onAtmosphereChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 設定のRef（Propsから受け取るが、内部でアトラクタによって上書きされるベース値）
  const configRef = useRef<SimulationConfig>(config);
  
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // 天候（数学モデル）の状態
  const atmosphereRef = useRef<AtmosphereState>(initAtmosphere());
  
  // シミュレーション状態
  const tipsRef = useRef<Tip[]>([]);
  const segmentsRef = useRef<TubeSegment[]>([]);
  const idCounterRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);
  
  // 空間分割（Grid）
  const gridRef = useRef<Map<string, number[]>>(new Map());
  const cellSize = 60; // 少し広げて探索回数を減らす

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

  const spawnTip = (x: number, y: number, heading: number, hue: number, gen: number, targetArray?: Tip[]) => {
      if (tipsRef.current.length >= configRef.current.SAFETY_TIPS_LIMIT) return;

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
  };

  const initSimulation = () => {
      const w = dimensionsRef.current.w;
      const h = dimensionsRef.current.h;
      if (w === 0 || h === 0) return;

      // Reset
      tipsRef.current = [];
      segmentsRef.current = [];
      gridRef.current.clear();
      atmosphereRef.current = initAtmosphere(); // 新しい数式モデルを選出

      // 初期配置：花火のように中心から散らばる
      const centerX = w / 2;
      const centerY = h / 2;
      
      // 複数のクラスターを作る
      for(let k=0; k<3; k++) {
        const clusterX = centerX + (Math.random() - 0.5) * w * 0.5;
        const clusterY = centerY + (Math.random() - 0.5) * h * 0.5;
        const baseHue = Math.random();
        
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
            spawnTip(clusterX, clusterY, angle, baseHue, 0);
        }
      }
  };

  // --- Physics Engine ---
  const calculateDynamics = (tip: Tip, scale: number, globalModulation: number) => {
      const cfg = configRef.current;
      const senseRad = cfg.SENSOR_DIST * scale;
      const avoidRad = cfg.SAMPLE_RADIUS * scale; // 衝突回避半径
      
      // アトラクタの影響をパラメータに適用
      // modulation (0~1) が高いとき -> 整列強、速度速、直進的 (Flow)
      // modulation (0~1) が低いとき -> 探索強、速度遅、カオス的 (Curious)
      
      const currentSpeed = cfg.GROWTH_SPEED * (0.5 + globalModulation);
      const currentAlign = cfg.ALIGNMENT_FORCE * (0.2 + globalModulation * 0.8); 
      const currentTurn = cfg.TURN_SPEED * (1.5 - globalModulation * 0.5); // Flow時は急旋回しない

      // Grid Search
      const gx = Math.floor(tip.pos.x / cellSize);
      const gy = Math.floor(tip.pos.y / cellSize);
      const candidates = new Set<number>();
      
      // 近傍9セルのみ探索
      for(let i = -1; i <= 1; i++) {
        for(let j = -1; j <= 1; j++) {
            const key = `${gx+i},${gy+j}`;
            const cell = gridRef.current.get(key);
            if(cell) {
                // パフォーマンス対策：近傍チェック数を制限（間引き）
                const limit = cell.length > 50 ? 50 : cell.length; 
                for(let k=0; k<limit; k++) candidates.add(cell[k]);
            }
        }
      }

      let alignX = 0, alignY = 0;
      let attractX = 0, attractY = 0;
      let repelX = 0, repelY = 0;
      let neighborCount = 0;

      const avoidSq = avoidRad * avoidRad;
      const senseSq = senseRad * senseRad;

      for (const idx of candidates) {
          const seg = segmentsRef.current[idx];
          if (!seg) continue;

          // 簡易距離チェック (BBox)
          if (Math.abs(seg.x1 - tip.pos.x) > senseRad || Math.abs(seg.y1 - tip.pos.y) > senseRad) continue;

          const mx = (seg.x1 + seg.x2) / 2;
          const my = (seg.y1 + seg.y2) / 2;
          const dx = mx - tip.pos.x;
          const dy = my - tip.pos.y;
          const dSq = dx*dx + dy*dy;

          if (dSq < senseSq && dSq > 0.1) {
              const d = Math.sqrt(dSq);
              neighborCount++;

              // Repulsion (衝突回避 - 最も重要)
              if (dSq < avoidSq) {
                  const force = (avoidRad - d) / avoidRad;
                  repelX -= (dx / d) * force * 3.0; // 強く反発させる
                  repelY -= (dy / d) * force * 3.0;
              } 
              // Alignment & Attraction
              else {
                  // Alignment: 近傍のセグメントの向きに合わせる
                  const segDx = seg.x2 - seg.x1;
                  const segDy = seg.y2 - seg.y1;
                  // ドット積で進行方向が近い場合のみ整列（逆走防止）
                  const dot = segDx * Math.cos(tip.heading) + segDy * Math.sin(tip.heading);
                  if (dot > 0) {
                      alignX += segDx;
                      alignY += segDy;
                  }
                  
                  // Attraction: 少しだけ引き合う（束になる）
                  const force = (1 - (d / senseRad)); 
                  attractX += (dx / d) * force;
                  attractY += (dy / d) * force;
              }
          }
      }

      // Forces Integration
      let rx = Math.cos(tip.heading);
      let ry = Math.sin(tip.heading);

      if (neighborCount > 0) {
          // Normalize & Apply
          alignX /= neighborCount; alignY /= neighborCount;
          attractX /= neighborCount; attractY /= neighborCount;

          rx += alignX * currentAlign * 20; // 整列を最優先してFlowを作る
          ry += alignY * currentAlign * 20;
          
          rx += attractX * cfg.ATTRACTION_FORCE * 5;
          ry += attractY * cfg.ATTRACTION_FORCE * 5;

          // Repulsion overrides
          rx += repelX * cfg.REPULSION_FORCE * 50; // 反発は絶対
          ry += repelY * cfg.REPULSION_FORCE * 50;
      }

      // 目標角度へのステアリング
      const targetAngle = Math.atan2(ry, rx);
      let steer = targetAngle - tip.heading;
      
      // 最短回転方向へ
      while (steer > Math.PI) steer -= Math.PI * 2;
      while (steer < -Math.PI) steer += Math.PI * 2;
      
      // 旋回速度制限
      steer = Math.max(-currentTurn, Math.min(currentTurn, steer));

      // 密度が高すぎる場合、強制的に散らす（FPS対策 & Clumping防止）
      if (neighborCount > 20) {
          steer += (Math.random() - 0.5) * 1.5; 
      }

      return { steer, speed: currentSpeed, neighborCount };
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

      // 1. 天候の更新 (Math Engine)
      const modulation = updateAtmosphere(atmosphereRef.current);

      // UIへの通知（間引き）
      if (onAtmosphereChange && Math.random() < 0.05) {
          onAtmosphereChange(getAtmosphereDescription(atmosphereRef.current));
      }

      const newSegments: TubeSegment[] = [];
      const newTipsBuffer: Tip[] = [];
      const activeTips = tipsRef.current;

      // --- Tips Update Loop ---
      for (const tip of activeTips) {
          if (tip.isDead) continue;

          const { steer, speed, neighborCount } = calculateDynamics(tip, scale, modulation);

          // Update State
          tip.heading += steer;

          // Wobble (Flowyにするため、控えめに)
          // Stress (neighborCount) が高いほど振動する
          tip.wobblePhase += 0.1;
          const wobbleAmp = cfg.JITTER_STRENGTH * (0.2 + Math.min(1, neighborCount * 0.05));
          tip.heading += Math.sin(tip.wobblePhase) * wobbleAmp;

          // Move
          const oldX = tip.pos.x;
          const oldY = tip.pos.y;
          tip.pos.x += Math.cos(tip.heading) * speed * scale;
          tip.pos.y += Math.sin(tip.heading) * speed * scale;

          // Boundary Wrap
          let wrapped = false;
          if (tip.pos.x < 0 || tip.pos.x > w || tip.pos.y < 0 || tip.pos.y > h) {
             tip.pos.x = wrap(tip.pos.x, 0, w);
             tip.pos.y = wrap(tip.pos.y, 0, h);
             wrapped = true;
          }

          if (!wrapped) {
              // Create Segment
              // アトラクタの影響で太さが変わる (呼吸するように)
              const widthMod = modulation * 2.0; 
              
              const seg: TubeSegment = {
                  id: idCounterRef.current++,
                  x1: oldX,
                  y1: oldY,
                  x2: tip.pos.x,
                  y2: tip.pos.y,
                  hue: tip.hue,
                  width: (cfg.SEGMENT_WIDTH_BASE + widthMod) * scale,
                  opacity: 1.0,
                  age: 0,
                  stressMarker: neighborCount
              };
              newSegments.push(seg);

              // Branching
              // 密度が低いときだけ分岐する (過密防止)
              if (neighborCount < 5 && Math.random() < cfg.BRANCH_PROBABILITY_BASE) {
                  const branchAngle = tip.heading + (Math.random() < 0.5 ? -1 : 1) * cfg.SENSOR_ANGLE;
                  spawnTip(tip.pos.x, tip.pos.y, branchAngle, tip.hue, tip.generation + 1, newTipsBuffer);
              }
          }

          tip.age++;
          if (tip.age > 1500) tip.isDead = true;
      }

      if (newTipsBuffer.length > 0) tipsRef.current.push(...newTipsBuffer);

      // Grid Update & Cleanup
      // パフォーマンスの要: 古いセグメントを効率的に消す
      
      // Add new
      for (const s of newSegments) {
          const idx = segmentsRef.current.push(s) - 1;
          addToGrid(s, idx);
      }

      // Hard Limit (FPS安定化)
      if (segmentsRef.current.length > cfg.SAFETY_SEGMENTS_LIMIT) {
          const removeCount = 200; // 一気に消す
          segmentsRef.current.splice(0, removeCount);
          // Grid再構築はコストが高いので、limitを超えたときだけやる
          gridRef.current.clear();
          segmentsRef.current.forEach((s, i) => addToGrid(s, i));
      }

      // Decay logic
      const survivingSegments: TubeSegment[] = [];
      let rebuildGrid = false;
      
      // 高速化のため、全件走査ではなく一定確率でスキップしてもよいが
      // ここでは opacity でフィルタリング
      const decayBase = cfg.DECAY_RATE * (1.0 + (1.0 - modulation) * 2.0); // アトラクタの値が低いと消えるのが早い

      for (const seg of segmentsRef.current) {
          seg.opacity -= decayBase;
          if (seg.opacity > 0.05) survivingSegments.push(seg);
          else rebuildGrid = true;
      }
      segmentsRef.current = survivingSegments;
      if (rebuildGrid) {
          gridRef.current.clear();
          segmentsRef.current.forEach((s, i) => addToGrid(s, i));
      }

      tipsRef.current = tipsRef.current.filter(t => !t.isDead);

      // Auto-Spawn if too few
      if (tipsRef.current.length < 5) {
          initSimulation(); // Restart fireworks
      }

      // Render
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h); // Clear background

      // Draw Segments (Tubes)
      ctx.lineCap = 'round';
      
      for (const seg of segmentsRef.current) {
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.lineWidth = seg.width;
          
          // Color Logic: アトラクタの影響で色味がシフトする
          const hueShift = modulation * 0.1;
          const hVal = (seg.hue + hueShift) % 1;
          
          // 明度(L)を高めにして "White/Glowing" 感を出す
          const l = 0.6 + (seg.opacity * 0.3);
          const s = 0.4; // 彩度は低めで上品に

          ctx.strokeStyle = hslToRgbString(hVal, s, l, seg.opacity);
          ctx.stroke();
      }

      // Draw Tips (Glowing Heads)
      for (const tip of tipsRef.current) {
          ctx.beginPath();
          ctx.arc(tip.pos.x, tip.pos.y, 2 * scale, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, 0.9)`; // 純白のヘッド
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
        scaleRef.current = Math.max(0.5, Math.min(2.5, Math.sqrt(w*w + h*h) / 1500));
        initSimulation();
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);
    
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
    
    // 花火クリック
    const hue = Math.random();
    for(let i=0; i<8; i++) {
        spawnTip(x, y, (Math.PI * 2 * i) / 8 + Math.random(), hue, 0);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full block"
      />
    </div>
  );
};

export default SimulationCanvas;