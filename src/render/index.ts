import { tryCreateWebGPURenderer } from './webgpu';
import { tryCreateWebGL2Renderer } from './webgl2';
import type { Renderer } from './types';

export async function createRenderer(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): Promise<Renderer> {
  const gpu = await tryCreateWebGPURenderer(canvas, video);
  if (gpu) return gpu;
  const gl = tryCreateWebGL2Renderer(canvas, video);
  if (gl) return gl;
  throw new Error(
    'Neither WebGPU nor WebGL2 is available in this browser — Synaesthete needs one of them.',
  );
}

export type { Renderer, RenderParams, EffectMode } from './types';
