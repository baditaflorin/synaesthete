#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uEffect;
uniform float uSensitivity;
uniform float uMirror;
uniform float uLoudness;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uBrightness;
uniform float uOnset;
uniform float uHit;
uniform float uBloom;
uniform float uChromaHue;
uniform sampler2D uTex;

in vec2 vUv;
out vec4 outColor;

const float PI  = 3.14159265359;
const float TAU = 6.28318530718;

vec3 hue2rgb(float h) {
  vec3 k = vec3(0.0, 4.0, 2.0);
  vec3 m = abs(mod(h * 6.0 + k, 6.0) - 3.0) - 1.0;
  return clamp(m, 0.0, 1.0);
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  return c.z * mix(vec3(1.0), hue2rgb(c.x), c.y);
}

vec3 sampleCam(vec2 uv) {
  return texture(uTex, clamp(uv, 0.0, 1.0)).rgb;
}

void main() {
  vec2 uv = vUv;
  if (uMirror > 0.5) uv.x = 1.0 - uv.x;

  vec2 center = vec2(0.5);
  vec2 p = uv - center;
  float r = length(p);
  float ang = atan(p.y, p.x);

  float s = uSensitivity;
  bool isCombo  = uEffect > 3.5;
  bool isPrism  = uEffect < 0.5 || isCombo;
  bool isRipple = (uEffect > 0.5 && uEffect < 1.5) || isCombo;
  bool isBloom  = (uEffect > 1.5 && uEffect < 2.5) || isCombo;
  bool isKaleid = (uEffect > 2.5 && uEffect < 3.5) || isCombo;

  if (isKaleid) {
    float folds = floor(3.0 + uChromaHue * 8.0 + 0.5);
    float seg = TAU / folds;
    float a = ang - floor(ang / seg) * seg;
    a = abs(a - seg * 0.5);
    p = vec2(cos(a), sin(a)) * r;
  }
  vec2 sampleUv = p + center;

  if (isRipple) {
    float amp = (uOnset * 0.04 + uHit * 0.05) * s;
    float phase = r * 30.0 - uTime * 6.0 - uHit * 8.0;
    vec2 dir = r > 1.0e-4 ? p / r : vec2(0.0);
    sampleUv += dir * sin(phase) * amp;
  }

  vec2 bassDir = vec2(cos(uTime * 0.7), sin(uTime * 0.9));
  float shiftMag = (uTreble * 0.012 + uBrightness * 0.006 + uBass * 0.004) * s;
  vec2 shift = bassDir * shiftMag;

  vec3 col;
  if (isPrism) {
    float r_ = sampleCam(sampleUv + shift).r;
    float g_ = sampleCam(sampleUv).g;
    float b_ = sampleCam(sampleUv - shift).b;
    col = vec3(r_, g_, b_);
  } else {
    col = sampleCam(sampleUv);
  }

  vec3 hsv = rgb2hsv(col);
  hsv.x = fract(hsv.x + (uChromaHue * 0.5 + uBrightness * 0.15) * s);
  hsv.y = clamp(hsv.y + uLoudness * 0.25 * s, 0.0, 1.0);
  hsv.z = clamp(hsv.z + uBass * 0.10 * s, 0.0, 1.2);
  col = hsv2rgb(hsv);

  vec3 bassTint = vec3(0.95, 0.25, 0.55);
  col += bassTint * uBass * 0.18 * s;

  if (isBloom) {
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    vec3 glow = pow(clamp(lum, 0.0, 1.0), 2.2) * vec3(1.0, 0.78, 0.32);
    col += glow * uBloom * 0.7 * s;
  }

  col += vec3(uHit) * 0.06 * s;

  float vig = smoothstep(0.95, 0.2, r) * (0.85 + uLoudness * 0.15);
  col *= vig;

  outColor = vec4(clamp(col, 0.0, 1.4), 1.0);
}
