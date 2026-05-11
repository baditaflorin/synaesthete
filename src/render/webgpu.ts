import wgsl from './shaders/effects.wgsl?raw';
import { UNIFORM_BYTE_SIZE, UNIFORM_FLOAT_COUNT, writeUniforms } from './uniforms';
import type { Renderer, RenderParams } from './types';

export async function tryCreateWebGPURenderer(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): Promise<Renderer | null> {
  if (!('gpu' in navigator) || !navigator.gpu) return null;
  let adapter: GPUAdapter | null = null;
  try {
    adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  if (!adapter) return null;

  let device: GPUDevice;
  try {
    device = await adapter.requestDevice();
  } catch {
    return null;
  }

  const context = canvas.getContext('webgpu');
  if (!context) return null;
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });

  const module = device.createShaderModule({ code: wgsl, label: 'synaesthete-effects' });
  const uniformBuffer = device.createBuffer({
    size: UNIFORM_BYTE_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: 'synaesthete-uniforms',
  });
  const uniformData = new Float32Array(UNIFORM_FLOAT_COUNT);
  const sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {},
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        externalTexture: {},
      },
    ],
  });

  const pipeline = device.createRenderPipeline({
    label: 'synaesthete-pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: { module, entryPoint: 'vs_main' },
    fragment: {
      module,
      entryPoint: 'fs_main',
      targets: [{ format }],
    },
    primitive: { topology: 'triangle-list' },
  });

  let destroyed = false;

  function render(params: RenderParams): void {
    if (destroyed) return;
    if (video.readyState < 2 || video.videoWidth === 0) {
      // Video not ready yet — clear to black to avoid flashing garbage.
      const enc = device.createCommandEncoder();
      const view = context!.getCurrentTexture().createView();
      const pass = enc.beginRenderPass({
        colorAttachments: [
          {
            view,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });
      pass.end();
      device.queue.submit([enc.finish()]);
      return;
    }

    let externalTex: GPUExternalTexture;
    try {
      externalTex = device.importExternalTexture({ source: video });
    } catch {
      // Some browsers throw if the video frame isn't decoded yet.
      return;
    }

    writeUniforms(
      uniformData,
      canvas.width,
      canvas.height,
      params.time,
      params.effect,
      params.sensitivity,
      params.mirror,
      params.features,
    );
    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: sampler },
        { binding: 2, resource: externalTex },
      ],
    });

    const enc = device.createCommandEncoder();
    const view = context!.getCurrentTexture().createView();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([enc.finish()]);
  }

  function resize(width: number, height: number): void {
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
  }

  function destroy(): void {
    destroyed = true;
    try {
      device.destroy();
    } catch {
      /* ignore */
    }
  }

  return { kind: 'webgpu', render, resize, destroy };
}
