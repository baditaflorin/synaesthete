/**
 * Records the live canvas + microphone into a WebM blob the user can download.
 * Picks the best supported codec at construction time; falls back to whatever
 * the browser will let us instantiate.
 */

const CANDIDATE_MIMES: readonly string[] = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export interface RecorderOpts {
  canvas: HTMLCanvasElement;
  micTrack: MediaStreamTrack | null;
  fps?: number;
}

export type RecorderState = 'idle' | 'recording' | 'unavailable';

export class CanvasRecorder {
  private readonly canvas: HTMLCanvasElement;
  private readonly micTrack: MediaStreamTrack | null;
  private readonly fps: number;
  private readonly mime: string | null;

  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  state: RecorderState;

  constructor(opts: RecorderOpts) {
    this.canvas = opts.canvas;
    this.micTrack = opts.micTrack;
    this.fps = opts.fps ?? 30;
    this.mime = pickMime();
    this.state = this.mime ? 'idle' : 'unavailable';
  }

  /** True if the browser exposes MediaRecorder + a usable WebM codec. */
  get isAvailable(): boolean {
    return this.state !== 'unavailable';
  }

  start(): void {
    if (this.state !== 'idle' || !this.mime) return;
    const videoStream = this.canvas.captureStream(this.fps);
    const combined = new MediaStream(videoStream.getVideoTracks());
    if (this.micTrack) combined.addTrack(this.micTrack);

    this.chunks = [];
    this.recorder = new MediaRecorder(combined, { mimeType: this.mime });
    this.recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) this.chunks.push(ev.data);
    };
    this.recorder.onerror = (ev) => {
      console.error('MediaRecorder error', ev);
      this.state = 'idle';
    };
    this.recorder.start(1000); // flush a chunk every second
    this.startedAt = performance.now();
    this.state = 'recording';
  }

  /** Stop, assemble the blob, and trigger a browser download. */
  async stop(): Promise<{
    url: string;
    filename: string;
    bytes: number;
    durationMs: number;
  } | null> {
    if (this.state !== 'recording' || !this.recorder) return null;
    const r = this.recorder;
    const stopped = new Promise<void>((resolve) => {
      r.onstop = () => resolve();
    });
    r.stop();
    await stopped;
    const blob = new Blob(this.chunks, { type: this.mime ?? 'video/webm' });
    this.recorder = null;
    this.state = 'idle';
    const durationMs = performance.now() - this.startedAt;

    const url = URL.createObjectURL(blob);
    const filename = `synaesthete-${stamp()}.webm`;
    triggerDownload(url, filename);
    // Free the blob URL after the download completes — Safari needs a tick.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return { url, filename, bytes: blob.size, durationMs };
  }

  /** Wall-clock seconds since recording started; 0 when idle. */
  elapsedSeconds(): number {
    return this.state === 'recording' ? (performance.now() - this.startedAt) / 1000 : 0;
  }
}

function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of CANDIDATE_MIMES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* keep trying */
    }
  }
  return null;
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
