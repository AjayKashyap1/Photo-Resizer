import {
  LoadedVideoItem,
  ProcessedVideoResult,
  VideoPreset,
  VideoProcessingConfig,
} from '../types';

export const VIDEO_PRESETS: VideoPreset[] = [
  {
    id: 'hd_1080p',
    name: '1080p Full HD',
    ratioLabel: '16:9',
    width: 1920,
    height: 1080,
    description: 'YouTube / Desktop Widescreen',
  },
  {
    id: 'hd_720p',
    name: '720p HD',
    ratioLabel: '16:9',
    width: 1280,
    height: 720,
    description: 'Standard Web & Streaming',
  },
  {
    id: 'sd_480p',
    name: '480p SD',
    ratioLabel: '16:9',
    width: 854,
    height: 480,
    description: 'Fast Share / Compact Size',
  },
  {
    id: 'reels_1080',
    name: 'Reels / Shorts',
    ratioLabel: '9:16',
    width: 1080,
    height: 1920,
    description: 'Instagram Reels, YouTube Shorts',
  },
  {
    id: 'reels_720',
    name: 'Vertical 720p',
    ratioLabel: '9:16',
    width: 720,
    height: 1280,
    description: 'WhatsApp Status / Light Reels',
  },
  {
    id: 'square_1080',
    name: 'Square Feed',
    ratioLabel: '1:1',
    width: 1080,
    height: 1080,
    description: 'Instagram / LinkedIn Square',
  },
  {
    id: 'portrait_4_5',
    name: 'Portrait 4:5',
    ratioLabel: '4:5',
    width: 1080,
    height: 1350,
    description: 'Instagram Portrait Post',
  },
  {
    id: 'compact_360p',
    name: '360p Compact',
    ratioLabel: '16:9',
    width: 640,
    height: 360,
    description: 'Ultra-small email & form uploads',
  },
];

export interface SupportedVideoFormatOption {
  mimeType: string;
  label: string;
  extension: string;
}

export function getSupportedVideoFormats(): SupportedVideoFormatOption[] {
  const candidates: SupportedVideoFormatOption[] = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', label: 'MP4 (H.264)', extension: 'mp4' },
    { mimeType: 'video/mp4', label: 'MP4 (Standard)', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', label: 'WebM (VP9 High Efficiency)', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', label: 'WebM (VP8 Fast)', extension: 'webm' },
    { mimeType: 'video/webm', label: 'WebM (Universal)', extension: 'webm' },
  ];

  if (typeof MediaRecorder === 'undefined') {
    return [{ mimeType: 'video/webm', label: 'WebM', extension: 'webm' }];
  }

  const supported = candidates.filter((c) => {
    try {
      return MediaRecorder.isTypeSupported(c.mimeType);
    } catch {
      return false;
    }
  });

  // Deduplicate MP4/WebM labels neatly while keeping distinct codecs
  const seen = new Set<string>();
  const unique: SupportedVideoFormatOption[] = [];
  for (const item of supported) {
    if (!seen.has(item.label)) {
      seen.add(item.label);
      unique.push(item);
    }
  }

  return unique.length > 0
    ? unique
    : [{ mimeType: 'video/webm', label: 'WebM (Default)', extension: 'webm' }];
}

export function getExtensionForMimeType(mimeType: string): string {
  return mimeType.toLowerCase().includes('mp4') ? 'mp4' : 'webm';
}

export function createDefaultVideoConfig(video?: LoadedVideoItem): VideoProcessingConfig {
  const supported = getSupportedVideoFormats();
  const preferredFormat = supported[0]?.mimeType || 'video/webm';
  const duration = video ? video.duration : 10;

  return {
    width: video ? video.width : 1280,
    height: video ? video.height : 720,
    maintainAspectRatio: true,
    fitMode: 'contain',
    backgroundColor: '#000000',
    fps: 30,
    sizeControlMode: 'target_size',
    videoBitrateKbps: 2500,
    targetFileSizeValue: video
      ? Math.max(0.5, Number(((video.size / (1024 * 1024)) * 0.5).toFixed(1)))
      : 2,
    targetFileSizeUnit: 'MB',
    includeAudio: true,
    audioBitrateKbps: 96,
    mimeType: preferredFormat,
    trimStart: 0,
    trimEnd: Number(duration.toFixed(2)),
  };
}

export interface VideoBitrateCalculation {
  videoBitsPerSecond: number;
  audioBitsPerSecond: number;
  estimatedBytes: number;
  effectiveDuration: number;
  isExtremeCompression: boolean;
}

