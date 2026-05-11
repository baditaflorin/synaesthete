import frag from './shaders/effects.glsl?raw';
import vert from './shaders/passthrough.vert.glsl?raw';
import type { Renderer, RenderParams } from './types';
import { EFFECT_INDEX } from './types';

export function tryCreateWebGL2Renderer(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): Renderer | null {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const program = compileProgram(gl, vert, frag);
  if (!program) return null;

  gl.useProgram(program);

  const tex = gl.createTexture();
  if (!tex) return null;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const uTexLoc = gl.getUniformLocation(program, 'uTex');
  if (uTexLoc) gl.uniform1i(uTexLoc, 0);

  const loc = (name: string): WebGLUniformLocation | null => gl.getUniformLocation(program, name);
  const u = {
    resolution: loc('uResolution'),
    time: loc('uTime'),
    effect: loc('uEffect'),
    sensitivity: loc('uSensitivity'),
    mirror: loc('uMirror'),
    loudness: loc('uLoudness'),
    bass: loc('uBass'),
    mid: loc('uMid'),
    treble: loc('uTreble'),
    brightness: loc('uBrightness'),
    onset: loc('uOnset'),
    hit: loc('uHit'),
    bloom: loc('uBloom'),
    chromaHue: loc('uChromaHue'),
  };

  // We don't use vertex buffers — vert shader builds a triangle from gl_VertexID.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  let destroyed = false;
  let lastVideoTime = -1;

  function render(params: RenderParams): void {
    if (destroyed) return;
    if (video.readyState < 2 || video.videoWidth === 0) {
      gl!.clearColor(0, 0, 0, 1);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      return;
    }
    // Only re-upload texture when the video frame advanced — saves CPU on idle.
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      try {
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, video);
      } catch {
        // Some Safari versions throw if the frame isn't ready; skip this frame.
        return;
      }
    }

    gl!.viewport(0, 0, canvas.width, canvas.height);
    if (u.resolution) gl!.uniform2f(u.resolution, canvas.width, canvas.height);
    if (u.time) gl!.uniform1f(u.time, params.time);
    if (u.effect) gl!.uniform1f(u.effect, EFFECT_INDEX[params.effect]);
    if (u.sensitivity) gl!.uniform1f(u.sensitivity, params.sensitivity);
    if (u.mirror) gl!.uniform1f(u.mirror, params.mirror ? 1 : 0);
    const f = params.features;
    if (u.loudness) gl!.uniform1f(u.loudness, f.loudness);
    if (u.bass) gl!.uniform1f(u.bass, f.bass);
    if (u.mid) gl!.uniform1f(u.mid, f.mid);
    if (u.treble) gl!.uniform1f(u.treble, f.treble);
    if (u.brightness) gl!.uniform1f(u.brightness, f.brightness);
    if (u.onset) gl!.uniform1f(u.onset, f.onset);
    if (u.hit) gl!.uniform1f(u.hit, f.hit);
    if (u.bloom) gl!.uniform1f(u.bloom, f.bloom);
    if (u.chromaHue) gl!.uniform1f(u.chromaHue, f.chromaHue);

    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function resize(width: number, height: number): void {
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
  }

  function destroy(): void {
    destroyed = true;
    if (tex) gl!.deleteTexture(tex);
    if (program) gl!.deleteProgram(program);
    if (vao) gl!.deleteVertexArray(vao);
  }

  return { kind: 'webgl2', render, resize, destroy };
}

function compileProgram(
  gl: WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string,
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('WebGL2 program link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function compileShader(gl: WebGL2RenderingContext, kind: GLenum, src: string): WebGLShader | null {
  const sh = gl.createShader(kind);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('Shader compile failed:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}
