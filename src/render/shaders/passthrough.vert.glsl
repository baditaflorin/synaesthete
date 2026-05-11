#version 300 es
precision highp float;

out vec2 vUv;

void main() {
  // Full-screen triangle.
  vec2 p = vec2((gl_VertexID == 2) ? 3.0 : -1.0,
                (gl_VertexID == 1) ?  3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
  // Map clip→uv with V flip so the video isn't upside-down.
  vUv = vec2((p.x + 1.0) * 0.5, 1.0 - (p.y + 1.0) * 0.5);
}
