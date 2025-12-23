export interface Vector {
  x: number;
  y: number;
}

export interface Tip {
  id: number;
  pos: Vector;
  heading: number; // Radians
  hue: number; // 0-1
  energy: number; // 0-1
  age: number;
  generation: number;
  isDead: boolean;
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
}

export interface SimulationConfig {
  // System
  NUM_ROOTS: number;
  ROOT_TIPS_COUNT: number;
  MAX_SEGMENTS: number;
  MAX_TIPS: number;
  
  // Growth / Physics
  GROWTH_SPEED: number;
  TURN_SPEED: number;
  SENSOR_ANGLE: number;
  SENSOR_DIST: number;
  BRANCH_PROBABILITY: number;
  
  // Visuals
  SEGMENT_WIDTH_BASE: number;
  BASE_OPACITY: number;
  DECAY_RATE: number;
  
  // Interaction
  SAMPLE_RADIUS: number; // Physics radius for collision/density
}

// Keep generic State enum
export enum SimulationState {
  ACTIVE,
  STAGNANT
}