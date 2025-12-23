// ryuta0201/luminafield/luminaField.../types.ts

export interface Vector {
  x: number;
  y: number;
}

export interface Tip {
  id: number;
  pos: Vector;
  heading: number;
  hue: number;
  energy: number;
  age: number;
  generation: number;
  isDead: boolean;
  interactionStress: number;
  wobblePhase: number;
}

export interface TubeSegment {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  hue: number;
  width: number;
  opacity: number;
  age: number;
  stressMarker: number;
}

// 数学的な変調器のタイプ定義
export type AtmosphereMode = 'LORENZ' | 'SINE_WAVE' | 'ROESSLER' | 'NOISE';

export interface AtmosphereState {
  mode: AtmosphereMode;
  val1: number; // 汎用変数 (x)
  val2: number; // 汎用変数 (y)
  val3: number; // 汎用変数 (z)
  t: number;
}

export interface SimulationConfig {
  // System Limits
  SAFETY_TIPS_LIMIT: number;
  SAFETY_SEGMENTS_LIMIT: number;
  
  // Dynamic Parameters (Base values)
  GROWTH_SPEED: number;
  TURN_SPEED: number;
  ALIGNMENT_FORCE: number; 
  ATTRACTION_FORCE: number;
  REPULSION_FORCE: number;
  
  // Static Configuration
  SENSOR_DIST: number;
  SENSOR_ANGLE: number;
  STRESS_ACCUMULATION: number;
  STRESS_DECAY: number;
  JITTER_STRENGTH: number;      // "Flowy"にするため、これを低く、Noiseを高くする
  BRANCH_PROBABILITY_BASE: number;
  BRANCH_STRESS_MULTIPLIER: number;
  
  // Visuals
  SEGMENT_WIDTH_BASE: number;
  SEGMENT_WIDTH_VAR: number;
  BASE_OPACITY: number;
  DECAY_RATE: number;           // 軌跡が消える速さ
  SAMPLE_RADIUS: number;
}