export interface Vector {
  x: number;
  y: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
}

export interface Agent {
  id: number;
  pos: Vector;
  vel: Vector;
  hue: number; // 0-1
  energy: number; // 0-1
  age: number;
  isDead: boolean;
  trail: TrailPoint[];
  // Metadata for behaviors
  neighborsCount: number;
  mutationFactor: number; // 0 = stable, 1 = volatile
}

export enum SimulationState {
  ACTIVE,
  STAGNANT
}