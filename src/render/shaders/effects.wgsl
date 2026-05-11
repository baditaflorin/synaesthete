// Shared synaesthete fragment shader (WebGPU / WGSL).
// All effect modes live in one shader and a uniform picks the mix; this keeps
// the bind-group layout simple and avoids pipeline switching cost.

struct Uniforms {
  resolution    : vec2<f32>,
  time          : f32,
  effect        : f32,    // 0..4 (see EFFECT_INDEX)
  sensitivity   : f32,
  mirror        : f32,
  loudness      : f32,
  bass          : f32,
  mid           : f32,
  treble        : f32,
  brightness    : f32,
  onset         : f32,
  hit           : f32,
  bloom         : f32,
  chromaHue     : f32,
  _pad          : vec2<f32>,
};

@group(0) @binding(0) var<uniform> u : Uniforms;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var tex  : texture_external;

struct VsOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vi : u32) -> VsOut {
  // Full-screen triangle.
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 3.0,  1.0),
  );
  let xy = p[vi];
  var out : VsOut;
  out.pos = vec4<f32>(xy, 0.0, 1.0);
  // Map clip [-1,1] → uv [0,1], with V flipped so video texture isn't upside-down.
  out.uv = vec2<f32>((xy.x + 1.0) * 0.5, 1.0 - (xy.y + 1.0) * 0.5);
  return out;
}

const PI  : f32 = 3.14159265359;
const TAU : f32 = 6.28318530718;

fn hue2rgb(h: f32) -> vec3<f32> {
  let k = vec3<f32>(0.0, 4.0, 2.0);
  let m = abs((h * 6.0 + k) % 6.0 - 3.0) - 1.0;
  return clamp(m, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  let p = select(vec4<f32>(c.gb, K.wz), vec4<f32>(c.bg, K.xy), c.g < c.b);
  let q = select(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), c.r < p.x);
  let d = q.x - min(q.w, q.y);
  let e = 1.0e-10;
  return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
  return c.z * mix(vec3<f32>(1.0), hue2rgb(c.x), c.y);
}

fn sampleCam(uv: vec2<f32>) -> vec3<f32> {
  let clamped = clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));
  return textureSampleBaseClampToEdge(tex, samp, clamped).rgb;
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
  var uv = in.uv;
  if (u.mirror > 0.5) { uv.x = 1.0 - uv.x; }

  let center = vec2<f32>(0.5, 0.5);
  var p = uv - center;
  let r = length(p);
  var ang = atan2(p.y, p.x);

  let s = u.sensitivity;
  let isCombo  = u.effect > 3.5;
  let isPrism  = u.effect < 0.5 || isCombo;
  let isRipple = (u.effect > 0.5 && u.effect < 1.5) || isCombo;
  let isBloom  = (u.effect > 1.5 && u.effect < 2.5) || isCombo;
  let isKaleid = (u.effect > 2.5 && u.effect < 3.5) || isCombo;

  // Kaleidoscope: chroma argmax (via hue) sets fold count 3..11.
  if (isKaleid) {
    let folds = floor(3.0 + u.chromaHue * 8.0 + 0.5);
    let seg = TAU / folds;
    var a = ang - floor(ang / seg) * seg;
    a = abs(a - seg * 0.5);
    p = vec2<f32>(cos(a), sin(a)) * r;
  }
  var sampleUv = p + center;

  // Ripple: radial sine wave; hit gives a spike, onset modulates amplitude.
  if (isRipple) {
    let amp = (u.onset * 0.04 + u.hit * 0.05) * s;
    let phase = r * 30.0 - u.time * 6.0 - u.hit * 8.0;
    let dir = select(vec2<f32>(0.0, 0.0), p / max(r, 1.0e-4), r > 1.0e-4);
    sampleUv = sampleUv + dir * sin(phase) * amp;
  }

  // Chromatic aberration / prism shift, biased by bass direction.
  let bassDir = vec2<f32>(cos(u.time * 0.7), sin(u.time * 0.9));
  let shiftMag = (u.treble * 0.012 + u.brightness * 0.006 + u.bass * 0.004) * s;
  let shift = bassDir * shiftMag;

  var col : vec3<f32>;
  if (isPrism) {
    let r_ = sampleCam(sampleUv + shift).r;
    let g_ = sampleCam(sampleUv).g;
    let b_ = sampleCam(sampleUv - shift).b;
    col = vec3<f32>(r_, g_, b_);
  } else {
    col = sampleCam(sampleUv);
  }

  // Hue rotation from chroma + brightness.
  var hsv = rgb2hsv(col);
  hsv.x = fract(hsv.x + (u.chromaHue * 0.5 + u.brightness * 0.15) * s);
  hsv.y = clamp(hsv.y + u.loudness * 0.25 * s, 0.0, 1.0);
  hsv.z = clamp(hsv.z + u.bass * 0.10 * s, 0.0, 1.2);
  col = hsv2rgb(hsv);

  // Bass tint — a passing car bending the colors.
  let bassTint = vec3<f32>(0.95, 0.25, 0.55);
  col = col + bassTint * u.bass * 0.18 * s;

  // Bloom — warm gold halo on luminous regions when bloom envelope is up.
  if (isBloom) {
    let lum = dot(col, vec3<f32>(0.2126, 0.7152, 0.0722));
    let glow = pow(clamp(lum, 0.0, 1.0), 2.2) * vec3<f32>(1.0, 0.78, 0.32);
    col = col + glow * u.bloom * 0.7 * s;
  }

  // Onset flash — quick global brighten on transients.
  col = col + vec3<f32>(u.hit) * 0.06 * s;

  // Vignette anchored to loudness so the world feels like it's breathing.
  let vig = smoothstep(0.95, 0.2, r) * (0.85 + u.loudness * 0.15);
  col = col * vig;

  return vec4<f32>(clamp(col, vec3<f32>(0.0), vec3<f32>(1.4)), 1.0);
}
