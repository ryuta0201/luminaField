import { Vector } from '../types';

export const dist = (v1: Vector, v2: Vector): number => {
  const dx = v1.x - v2.x;
  const dy = v1.y - v2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const distSq = (v1: Vector, v2: Vector): number => {
  const dx = v1.x - v2.x;
  const dy = v1.y - v2.y;
  return dx * dx + dy * dy;
};

// Circular mean for hues (0-1)
export const averageHue = (hues: number[]): number => {
  if (hues.length === 0) return Math.random();
  
  let x = 0;
  let y = 0;
  for (const h of hues) {
    const angle = h * Math.PI * 2;
    x += Math.cos(angle);
    y += Math.sin(angle);
  }
  
  let avgAngle = Math.atan2(y, x);
  if (avgAngle < 0) avgAngle += Math.PI * 2;
  return avgAngle / (Math.PI * 2);
};

export const wrap = (val: number, min: number, max: number): number => {
  if (val < min) return max;
  if (val > max) return min;
  return val;
};

export const clamp = (val: number, min: number, max: number): number => Math.min(Math.max(val, min), max);

export const hslToRgbString = (h: number, s: number, l: number, a: number = 1) => {
  return `hsla(${h * 360}, ${s * 100}%, ${l * 100}%, ${a})`;
};