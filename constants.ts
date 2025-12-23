export const CONFIG = {
  // Visuals (Base values, to be scaled by screen size)
  TRAIL_LENGTH_BASE: 30,
  AGENT_RADIUS_BASE: 2,
  TRAIL_WIDTH_BASE: 1.5,
  BASE_OPACITY: 0.6,
  
  // Physics & Neighborhood (Base values)
  NEIGHBOR_RADIUS_BASE: 80, 
  IDEAL_NEIGHBORS_MIN: 3,
  IDEAL_NEIGHBORS_MAX: 10,
  CROWD_LIMIT: 25, // Higher crowd limit for clustering
  
  // Movement
  MAX_SPEED_BASE: 2.0,
  FRICTION: 0.92,
  WANDER_STRENGTH: 0.1,
  REPULSION_FORCE: 0.15,
  ALIGNMENT_FORCE: 0.06, // Steer same direction as neighbors
  COHESION_FORCE: 0.008, // Steer towards neighbors (clustering)
  
  // Life Cycle
  AGE_DECAY: 0, // Disable age-based energy loss
  ENERGY_GAIN_RATE: 0.005, // Fast recovery in groups
  ENERGY_LOSS_RATE: 0.003, // Slow loss when alone
  DEATH_CHANCE_BASE: 0.0001, // 1 in 10,000 frames (~3 mins at 60fps)
  DEATH_CHANCE_STAGNANT: 0.0005,
  MAX_AGE: 15000, // ~4 minutes
  
  // Stagnation
  STAGNATION_VELOCITY_THRESHOLD: 0.3,
  STAGNATION_FRAMES_TRIGGER: 600,
  
  // Mutation
  MUTATION_CHANCE: 0.05,
  MUTATION_SEVERITY: 0.5,
};