/**
 * Computes precise video and audio bitrates to match a target file size (MB or KB)
 * or estimates output file size from manual bitrate settings.
 */
export function calculateVideoBitrate(
  config: VideoProcessingConfig,
  totalDuration: number
): VideoBitrateCalculation {
  const start = Math.max(0, config.trimStart || 0);
  const end =
    config.trimEnd && config.trimEnd > start
      ? Math.min(totalDuration, config.trimEnd)
      : totalDuration;
  const effectiveDuration = Math.max(0.5, end - start);

  if (config.sizeControlMode === 'target_size') {
    const rawTarget = Math.max(0.05, config.targetFileSizeValue || 1);
    const targetBytes =
      config.targetFileSizeUnit === 'MB' ? rawTarget * 1024 * 1024 : rawTarget * 1024;

    // Leave ~10% headroom for WebM/MP4 muxer & VBR peaks
    const totalBitsPerSecond = (targetBytes * 8 * 0.9) / effectiveDuration;

    let audioBitsPerSecond = 0;
    if (config.includeAudio) {
      const requestedAudio = Math.max(32, config.audioBitrateKbps || 96) * 1000;
      // Never let audio consume more than 25% of the total target budget
      audioBitsPerSecond = Math.round(Math.min(requestedAudio, totalBitsPerSecond * 0.25));
      if (audioBitsPerSecond < 24_000) audioBitsPerSecond = 24_000;
    }

    const rawVideoBps = totalBitsPerSecond - audioBitsPerSecond;
    const minSafeVideoBps = 75_000; // 75 kbps floor
    const videoBitsPerSecond = Math.max(minSafeVideoBps, Math.round(rawVideoBps));
    const isExtremeCompression = rawVideoBps < 200_000;

    const estimatedBytes = Math.round(
      ((videoBitsPerSecond + audioBitsPerSecond) * effectiveDuration) / 8 / 0.92
    );

    return {
      videoBitsPerSecond,
      audioBitsPerSecond,
      estimatedBytes,
      effectiveDuration,
      isExtremeCompression,
    };
  }

  // Manual bitrate mode
  const videoBitsPerSecond = Math.max(100_000, Math.round((config.videoBitrateKbps || 2000) * 1000));
  const audioBitsPerSecond = config.includeAudio
    ? Math.max(32_000, Math.round((config.audioBitrateKbps || 96) * 1000))
    : 0;
  const estimatedBytes = Math.round(
    ((videoBitsPerSecond + audioBitsPerSecond) * effectiveDuration) / 8 * 1.05
  );

  return {
    videoBitsPerSecond,
    audioBitsPerSecond,
    estimatedBytes,
    effectiveDuration,
    isExtremeCompression: videoBitsPerSecond < 250_000,
  };
}

/**
 * Loads a video File/Blob and extracts its intrinsic pixel dimensions, duration, and preview thumbnail.
 */
export function extractVideoMetadata(
  file: File | Blob,
  name: string
): Promise<LoadedVideoItem> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanupError = (msg: string) => {
      URL.revokeObjectURL(url);
      reject(new Error(msg));
    };

    video.onerror = () => cleanupError('Could not decode video file. Please try MP4 or WebM.');

    video.onloadedmetadata = () => {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const finalize = (durationVal: number) => {
        const safeDuration = Number.isFinite(durationVal) && durationVal > 0 ? durationVal : 5;
        // Capture quick thumbnail frame
        video.currentTime = Math.min(0.2, safeDuration / 3);
        video.onseeked = () => {
          let thumbnailUrl: string | undefined;
          try {
            const thumbCanvas = document.createElement('canvas');
            const scale = Math.min(1, 320 / Math.max(width, height));
            thumbCanvas.width = Math.max(1, Math.round(width * scale));
            thumbCanvas.height = Math.max(1, Math.round(height * scale));
            const ctx = thumbCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, thumbCanvas.width, thumbCanvas.height);
              thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);
            }
          } catch {
            // Thumbnail is optional
          }

          resolve({
            id: 'vid_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            name,
            url,
            file,
            width,
            height,
            duration: safeDuration,
            size: file.size,
            mimeType: file.type || 'video/mp4',
            thumbnailUrl,
          });
        };
      };

      // Chrome WebM MediaRecorder files sometimes report Infinity duration initially
      if (!Number.isFinite(video.duration) || video.duration === 0) {
        video.currentTime = 1e6;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          const resolvedDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : video.currentTime || 5;
          video.currentTime = 0;
          finalize(resolvedDuration);
        };
      } else {
        finalize(video.duration);
      }
    };
  });
}

