// ryuta0201/luminafield/luminaField.../utils/atmosphere.ts
import { AtmosphereState, AtmosphereMode } from '../types';

// 初期化：ランダムな数式モデルを選択
export const initAtmosphere = (): AtmosphereState => {
  const modes: AtmosphereMode[] = ['LORENZ', 'ROESSLER', 'SINE_WAVE'];
  const picked = modes[Math.floor(Math.random() * modes.length)];
  
  return {
    mode: picked,
    val1: 0.1,
    val2: 0,
    val3: 0,
    t: 0
  };
};

// 状態を1ステップ進める (dt = タイムステップ)
// 返り値: 0.0 ~ 1.0 に正規化された「影響係数 (intensity)」
export const updateAtmosphere = (state: AtmosphereState, dt: number = 0.01): number => {
  state.t += dt;
  let output = 0;

  switch (state.mode) {
    case 'LORENZ':
      // Lorenz Attractor Constants
      const sigma = 10;
      const rho = 28;
      const beta = 8/3;
      
      const dx = sigma * (state.val2 - state.val1);
      const dy = state.val1 * (rho - state.val3) - state.val2;
      const dz = state.val1 * state.val2 - beta * state.val3;

      state.val1 += dx * dt * 0.5; // 少し遅くする
      state.val2 += dy * dt * 0.5;
      state.val3 += dz * dt * 0.5;
      
      // Lorenzのxはおおよそ -20 ~ 20 なので 0~1に正規化
      output = (state.val1 + 20) / 40;
      break;

    case 'ROESSLER':
      // Rössler Attractor
      const a = 0.2;
      const b = 0.2;
      const c = 5.7;

      const rdx = -state.val2 - state.val3;
      const rdy = state.val1 + a * state.val2;
      const rdz = b + state.val3 * (state.val1 - c);

      state.val1 += rdx * dt * 0.5;
      state.val2 += rdy * dt * 0.5;
      state.val3 += rdz * dt * 0.5;

      // 正規化 (-10 ~ 10 approx)
      output = (state.val2 + 10) / 20;
      break;

    case 'SINE_WAVE':
      // 複数の波を合成して複雑な周期を作る
      state.val1 = Math.sin(state.t * 0.5) * 0.5 + 0.5;
      state.val2 = Math.cos(state.t * 0.2) * 0.5 + 0.5;
      output = (state.val1 + state.val2) / 2;
      break;
  }

  // Clamp 0-1
  return Math.max(0, Math.min(1, output));
};

// 現在のモードの記述テキスト
export const getAtmosphereDescription = (state: AtmosphereState): string[] => {
  const modeName = state.mode.charAt(0) + state.mode.slice(1).toLowerCase();
  return [modeName + " Attractor", `t: ${state.t.toFixed(1)}`];
};