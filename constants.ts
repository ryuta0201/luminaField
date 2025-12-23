import { SimulationConfig } from './types';

export const CONFIG: SimulationConfig = {
  // System
  NUM_ROOTS: 5,
  ROOT_TIPS_COUNT: 3,
  MAX_SEGMENTS: 4000,
  MAX_TIPS: 100,
  
  // Physics / Behavior
  GROWTH_SPEED: 1.5, // Slower, more deliberate
  TURN_SPEED: 0.15,
  SENSOR_DIST: 40,
  SENSOR_ANGLE: 0.8,
  
  // Relational Dynamics
  ALIGNMENT_FORCE: 0.08,   // Flow together
  ATTRACTION_FORCE: 0.02,  // Gentle curiosity
  REPULSION_FORCE: 0.25,   // Avoid direct collision
  
  // Morphology (Character)
  STRESS_ACCUMULATION: 0.05,
  STRESS_DECAY: 0.01,
  JITTER_STRENGTH: 0.4,    // High jitter capability for "character"
  BRANCH_PROBABILITY_BASE: 0.005, // Low base branching
  BRANCH_STRESS_MULTIPLIER: 0.04, // Stress triggers branching reactions

  // Visuals
  SEGMENT_WIDTH_BASE: 1.5,
  SEGMENT_WIDTH_VAR: 4.0,  // Stress makes tubes significantly thicker/knottier
  BASE_OPACITY: 0.7,
  DECAY_RATE: 0.0005, // Very slow decay for long-term history
  
  // Interaction
  SAMPLE_RADIUS: 15,
};