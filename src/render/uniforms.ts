import type { AudioFeatures } from '../audio/features';
import { EFFECT_INDEX, type EffectMode } from './types';

/**
 * Pack the per-frame parameters into a 16-float buffer matching the WGSL
 * `Uniforms` struct (which std140-style requires 16-byte alignment).
 *
 * Layout (floats):
 *   0  resolution.x
 *   1  resolution.y
 *   2  time
 *   3  effect
 *   4  sensitivity
 *   5  mirror
 *   6  loudness
 *   7  bass
 *   8  mid
 *   9  treble
 *  10  brightness
 *  11  onset
 *  12  hit
 *  13  bloom
 *  14  chromaHue
 *  15  pad
 */
export const UNIFORM_FLOAT_COUNT = 16;
export const UNIFORM_BYTE_SIZE = UNIFORM_FLOAT_COUNT * 4;

export function writeUniforms(
  buf: Float32Array,
  width: number,
  height: number,
  time: number,
  effect: EffectMode,
  sensitivity: number,
  mirror: boolean,
  f: AudioFeatures,
): void {
  buf[0] = width;
  buf[1] = height;
  buf[2] = time;
  buf[3] = EFFECT_INDEX[effect];
  buf[4] = sensitivity;
  buf[5] = mirror ? 1 : 0;
  buf[6] = f.loudness;
  buf[7] = f.bass;
  buf[8] = f.mid;
  buf[9] = f.treble;
  buf[10] = f.brightness;
  buf[11] = f.onset;
  buf[12] = f.hit;
  buf[13] = f.bloom;
  buf[14] = f.chromaHue;
  buf[15] = 0;
}
