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
  // Morphology / History state
  interactionStress: number; // 0-1, accumulates when interacting
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
  stressMarker: number; // Stored stress level at creation
}

export interface SimulationConfig {
  // System
  NUM_ROOTS: number;
  ROOT_TIPS_COUNT: number;
  MAX_SEGMENTS: number;
  MAX_TIPS: number;
  
  // Physics / Behavior
  GROWTH_SPEED: number;
  TURN_SPEED: number;
  SENSOR_DIST: number;
  SENSOR_ANGLE: number; // Used for branching angle mainly
  
  // Relational Dynamics
  ALIGNMENT_FORCE: number; // Tendency to flow with others
  ATTRACTION_FORCE: number; // Tendency to move towards others (curiosity)
  REPULSION_FORCE: number; // Personal space
  
  // Morphology (Character)
  STRESS_ACCUMULATION: number; // How fast interactions change the tube form
  STRESS_DECAY: number; // How fast it relaxes back to straight/thin
  JITTER_STRENGTH: number; // How much stress causes wobbly movement
  BRANCH_PROBABILITY_BASE: number;
  BRANCH_STRESS_MULTIPLIER: number; // Stressed tubes branch more

  // Visuals
  SEGMENT_WIDTH_BASE: number;
  SEGMENT_WIDTH_VAR: number; // How much stress expands the width
  BASE_OPACITY: number;
  DECAY_RATE: number;
  
  // Interaction
  SAMPLE_RADIUS: number;
}

export enum SimulationState {
  ACTIVE,
  STAGNANT
}