/**
 * Generates a crisp 5-second 1280x720 demo video directly in the browser using Canvas + MediaRecorder
 * so users can immediately test dimension editing & target file size compression.
 */
export async function generateDemoVideo(): Promise<LoadedVideoItem> {
  const width = 1280;
  const height = 720;
  const durationSec = 5;
  const fps = 30;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const formats = getSupportedVideoFormats();
  const mimeType = formats[0]?.mimeType || 'video/webm';
  const ext = getExtensionForMimeType(mimeType);

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_500_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error('Failed to synthesize demo video'));
  });

  recorder.start(200);

  const startTime = performance.now();
  await new Promise<void>((resolve) => {
    const drawFrame = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(1, elapsed / durationSec);

      // Deep slate studio backdrop
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Architectural grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Animated geometric accent ribbon
      const cx = width / 2 + Math.cos(progress * Math.PI * 2) * 260;
      const cy = height / 2 + Math.sin(progress * Math.PI * 4) * 90;

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(cx, cy, 88, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 180 + Math.sin(progress * Math.PI * 2) * 25, 0, Math.PI * 2);
      ctx.stroke();

      // Safe framing guides
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(48, 48, width - 96, height - 96);

      // Crisp studio typography
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 44px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DEMO STUDIO CLIP · 1280 × 720', width / 2, height / 2 - 12);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 24px "JetBrains Mono", monospace';
      ctx.fillText(
        `TIME ${elapsed.toFixed(2)}s / ${durationSec.toFixed(2)}s  ·  30 FPS`,
        width / 2,
        height / 2 + 34
      );

      // Bottom progress bar
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(140, height - 96, width - 280, 12);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(140, height - 96, (width - 280) * progress, 12);

      if (elapsed < durationSec) {
        requestAnimationFrame(drawFrame);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(drawFrame);
  });

  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());

  const blob = await recordingDone;
  return extractVideoMetadata(blob, `sample_studio_720p.${ext}`);
}

export interface VideoProcessProgress {
  percent: number;
  currentTime: number;
  totalDuration: number;
  frameCount: number;
}

/**
 * Resizes video dimensions and re-encodes at exact calculated bitrate to hit target file size.
 * Runs 100% client-side using HTML5 Canvas + MediaRecorder + Web Audio routing.
 */
