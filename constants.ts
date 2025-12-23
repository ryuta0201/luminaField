import { SimulationConfig } from './types';

export const CONFIG: SimulationConfig = {
  // System
  NUM_ROOTS: 3,
  ROOT_TIPS_COUNT: 5,
  MAX_SEGMENTS: 3000,
  MAX_TIPS: 150, // Prevents freezing
  
  // Growth / Physics (Base values)
  GROWTH_SPEED: 2.0,
  TURN_SPEED: 0.2,
  SENSOR_ANGLE: 0.7, // Radians (~40 degrees)
  SENSOR_DIST: 30,
  BRANCH_PROBABILITY: 0.015,
  
  // Visuals
  SEGMENT_WIDTH_BASE: 2.0,
  BASE_OPACITY: 0.8,
  DECAY_RATE: 0.002,
  
  // Interaction
  SAMPLE_RADIUS: 10,
};