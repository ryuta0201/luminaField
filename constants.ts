import { SimulationConfig } from './types';

export const CONFIG: SimulationConfig = {
  // System Safety
  SAFETY_TIPS_LIMIT: 400, 
  SAFETY_SEGMENTS_LIMIT: 2000,
  
  // Base Values (Modulated by Oscillators)
  GROWTH_SPEED: 1.5, 
  TURN_SPEED: 0.15,
  
  // Forces: Now mutually exclusive. 
  // These represent the "Peak" strength when the cycle favors them.
  ALIGNMENT_FORCE: 0.15, 
  ATTRACTION_FORCE: 0.08,  
  
  // Repulsion is constant but weak
  REPULSION_FORCE: 0.05,
   
  BRANCH_PROBABILITY_BASE: 0.01, 
  DECAY_RATE: 0.001,

  // Static Configuration
  SENSOR_DIST: 35,
  SENSOR_ANGLE: 0.6,
  
  // Morphology (Character)
  STRESS_ACCUMULATION: 0.05,
  STRESS_DECAY: 0.02,
  JITTER_STRENGTH: 0.5,    
  BRANCH_STRESS_MULTIPLIER: 0.05, 

  // Visuals
  SEGMENT_WIDTH_BASE: 1.0,
  SEGMENT_WIDTH_VAR: 6.0,  
  BASE_OPACITY: 0.6,
  SAMPLE_RADIUS: 12,
};