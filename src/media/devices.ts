/**
 * Media device acquisition. Camera and microphone are requested separately so a
 * partial denial (e.g. mic-only) still gives us *something* to show.
 */

export interface MediaBundle {
  camera: MediaStream | null;
  mic: MediaStream | null;
  cameraError: string | null;
  micError: string | null;
}

export async function acquireMedia(): Promise<MediaBundle> {
  const [camera, mic] = await Promise.all([acquireCamera(), acquireMic()]);
  return camera.error || mic.error
    ? {
        camera: camera.stream,
        mic: mic.stream,
        cameraError: camera.error,
        micError: mic.error,
      }
    : { camera: camera.stream, mic: mic.stream, cameraError: null, micError: null };
}

interface SingleResult {
  stream: MediaStream | null;
  error: string | null;
}

async function acquireCamera(): Promise<SingleResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: false,
    });
    return { stream, error: null };
  } catch (err) {
    return { stream: null, error: describeMediaError(err, 'camera') };
  }
}

async function acquireMic(): Promise<SingleResult> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
      video: false,
    });
    return { stream, error: null };
  } catch (err) {
    return { stream: null, error: describeMediaError(err, 'microphone') };
  }
}

function describeMediaError(err: unknown, what: string): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return `Permission to use the ${what} was denied. Re-enable it in your browser's site settings to continue.`;
      case 'NotFoundError':
      case 'OverconstrainedError':
        return `No ${what} was found on this device.`;
      case 'NotReadableError':
        return `Your ${what} is in use by another application.`;
      default:
        return `${what} unavailable: ${err.message || err.name}.`;
    }
  }
  return `${what} unavailable.`;
}

export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}
