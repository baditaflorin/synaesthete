(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))r(o);new MutationObserver(o=>{for(const i of o)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function t(o){const i={};return o.integrity&&(i.integrity=o.integrity),o.referrerPolicy&&(i.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?i.credentials="include":o.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(o){if(o.ep)return;o.ep=!0;const i=t(o);fetch(o.href,i)}})();const $=new Float32Array(12);for(let e=0;e<12;e++)$[e]=e/12;class ee{ctx;source;analyser;fft;time;prevSpectrum;loudnessS=0;bassS=0;midS=0;trebleS=0;brightnessS=0;onsetS=0;bloomS=0;hitDecay=0;fluxBaseline=0;out;constructor(n,t){this.ctx=n,this.source=t;const r=n.createAnalyser();r.fftSize=2048,r.smoothingTimeConstant=.6,r.minDecibels=-90,r.maxDecibels=-10,t.connect(r),this.analyser=r,this.fft=new Uint8Array(r.frequencyBinCount),this.time=new Uint8Array(r.fftSize),this.prevSpectrum=new Float32Array(r.frequencyBinCount),this.out={loudness:0,bass:0,mid:0,treble:0,brightness:0,onset:0,hit:0,chroma:new Float32Array(12),chromaHue:0,bloom:0,t:0}}read(){const{analyser:n,fft:t,time:r,prevSpectrum:o,out:i}=this;n.getByteFrequencyData(t),n.getByteTimeDomainData(r);let c=0;for(let l=0;l<r.length;l++){const d=(r[l]-128)/128;c+=d*d}const s=Math.sqrt(c/r.length),v=Math.min(1,s*3.5);this.loudnessS=U(this.loudnessS,v,.35);const g=this.ctx.sampleRate*.5/t.length,b=Math.min(t.length,Math.floor(250/g)),x=Math.min(t.length,Math.floor(2e3/g)),f=Math.min(t.length,Math.floor(8e3/g));let m=0,y=0,M=0,h=0,C=0;for(let l=1;l<f;l++){const d=t[l]/255;h+=d,C+=d*l,l<b?m+=d:l<x?y+=d:M+=d}const B=L(m/Math.max(1,b)*1.5),T=L(y/Math.max(1,x-b)*1.6),A=L(M/Math.max(1,f-x)*2.2);this.bassS=U(this.bassS,B,.4),this.midS=U(this.midS,T,.4),this.trebleS=U(this.trebleS,A,.4);const P=h>1e-6?C/h:0,a=L(P/Math.max(1,f));this.brightnessS=U(this.brightnessS,a,.3);let u=0;for(let l=0;l<t.length;l++){const d=t[l]/255,k=d-o[l];k>0&&(u+=k),o[l]=d}u/=t.length,this.fluxBaseline=U(this.fluxBaseline,u,.02);const S=L((u-this.fluxBaseline)*12);this.onsetS=U(this.onsetS,S,.5),S>.45&&this.hitDecay<.1?this.hitDecay=1:this.hitDecay*=.92;const R=i.chroma;R.fill(0);const _=Math.max(1,Math.floor(30/g));for(let l=_;l<x;l++){const d=l*g,k=69+12*Math.log2(d/440),Q=(Math.round(k)%12+12)%12;R[Q]+=t[l]/255}let F=0,q=0,D=0;for(let l=0;l<12;l++)R[l]>F&&(F=R[l],q=l),D+=R[l];if(D>1e-6){const l=1/D;for(let d=0;d<12;d++)R[d]*=l}i.chromaHue=$[q];const H=L(this.midS*.7+this.brightnessS*.4)*this.loudnessS,Z=H>this.bloomS?.06:.015;return this.bloomS=U(this.bloomS,H,Z),i.loudness=this.loudnessS,i.bass=this.bassS,i.mid=this.midS,i.treble=this.trebleS,i.brightness=this.brightnessS,i.onset=this.onsetS,i.hit=this.hitDecay,i.bloom=this.bloomS,i.t=performance.now(),i}}function L(e){return e<0?0:e>1?1:e}function U(e,n,t){return e+(n-e)*t}async function te(){const[e,n]=await Promise.all([ne(),re()]);return e.error||n.error?{camera:e.stream,mic:n.stream,cameraError:e.error,micError:n.error}:{camera:e.stream,mic:n.stream,cameraError:null,micError:null}}async function ne(){try{return{stream:await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"user"},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:60}},audio:!1}),error:null}}catch(e){return{stream:null,error:z(e,"camera")}}}async function re(){try{return{stream:await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1,channelCount:1},video:!1}),error:null}}catch(e){return{stream:null,error:z(e,"microphone")}}}function z(e,n){if(e instanceof DOMException)switch(e.name){case"NotAllowedError":case"SecurityError":return`Permission to use the ${n} was denied. Re-enable it in your browser's site settings to continue.`;case"NotFoundError":case"OverconstrainedError":return`No ${n} was found on this device.`;case"NotReadableError":return`Your ${n} is in use by another application.`;default:return`${n} unavailable: ${e.message||e.name}.`}return`${n} unavailable.`}function N(e){if(e)for(const n of e.getTracks())n.stop()}const ie=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];class oe{canvas;micTrack;fps;mime;recorder=null;chunks=[];startedAt=0;state;constructor(n){this.canvas=n.canvas,this.micTrack=n.micTrack,this.fps=n.fps??30,this.mime=se(),this.state=this.mime?"idle":"unavailable"}get isAvailable(){return this.state!=="unavailable"}start(){if(this.state!=="idle"||!this.mime)return;const n=this.canvas.captureStream(this.fps),t=new MediaStream(n.getVideoTracks());this.micTrack&&t.addTrack(this.micTrack),this.chunks=[],this.recorder=new MediaRecorder(t,{mimeType:this.mime}),this.recorder.ondataavailable=r=>{r.data&&r.data.size>0&&this.chunks.push(r.data)},this.recorder.onerror=r=>{console.error("MediaRecorder error",r),this.state="idle"},this.recorder.start(1e3),this.startedAt=performance.now(),this.state="recording"}async stop(){if(this.state!=="recording"||!this.recorder)return null;const n=this.recorder,t=new Promise(s=>{n.onstop=()=>s()});n.stop(),await t;const r=new Blob(this.chunks,{type:this.mime??"video/webm"});this.recorder=null,this.state="idle";const o=performance.now()-this.startedAt,i=URL.createObjectURL(r),c=`synaesthete-${ae()}.webm`;return ce(i,c),setTimeout(()=>URL.revokeObjectURL(i),6e4),{url:i,filename:c,bytes:r.size,durationMs:o}}elapsedSeconds(){return this.state==="recording"?(performance.now()-this.startedAt)/1e3:0}}function se(){if(typeof MediaRecorder>"u")return null;for(const e of ie)try{if(MediaRecorder.isTypeSupported(e))return e}catch{}return null}function ae(){const e=new Date,n=t=>String(t).padStart(2,"0");return`${e.getFullYear()}${n(e.getMonth()+1)}${n(e.getDate())}-${n(e.getHours())}${n(e.getMinutes())}${n(e.getSeconds())}`}function ce(e,n){const t=document.createElement("a");t.href=e,t.download=n,t.rel="noopener",document.body.appendChild(t),t.click(),t.remove()}const le=`// Shared synaesthete fragment shader (WebGPU / WGSL).
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
`,V={prism:0,ripple:1,bloom:2,kaleido:3,combo:4},K=16,ue=K*4;function fe(e,n,t,r,o,i,c,s){e[0]=n,e[1]=t,e[2]=r,e[3]=V[o],e[4]=i,e[5]=c?1:0,e[6]=s.loudness,e[7]=s.bass,e[8]=s.mid,e[9]=s.treble,e[10]=s.brightness,e[11]=s.onset,e[12]=s.hit,e[13]=s.bloom,e[14]=s.chromaHue,e[15]=0}async function me(e,n){if(!("gpu"in navigator)||!navigator.gpu)return null;let t=null;try{t=await navigator.gpu.requestAdapter({powerPreference:"high-performance"})}catch{return null}if(!t)return null;let r;try{r=await t.requestDevice()}catch{return null}const o=e.getContext("webgpu");if(!o)return null;const i=navigator.gpu.getPreferredCanvasFormat();o.configure({device:r,format:i,alphaMode:"premultiplied"});const c=r.createShaderModule({code:le,label:"synaesthete-effects"}),s=r.createBuffer({size:ue,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"synaesthete-uniforms"}),v=new Float32Array(K),w=r.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"}),E=r.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,externalTexture:{}}]}),g=r.createRenderPipeline({label:"synaesthete-pipeline",layout:r.createPipelineLayout({bindGroupLayouts:[E]}),vertex:{module:c,entryPoint:"vs_main"},fragment:{module:c,entryPoint:"fs_main",targets:[{format:i}]},primitive:{topology:"triangle-list"}});let b=!1;function x(y){if(b)return;if(n.readyState<2||n.videoWidth===0){const A=r.createCommandEncoder(),P=o.getCurrentTexture().createView();A.beginRenderPass({colorAttachments:[{view:P,clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]}).end(),r.queue.submit([A.finish()]);return}let M;try{M=r.importExternalTexture({source:n})}catch{return}fe(v,e.width,e.height,y.time,y.effect,y.sensitivity,y.mirror,y.features),r.queue.writeBuffer(s,0,v);const h=r.createBindGroup({layout:E,entries:[{binding:0,resource:{buffer:s}},{binding:1,resource:w},{binding:2,resource:M}]}),C=r.createCommandEncoder(),B=o.getCurrentTexture().createView(),T=C.beginRenderPass({colorAttachments:[{view:B,clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});T.setPipeline(g),T.setBindGroup(0,h),T.draw(3),T.end(),r.queue.submit([C.finish()])}function f(y,M){e.width=Math.max(1,Math.floor(y)),e.height=Math.max(1,Math.floor(M))}function m(){b=!0;try{r.destroy()}catch{}}return{kind:"webgpu",render:x,resize:f,destroy:m}}const de=`#version 300 es
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
`,he=`#version 300 es
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
`;function pe(e,n){const t=e.getContext("webgl2",{alpha:!1,antialias:!1,premultipliedAlpha:!0,preserveDrawingBuffer:!1,powerPreference:"high-performance"});if(!t)return null;const r=ve(t,he,de);if(!r)return null;t.useProgram(r);const o=t.createTexture();if(!o)return null;t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,o),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR);const i=t.getUniformLocation(r,"uTex");i&&t.uniform1i(i,0);const c=f=>t.getUniformLocation(r,f),s={resolution:c("uResolution"),time:c("uTime"),effect:c("uEffect"),sensitivity:c("uSensitivity"),mirror:c("uMirror"),loudness:c("uLoudness"),bass:c("uBass"),mid:c("uMid"),treble:c("uTreble"),brightness:c("uBrightness"),onset:c("uOnset"),hit:c("uHit"),bloom:c("uBloom"),chromaHue:c("uChromaHue")},v=t.createVertexArray();t.bindVertexArray(v);let w=!1,E=-1;function g(f){if(w)return;if(n.readyState<2||n.videoWidth===0){t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT);return}if(n.currentTime!==E){E=n.currentTime,t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,o);try{t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,n)}catch{return}}t.viewport(0,0,e.width,e.height),s.resolution&&t.uniform2f(s.resolution,e.width,e.height),s.time&&t.uniform1f(s.time,f.time),s.effect&&t.uniform1f(s.effect,V[f.effect]),s.sensitivity&&t.uniform1f(s.sensitivity,f.sensitivity),s.mirror&&t.uniform1f(s.mirror,f.mirror?1:0);const m=f.features;s.loudness&&t.uniform1f(s.loudness,m.loudness),s.bass&&t.uniform1f(s.bass,m.bass),s.mid&&t.uniform1f(s.mid,m.mid),s.treble&&t.uniform1f(s.treble,m.treble),s.brightness&&t.uniform1f(s.brightness,m.brightness),s.onset&&t.uniform1f(s.onset,m.onset),s.hit&&t.uniform1f(s.hit,m.hit),s.bloom&&t.uniform1f(s.bloom,m.bloom),s.chromaHue&&t.uniform1f(s.chromaHue,m.chromaHue),t.drawArrays(t.TRIANGLES,0,3)}function b(f,m){e.width=Math.max(1,Math.floor(f)),e.height=Math.max(1,Math.floor(m))}function x(){w=!0,o&&t.deleteTexture(o),r&&t.deleteProgram(r),v&&t.deleteVertexArray(v)}return{kind:"webgl2",render:g,resize:b,destroy:x}}function ve(e,n,t){const r=O(e,e.VERTEX_SHADER,n),o=O(e,e.FRAGMENT_SHADER,t);if(!r||!o)return null;const i=e.createProgram();return i?(e.attachShader(i,r),e.attachShader(i,o),e.linkProgram(i),e.deleteShader(r),e.deleteShader(o),e.getProgramParameter(i,e.LINK_STATUS)?i:(console.error("WebGL2 program link failed:",e.getProgramInfoLog(i)),e.deleteProgram(i),null)):null}function O(e,n,t){const r=e.createShader(n);return r?(e.shaderSource(r,t),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error("Shader compile failed:",e.getShaderInfoLog(r)),e.deleteShader(r),null)):null}async function ge(e,n){const t=await me(e,n);if(t)return t;const r=pe(e,n);if(r)return r;throw new Error("Neither WebGPU nor WebGL2 is available in this browser — Synaesthete needs one of them.")}const X="synaesthete:prefs:v1",be={effect:"combo",sensitivity:1,mirror:!0};function W(){const e=ye(),n=Se();return{...be,...e,...n}}function Y(e){xe(e),Ee(e)}function ye(){try{const e=localStorage.getItem(X);if(!e)return{};const n=JSON.parse(e);return j(n)}catch{return{}}}function xe(e){try{localStorage.setItem(X,JSON.stringify(e))}catch{}}function Se(){if(!location.hash||location.hash.length<2)return{};const e=new URLSearchParams(location.hash.slice(1)),n={},t=e.get("e");if(t){const i=J(t);i&&(n.effect=i)}const r=e.get("s");if(r!==null){const i=Number(r);Number.isFinite(i)&&(n.sensitivity=i)}const o=e.get("m");return o!==null&&(n.mirror=o==="1"||o==="true"),j(n)}function Ee(e){const n=new URLSearchParams;n.set("e",e.effect),n.set("s",e.sensitivity.toFixed(2)),n.set("m",e.mirror?"1":"0");const t=`#${n.toString()}`;location.hash!==t&&history.replaceState(null,"",`${location.pathname}${location.search}${t}`)}function j(e){const n={};if(e.effect!==void 0){const t=J(e.effect);t&&(n.effect=t)}return typeof e.sensitivity=="number"&&Number.isFinite(e.sensitivity)&&(n.sensitivity=Math.min(3,Math.max(.2,e.sensitivity))),typeof e.mirror=="boolean"&&(n.mirror=e.mirror),n}function J(e){return e==="prism"||e==="ripple"||e==="bloom"||e==="kaleido"||e==="combo"?e:null}const G=[{key:"loudness",label:"loud"},{key:"bass",label:"bass"},{key:"mid",label:"mid"},{key:"treble",label:"treb"},{key:"brightness",label:"bright"},{key:"bloom",label:"bloom"}];function we(e){e.innerHTML="";const n={};for(const r of G){const o=document.createElement("div");o.className="meter";const i=document.createElement("span"),c=document.createElement("em");c.textContent=r.label,c.style.fontStyle="normal";const s=document.createElement("em");s.textContent="0.00",s.style.fontStyle="normal",i.append(c,s);const v=document.createElement("div");v.className="bar";const w=document.createElement("i");v.appendChild(w),o.append(i,v),e.appendChild(o),n[r.key]={bar:w,value:s}}let t=0;return r=>{if(!(r.t-t<50)){t=r.t;for(const o of G){const i=r[o.key],c=n[o.key];c.bar.style.width=`${Math.round(i*100)}%`,c.value.textContent=i.toFixed(2)}}}}function Te(e){let n=0,t=performance.now();return()=>{n++;const r=performance.now();if(r-t>=500){const o=n*1e3/(r-t);e.textContent=`${o.toFixed(0)} fps`,n=0,t=r}}}const Me=["prism","ripple","bloom","kaleido","combo"];function Ce(){return{canvas:p("#stage"),overlay:p("#permission-overlay"),overlayHint:p("#overlay-hint"),startBtn:p("#start-btn"),hud:p("#hud"),hudToggle:p("#hud-toggle"),rendererBadge:p("#renderer-badge"),meters:p("#meters"),effectSelect:p("#effect-select"),sensitivity:p("#sensitivity"),mirror:p("#mirror"),recordBtn:p("#record-btn"),shareBtn:p("#share-btn"),fps:p("#fps"),hint:p("#hint")}}function p(e){const n=document.querySelector(e);if(!n)throw new Error(`Missing element: ${e}`);return n}function Re(e,n){e.effectSelect.value=n.effect,e.sensitivity.value=String(n.sensitivity),e.mirror.checked=n.mirror}async function Ue(e,n){e.overlayHint.textContent="Requesting camera + microphone…",e.startBtn.disabled=!0;let t;try{t=await te()}catch(a){e.overlayHint.textContent=a instanceof Error?a.message:"Could not acquire camera or microphone.",e.startBtn.disabled=!1;return}if(!t.camera&&!t.mic){e.overlayHint.textContent=t.cameraError??t.micError??"Camera and microphone unavailable.",e.startBtn.disabled=!1;return}const r=document.createElement("video");r.muted=!0,r.playsInline=!0,r.autoplay=!0,t.camera?r.srcObject=t.camera:r.srcObject=Ae();try{await r.play()}catch{}const o=await ge(e.canvas,r);e.rendererBadge.textContent=o.kind,e.rendererBadge.classList.add(o.kind==="webgpu"?"ok":"warn");let i=null,c=null;if(t.mic){if(c=new AudioContext({latencyHint:"interactive"}),c.state==="suspended")try{await c.resume()}catch{}const a=c.createMediaStreamSource(t.mic);i=new ee(c,a)}const s={loudness:0,bass:0,mid:0,treble:0,brightness:0,onset:0,hit:0,chroma:new Float32Array(12),chromaHue:0,bloom:0,t:0};e.overlay.hidden=!0,e.hud.hidden=!1,t.cameraError?e.hint.textContent="No camera — audio-only mode.":t.micError&&(e.hint.textContent="No mic — visuals are passive.");const v=we(e.meters),w=Te(e.fps);let E=n.effect,g=n.sensitivity,b=n.mirror;const x=()=>Y({effect:E,sensitivity:g,mirror:b}),f=a=>{a!==E&&(E=a,e.effectSelect.value=a,x())},m=a=>{const u=Math.min(3,Math.max(.2,a));u!==g&&(g=u,e.sensitivity.value=String(u),x())},y=a=>{a!==b&&(b=a,e.mirror.checked=a,x())};e.effectSelect.addEventListener("change",()=>f(e.effectSelect.value)),e.sensitivity.addEventListener("input",()=>m(Number(e.sensitivity.value))),e.mirror.addEventListener("change",()=>y(e.mirror.checked)),e.hudToggle.addEventListener("click",()=>I(e));const M=t.mic?.getAudioTracks()[0]??null,h=new oe({canvas:e.canvas,micTrack:M});h.isAvailable||(e.recordBtn.disabled=!0,e.recordBtn.title="Recording is not supported in this browser.");const C=()=>{const a=e.recordBtn.querySelector(".label");if(h.state==="recording"){const u=Math.floor(h.elapsedSeconds());a&&(a.textContent=`Stop ${String(Math.floor(u/60)).padStart(2,"0")}:${String(u%60).padStart(2,"0")}`),e.recordBtn.setAttribute("aria-pressed","true")}else a&&(a.textContent="Record"),e.recordBtn.setAttribute("aria-pressed","false")},B=async()=>{if(h.isAvailable)if(h.state==="recording"){const a=await h.stop();if(C(),a){const u=Math.round(a.durationMs/1e3);e.hint.textContent=`Saved ${a.filename} (${u}s, ${Be(a.bytes)})`}}else h.start(),C(),e.hint.textContent=""};e.recordBtn.addEventListener("click",()=>{B()}),e.shareBtn.addEventListener("click",()=>{x();const a=location.href,u=()=>{e.hint.textContent="Copy from address bar — clipboard blocked."};navigator.clipboard?.writeText?navigator.clipboard.writeText(a).then(()=>{e.hint.textContent="Share link copied to clipboard."},u):u()}),window.addEventListener("keydown",a=>{if(a.metaKey||a.ctrlKey||a.altKey)return;const u=a.target;if(u&&/^(INPUT|SELECT|TEXTAREA)$/.test(u.tagName))return;const S=a.key.toLowerCase();if(S>="1"&&S<="5"){a.preventDefault();const R=Number(S)-1,_=Me[R];_&&f(_);return}if(S==="h"){a.preventDefault(),I(e);return}if(S==="m"){a.preventDefault(),y(!b);return}if(S==="r"){a.preventDefault(),B();return}S==="?"&&(a.preventDefault(),e.hint.textContent="1-5 effect · H hud · M mirror · R record")});const T=()=>{const a=Math.min(window.devicePixelRatio||1,2),u=Math.round(e.canvas.clientWidth*a),S=Math.round(e.canvas.clientHeight*a);u>0&&S>0&&o.resize(u,S)};T(),window.addEventListener("resize",T),window.addEventListener("orientationchange",T),window.addEventListener("hashchange",()=>{const a=W();f(a.effect),m(a.sensitivity),y(a.mirror)});const A=performance.now();function P(){const a=i?i.read():s;o.render({features:a,effect:E,sensitivity:g,mirror:b,time:(performance.now()-A)*.001}),v(a),h.state==="recording"&&C(),w(),requestAnimationFrame(P)}requestAnimationFrame(P),window.addEventListener("pagehide",()=>{h.stop().catch(()=>{}),o.destroy(),c&&c.close().catch(()=>{}),N(t.camera),N(t.mic)})}function I(e){const n=e.hud.classList.toggle("collapsed");e.hudToggle.textContent=n?"+":"−",e.hudToggle.setAttribute("aria-expanded",n?"false":"true")}function Be(e){return e<1024?`${e} B`:e<1024*1024?`${(e/1024).toFixed(0)} KB`:`${(e/1024/1024).toFixed(1)} MB`}function Ae(){const e=document.createElement("canvas");e.width=640,e.height=360;const n=e.getContext("2d");return n&&(n.fillStyle="#111",n.fillRect(0,0,e.width,e.height)),e.captureStream(15)}function Pe(){const e=Ce(),n=W();Re(e,n),Y(n),location.protocol!=="https:"&&location.hostname!=="localhost"&&location.hostname!=="127.0.0.1"&&(e.overlayHint.textContent="Camera and microphone require HTTPS. Open the GitHub Pages URL or run via localhost."),e.overlay.hidden=!1,e.startBtn.addEventListener("click",()=>{Ue(e,n)})}Pe();