export async function processVideo(
  sourceVideo: LoadedVideoItem,
  config: VideoProcessingConfig,
  onProgress?: (progress: VideoProcessProgress) => void,
  signal?: AbortSignal
): Promise<ProcessedVideoResult> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder API is not supported in this browser.');
  }

  const isMp4 = config.mimeType.toLowerCase().includes('mp4');
  // Ensure even dimensions for H.264/MP4 compatibility, exact >= 2px for all codecs
  const targetW = isMp4
    ? Math.max(2, Math.round(config.width / 2) * 2)
    : Math.max(2, Math.round(config.width));
  const targetH = isMp4
    ? Math.max(2, Math.round(config.height / 2) * 2)
    : Math.max(2, Math.round(config.height));

  const calc = calculateVideoBitrate(config, sourceVideo.duration);
  const startSec = Math.max(0, Math.min(sourceVideo.duration - 0.1, config.trimStart || 0));
  const endSec = Math.max(
    startSec + 0.2,
    Math.min(sourceVideo.duration, config.trimEnd || sourceVideo.duration)
  );
  const effectiveDuration = endSec - startSec;

  const video = document.createElement('video');
  video.src = sourceVideo.url;
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.preload = 'auto';
  // Keep video unmuted internally when routing through Web Audio, otherwise muted
  video.muted = !config.includeAudio;

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load source video for processing.'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const canvasStream = canvas.captureStream(config.fps || 30);
  const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

  let audioCtx: AudioContext | null = null;
  if (config.includeAudio) {
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        const sourceNode = audioCtx.createMediaElementSource(video);
        const destNode = audioCtx.createMediaStreamDestination();
        // Route only to recorder destination (silent processing, no echo in speakers)
        sourceNode.connect(destNode);
        const audioTracks = destNode.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedTracks.push(...audioTracks);
        }
      }
    } catch (err) {
      console.warn('Audio capture skipped (source may have no audio track):', err);
      video.muted = true;
    }
  }

  const combinedStream = new MediaStream(combinedTracks);

  let selectedMime = config.mimeType;
  if (!MediaRecorder.isTypeSupported(selectedMime)) {
    selectedMime = getSupportedVideoFormats()[0]?.mimeType || 'video/webm';
  }

  const recorderOptions: MediaRecorderOptions = {
    mimeType: selectedMime,
    videoBitsPerSecond: calc.videoBitsPerSecond,
  };
  if (config.includeAudio && calc.audioBitsPerSecond > 0) {
    recorderOptions.audioBitsPerSecond = calc.audioBitsPerSecond;
  }

  const recorder = new MediaRecorder(combinedStream, recorderOptions);
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // Helper to paint current frame with contain / cover / stretch framing
  const paintFrame = () => {
    const srcW = video.videoWidth || sourceVideo.width;
    const srcH = video.videoHeight || sourceVideo.height;
    const srcAspect = srcW / Math.max(1, srcH);
    const dstAspect = targetW / Math.max(1, targetH);

    ctx.fillStyle = config.backgroundColor || '#000000';
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (config.fitMode === 'cover') {
      let sx = 0;
      let sy = 0;
      let sw = srcW;
      let sh = srcH;
      if (srcAspect > dstAspect) {
        sw = srcH * dstAspect;
        sx = (srcW - sw) / 2;
      } else {
        sh = srcW / dstAspect;
        sy = (srcH - sh) / 2;
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
    } else if (config.fitMode === 'contain') {
      const scale = Math.min(targetW / srcW, targetH / srcH);
      const dw = srcW * scale;
      const dh = srcH * scale;
      const dx = (targetW - dw) / 2;
      const dy = (targetH - dh) / 2;
      ctx.drawImage(video, dx, dy, dw, dh);
    } else {
      // Stretch exact dimensions
      ctx.drawImage(video, 0, 0, targetW, targetH);
    }
  };

  // Seek to trimStart before recording
  video.currentTime = startSec;
  await new Promise<void>((resolve) => {
    const onSeek = () => {
      video.removeEventListener('seeked', onSeek);
      resolve();
    };
    video.addEventListener('seeked', onSeek);
  });

  // Paint initial frame immediately
  paintFrame();

  return new Promise<ProcessedVideoResult>((resolve, reject) => {
    let rafId = 0;
    let frameCount = 0;
    let stopped = false;

    const cleanup = () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      try {
        video.pause();
      } catch {
        // ignore
      }
      combinedStream.getTracks().forEach((t) => t.stop());
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };

    const finishRecording = () => {
      if (stopped) return;
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      video.pause();
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    };

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          cleanup();
          if (recorder.state !== 'inactive') {
            try {
              recorder.stop();
            } catch {
              // ignore
            }
          }
          reject(new Error('Video processing cancelled'));
        },
        { once: true }
      );
    }

    recorder.onerror = () => {
      cleanup();
      reject(new Error('Video encoder encountered an error during recording.'));
    };

    recorder.onstop = () => {
      if (signal?.aborted) return;
      cleanup();
      const outputBlob = new Blob(chunks, { type: selectedMime });
      const outputUrl = URL.createObjectURL(outputBlob);
      const ext = getExtensionForMimeType(selectedMime);

      onProgress?.({
        percent: 100,
        currentTime: effectiveDuration,
        totalDuration: effectiveDuration,
        frameCount,
      });

      resolve({
        blob: outputBlob,
        url: outputUrl,
        width: targetW,
        height: targetH,
        size: outputBlob.size,
        duration: effectiveDuration,
        mimeType: selectedMime,
        extension: ext,
        appliedVideoBitrateKbps: Math.round(calc.videoBitsPerSecond / 1000),
      });
    };

    video.onended = () => finishRecording();

    const tick = () => {
      if (stopped) return;
      paintFrame();
      frameCount += 1;

      const elapsed = Math.max(0, video.currentTime - startSec);
      const percent = Math.min(99, Math.round((elapsed / effectiveDuration) * 100));

      onProgress?.({
        percent,
        currentTime: elapsed,
        totalDuration: effectiveDuration,
        frameCount,
      });

      if (video.currentTime >= endSec - 0.03 || video.ended) {
        finishRecording();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    recorder.start(250);
    video
      .play()
      .then(() => {
        rafId = requestAnimationFrame(tick);
      })
      .catch((err) => {
        cleanup();
        reject(new Error('Could not start video playback for encoding: ' + err.message));
      });
  });
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
}
