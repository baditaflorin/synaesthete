(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(o){if(o.ep)return;o.ep=!0;const i=t(o);fetch(o.href,i)}})();const z=new Float32Array(12);for(let e=0;e<12;e++)z[e]=e/12;class J{ctx;source;analyser;fft;time;prevSpectrum;loudnessS=0;bassS=0;midS=0;trebleS=0;brightnessS=0;onsetS=0;bloomS=0;hitDecay=0;fluxBaseline=0;out;constructor(r,t){this.ctx=r,this.source=t;const n=r.createAnalyser();n.fftSize=2048,n.smoothingTimeConstant=.6,n.minDecibels=-90,n.maxDecibels=-10,t.connect(n),this.analyser=n,this.fft=new Uint8Array(n.frequencyBinCount),this.time=new Uint8Array(n.fftSize),this.prevSpectrum=new Float32Array(n.frequencyBinCount),this.out={loudness:0,bass:0,mid:0,treble:0,brightness:0,onset:0,hit:0,chroma:new Float32Array(12),chromaHue:0,bloom:0,t:0}}read(){const{analyser:r,fft:t,time:n,prevSpectrum:o,out:i}=this;r.getByteFrequencyData(t),r.getByteTimeDomainData(n);let a=0;for(let c=0;c<n.length;c++){const m=(n[c]-128)/128;a+=m*m}const s=Math.sqrt(a/n.length),h=Math.min(1,s*3.5);this.loudnessS=S(this.loudnessS,h,.35);const d=this.ctx.sampleRate*.5/t.length,v=Math.min(t.length,Math.floor(250/d)),b=Math.min(t.length,Math.floor(2e3/d)),f=Math.min(t.length,Math.floor(8e3/d));let u=0,l=0,x=0,E=0,M=0;for(let c=1;c<f;c++){const m=t[c]/255;E+=m,M+=m*c,c<v?u+=m:c<b?l+=m:x+=m}const B=C(u/Math.max(1,v)*1.5),T=C(l/Math.max(1,b-v)*1.6),P=C(x/Math.max(1,f-b)*2.2);this.bassS=S(this.bassS,B,.4),this.midS=S(this.midS,T,.4),this.trebleS=S(this.trebleS,P,.4);const A=E>1e-6?M/E:0,D=C(A/Math.max(1,f));this.brightnessS=S(this.brightnessS,D,.3);let R=0;for(let c=0;c<t.length;c++){const m=t[c]/255,_=m-o[c];_>0&&(R+=_),o[c]=m}R/=t.length,this.fluxBaseline=S(this.fluxBaseline,R,.02);const F=C((R-this.fluxBaseline)*12);this.onsetS=S(this.onsetS,F,.5),F>.45&&this.hitDecay<.1?this.hitDecay=1:this.hitDecay*=.92;const w=i.chroma;w.fill(0);const $=Math.max(1,Math.floor(30/d));for(let c=$;c<b;c++){const m=c*d,_=69+12*Math.log2(m/440),j=(Math.round(_)%12+12)%12;w[j]+=t[c]/255}let O=0,H=0,L=0;for(let c=0;c<12;c++)w[c]>O&&(O=w[c],H=c),L+=w[c];if(L>1e-6){const c=1/L;for(let m=0;m<12;m++)w[m]*=c}i.chromaHue=z[H];const N=C(this.midS*.7+this.brightnessS*.4)*this.loudnessS,Y=N>this.bloomS?.06:.015;return this.bloomS=S(this.bloomS,N,Y),i.loudness=this.loudnessS,i.bass=this.bassS,i.mid=this.midS,i.treble=this.trebleS,i.brightness=this.brightnessS,i.onset=this.onsetS,i.hit=this.hitDecay,i.bloom=this.bloomS,i.t=performance.now(),i}}function C(e){return e<0?0:e>1?1:e}function S(e,r,t){return e+(r-e)*t}async function Z(){const[e,r]=await Promise.all([Q(),ee()]);return e.error||r.error?{camera:e.stream,mic:r.stream,cameraError:e.error,micError:r.error}:{camera:e.stream,mic:r.stream,cameraError:null,micError:null}}async function Q(){try{return{stream:await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"user"},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:60}},audio:!1}),error:null}}catch(e){return{stream:null,error:V(e,"camera")}}}async function ee(){try{return{stream:await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1,channelCount:1},video:!1}),error:null}}catch(e){return{stream:null,error:V(e,"microphone")}}}function V(e,r){if(e instanceof DOMException)switch(e.name){case"NotAllowedError":case"SecurityError":return`Permission to use the ${r} was denied. Re-enable it in your browser's site settings to continue.`;case"NotFoundError":case"OverconstrainedError":return`No ${r} was found on this device.`;case"NotReadableError":return`Your ${r} is in use by another application.`;default:return`${r} unavailable: ${e.message||e.name}.`}return`${r} unavailable.`}function k(e){if(e)for(const r of e.getTracks())r.stop()}const te=`// Shared synaesthete fragment shader (WebGPU / WGSL).
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
`,X={prism:0,ripple:1,bloom:2,kaleido:3,combo:4},K=16,ne=K*4;function re(e,r,t,n,o,i,a,s){e[0]=r,e[1]=t,e[2]=n,e[3]=X[o],e[4]=i,e[5]=a?1:0,e[6]=s.loudness,e[7]=s.bass,e[8]=s.mid,e[9]=s.treble,e[10]=s.brightness,e[11]=s.onset,e[12]=s.hit,e[13]=s.bloom,e[14]=s.chromaHue,e[15]=0}async function ie(e,r){if(!("gpu"in navigator)||!navigator.gpu)return null;let t=null;try{t=await navigator.gpu.requestAdapter({powerPreference:"high-performance"})}catch{return null}if(!t)return null;let n;try{n=await t.requestDevice()}catch{return null}const o=e.getContext("webgpu");if(!o)return null;const i=navigator.gpu.getPreferredCanvasFormat();o.configure({device:n,format:i,alphaMode:"premultiplied"});const a=n.createShaderModule({code:te,label:"synaesthete-effects"}),s=n.createBuffer({size:ne,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"synaesthete-uniforms"}),h=new Float32Array(K),y=n.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"}),g=n.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,externalTexture:{}}]}),d=n.createRenderPipeline({label:"synaesthete-pipeline",layout:n.createPipelineLayout({bindGroupLayouts:[g]}),vertex:{module:a,entryPoint:"vs_main"},fragment:{module:a,entryPoint:"fs_main",targets:[{format:i}]},primitive:{topology:"triangle-list"}});let v=!1;function b(l){if(v)return;if(r.readyState<2||r.videoWidth===0){const P=n.createCommandEncoder(),A=o.getCurrentTexture().createView();P.beginRenderPass({colorAttachments:[{view:A,clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]}).end(),n.queue.submit([P.finish()]);return}let x;try{x=n.importExternalTexture({source:r})}catch{return}re(h,e.width,e.height,l.time,l.effect,l.sensitivity,l.mirror,l.features),n.queue.writeBuffer(s,0,h);const E=n.createBindGroup({layout:g,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:y},{binding:2,resource:x}]}),M=n.createCommandEncoder(),B=o.getCurrentTexture().createView(),T=M.beginRenderPass({colorAttachments:[{view:B,clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});T.setPipeline(d),T.setBindGroup(0,E),T.draw(3),T.end(),n.queue.submit([M.finish()])}function f(l,x){e.width=Math.max(1,Math.floor(l)),e.height=Math.max(1,Math.floor(x))}function u(){v=!0;try{n.destroy()}catch{}}return{kind:"webgpu",render:b,resize:f,destroy:u}}const oe=`#version 300 es
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
`,se=`#version 300 es
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
`;function ae(e,r){const t=e.getContext("webgl2",{alpha:!1,antialias:!1,premultipliedAlpha:!0,preserveDrawingBuffer:!1,powerPreference:"high-performance"});if(!t)return null;const n=ce(t,se,oe);if(!n)return null;t.useProgram(n);const o=t.createTexture();if(!o)return null;t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,o),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR);const i=t.getUniformLocation(n,"uTex");i&&t.uniform1i(i,0);const a=f=>t.getUniformLocation(n,f),s={resolution:a("uResolution"),time:a("uTime"),effect:a("uEffect"),sensitivity:a("uSensitivity"),mirror:a("uMirror"),loudness:a("uLoudness"),bass:a("uBass"),mid:a("uMid"),treble:a("uTreble"),brightness:a("uBrightness"),onset:a("uOnset"),hit:a("uHit"),bloom:a("uBloom"),chromaHue:a("uChromaHue")},h=t.createVertexArray();t.bindVertexArray(h);let y=!1,g=-1;function d(f){if(y)return;if(r.readyState<2||r.videoWidth===0){t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT);return}if(r.currentTime!==g){g=r.currentTime,t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,o);try{t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,r)}catch{return}}t.viewport(0,0,e.width,e.height),s.resolution&&t.uniform2f(s.resolution,e.width,e.height),s.time&&t.uniform1f(s.time,f.time),s.effect&&t.uniform1f(s.effect,X[f.effect]),s.sensitivity&&t.uniform1f(s.sensitivity,f.sensitivity),s.mirror&&t.uniform1f(s.mirror,f.mirror?1:0);const u=f.features;s.loudness&&t.uniform1f(s.loudness,u.loudness),s.bass&&t.uniform1f(s.bass,u.bass),s.mid&&t.uniform1f(s.mid,u.mid),s.treble&&t.uniform1f(s.treble,u.treble),s.brightness&&t.uniform1f(s.brightness,u.brightness),s.onset&&t.uniform1f(s.onset,u.onset),s.hit&&t.uniform1f(s.hit,u.hit),s.bloom&&t.uniform1f(s.bloom,u.bloom),s.chromaHue&&t.uniform1f(s.chromaHue,u.chromaHue),t.drawArrays(t.TRIANGLES,0,3)}function v(f,u){e.width=Math.max(1,Math.floor(f)),e.height=Math.max(1,Math.floor(u))}function b(){y=!0,o&&t.deleteTexture(o),n&&t.deleteProgram(n),h&&t.deleteVertexArray(h)}return{kind:"webgl2",render:d,resize:v,destroy:b}}function ce(e,r,t){const n=G(e,e.VERTEX_SHADER,r),o=G(e,e.FRAGMENT_SHADER,t);if(!n||!o)return null;const i=e.createProgram();return i?(e.attachShader(i,n),e.attachShader(i,o),e.linkProgram(i),e.deleteShader(n),e.deleteShader(o),e.getProgramParameter(i,e.LINK_STATUS)?i:(console.error("WebGL2 program link failed:",e.getProgramInfoLog(i)),e.deleteProgram(i),null)):null}function G(e,r,t){const n=e.createShader(r);return n?(e.shaderSource(n,t),e.compileShader(n),e.getShaderParameter(n,e.COMPILE_STATUS)?n:(console.error("Shader compile failed:",e.getShaderInfoLog(n)),e.deleteShader(n),null)):null}async function le(e,r){const t=await ie(e,r);if(t)return t;const n=ae(e,r);if(n)return n;throw new Error("Neither WebGPU nor WebGL2 is available in this browser — Synaesthete needs one of them.")}const W="synaesthete:prefs:v1",U={effect:"combo",sensitivity:1,mirror:!0};function ue(){try{const e=localStorage.getItem(W);if(!e)return{...U};const r=JSON.parse(e);return{effect:fe(r.effect)??U.effect,sensitivity:me(r.sensitivity,.2,3,U.sensitivity),mirror:typeof r.mirror=="boolean"?r.mirror:U.mirror}}catch{return{...U}}}function q(e){try{localStorage.setItem(W,JSON.stringify(e))}catch{}}function fe(e){return e==="prism"||e==="ripple"||e==="bloom"||e==="kaleido"||e==="combo"?e:null}function me(e,r,t,n){return typeof e=="number"&&Number.isFinite(e)?Math.min(t,Math.max(r,e)):n}const I=[{key:"loudness",label:"loud"},{key:"bass",label:"bass"},{key:"mid",label:"mid"},{key:"treble",label:"treb"},{key:"brightness",label:"bright"},{key:"bloom",label:"bloom"}];function de(e){e.innerHTML="";const r={};for(const n of I){const o=document.createElement("div");o.className="meter";const i=document.createElement("span"),a=document.createElement("em");a.textContent=n.label,a.style.fontStyle="normal";const s=document.createElement("em");s.textContent="0.00",s.style.fontStyle="normal",i.append(a,s);const h=document.createElement("div");h.className="bar";const y=document.createElement("i");h.appendChild(y),o.append(i,h),e.appendChild(o),r[n.key]={bar:y,value:s}}let t=0;return n=>{if(!(n.t-t<50)){t=n.t;for(const o of I){const i=n[o.key],a=r[o.key];a.bar.style.width=`${Math.round(i*100)}%`,a.value.textContent=i.toFixed(2)}}}}function he(e){let r=0,t=performance.now();return()=>{r++;const n=performance.now();if(n-t>=500){const o=r*1e3/(n-t);e.textContent=`${o.toFixed(0)} fps`,r=0,t=n}}}function ve(){return{canvas:p("#stage"),overlay:p("#permission-overlay"),overlayHint:p("#overlay-hint"),startBtn:p("#start-btn"),hud:p("#hud"),hudToggle:p("#hud-toggle"),rendererBadge:p("#renderer-badge"),meters:p("#meters"),effectSelect:p("#effect-select"),sensitivity:p("#sensitivity"),mirror:p("#mirror"),fps:p("#fps"),hint:p("#hint")}}function p(e){const r=document.querySelector(e);if(!r)throw new Error(`Missing element: ${e}`);return r}function pe(e,r){e.effectSelect.value=r.effect,e.sensitivity.value=String(r.sensitivity),e.mirror.checked=r.mirror}async function ge(e,r){e.overlayHint.textContent="Requesting camera + microphone…",e.startBtn.disabled=!0;let t;try{t=await Z()}catch(l){e.overlayHint.textContent=l instanceof Error?l.message:"Could not acquire camera or microphone.",e.startBtn.disabled=!1;return}if(!t.camera&&!t.mic){e.overlayHint.textContent=t.cameraError??t.micError??"Camera and microphone unavailable.",e.startBtn.disabled=!1;return}const n=document.createElement("video");n.muted=!0,n.playsInline=!0,n.autoplay=!0,t.camera?n.srcObject=t.camera:n.srcObject=be();try{await n.play()}catch{}const o=await le(e.canvas,n);e.rendererBadge.textContent=o.kind,e.rendererBadge.classList.add(o.kind==="webgpu"?"ok":"warn");let i=null,a=null;if(t.mic){if(a=new AudioContext({latencyHint:"interactive"}),a.state==="suspended")try{await a.resume()}catch{}const l=a.createMediaStreamSource(t.mic);i=new J(a,l)}const s={loudness:0,bass:0,mid:0,treble:0,brightness:0,onset:0,hit:0,chroma:new Float32Array(12),chromaHue:0,bloom:0,t:0};e.overlay.hidden=!0,e.hud.hidden=!1,t.cameraError?e.hint.textContent="No camera — audio-only mode.":t.micError&&(e.hint.textContent="No mic — visuals are passive.");const h=de(e.meters),y=he(e.fps);let g=r.effect,d=r.sensitivity,v=r.mirror;e.effectSelect.addEventListener("change",()=>{g=e.effectSelect.value,q({effect:g,sensitivity:d,mirror:v})}),e.sensitivity.addEventListener("input",()=>{d=Number(e.sensitivity.value),q({effect:g,sensitivity:d,mirror:v})}),e.mirror.addEventListener("change",()=>{v=e.mirror.checked,q({effect:g,sensitivity:d,mirror:v})}),e.hudToggle.addEventListener("click",()=>{const l=e.hud.classList.toggle("collapsed");e.hudToggle.textContent=l?"+":"−",e.hudToggle.setAttribute("aria-expanded",l?"false":"true")});const b=()=>{const l=Math.min(window.devicePixelRatio||1,2),x=Math.round(e.canvas.clientWidth*l),E=Math.round(e.canvas.clientHeight*l);x>0&&E>0&&o.resize(x,E)};b(),window.addEventListener("resize",b),window.addEventListener("orientationchange",b);const f=performance.now();function u(){const l=i?i.read():s;o.render({features:l,effect:g,sensitivity:d,mirror:v,time:(performance.now()-f)*.001}),h(l),y(),requestAnimationFrame(u)}requestAnimationFrame(u),window.addEventListener("pagehide",()=>{o.destroy(),a&&a.close().catch(()=>{}),k(t.camera),k(t.mic)})}function be(){const e=document.createElement("canvas");e.width=640,e.height=360;const r=e.getContext("2d");return r&&(r.fillStyle="#111",r.fillRect(0,0,e.width,e.height)),e.captureStream(15)}function ye(){const e=ve(),r=ue();pe(e,r),location.protocol!=="https:"&&location.hostname!=="localhost"&&location.hostname!=="127.0.0.1"&&(e.overlayHint.textContent="Camera and microphone require HTTPS. Open the GitHub Pages URL or run via localhost."),e.overlay.hidden=!1,e.startBtn.addEventListener("click",()=>{ge(e,r)})}ye();
