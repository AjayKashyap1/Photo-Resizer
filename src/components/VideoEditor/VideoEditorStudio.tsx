import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  LoadedVideoItem,
  ProcessedVideoResult,
  VideoFitMode,
  VideoProcessingConfig,
  FileSizeUnit,
} from '../../types';
import {
  VIDEO_PRESETS,
  getSupportedVideoFormats,
  createDefaultVideoConfig,
  calculateVideoBitrate,
  extractVideoMetadata,
  generateDemoVideo,
  processVideo,
  formatDuration,
  VideoProcessProgress,
} from '../../utils/videoProcessor';
import { formatBytes } from '../../utils/imageProcessor';
import { downloadBlob } from '../../utils/zipExporter';
import { historyLogger } from '../../utils/historyLogger';
import {
  Video,
  Upload,
  Sparkles,
  Lock,
  Unlock,
  ArrowLeftRight,
  RotateCcw,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  HardDrive,
  Sliders,
  X,
  Film,
  TrendingDown,
} from 'lucide-react';

interface VideoEditorStudioProps {
  lang: 'en' | 'hi';
  loadedVideo: LoadedVideoItem | null;
  onVideoLoaded: (video: LoadedVideoItem | null) => void;
}

export const VideoEditorStudio: React.FC<VideoEditorStudioProps> = ({
  lang,
  loadedVideo,
  onVideoLoaded,
}) => {
  const supportedFormats = useMemo(() => getSupportedVideoFormats(), []);
  const [config, setConfig] = useState<VideoProcessingConfig>(() =>
    createDefaultVideoConfig(loadedVideo || undefined)
  );

  // Local text drafts so users can freely clear/retype manual pixel dimensions & target size
  const [widthDraft, setWidthDraft] = useState<string>(String(config.width));
  const [heightDraft, setHeightDraft] = useState<string>(String(config.height));
  const [targetSizeDraft, setTargetSizeDraft] = useState<string>(String(config.targetFileSizeValue));

  // Upload & demo generation state
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Live preview playback state
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<VideoProcessProgress | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedVideoResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync config when a new video is loaded
  useEffect(() => {
    if (loadedVideo) {
      const nextCfg = createDefaultVideoConfig(loadedVideo);
      setConfig(nextCfg);
      setWidthDraft(String(nextCfg.width));
      setHeightDraft(String(nextCfg.height));
      setTargetSizeDraft(String(nextCfg.targetFileSizeValue));
      setResult(null);
      setProcessError(null);
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [loadedVideo?.id]);

  // Revoke processed output URL on cleanup/replacement
  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result?.url]);

  const bitrateCalc = useMemo(() => {
    if (!loadedVideo) return null;
    return calculateVideoBitrate(config, loadedVideo.duration);
  }, [config, loadedVideo]);

  const handleVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setLoadError(
        lang === 'hi'
          ? 'कृपया एक वैध वीडियो फ़ाइल (MP4, WebM, MOV) चुनें।'
          : 'Please select a valid video file (MP4, WebM, MOV, MKV).'
      );
      return;
    }

    setLoadError(null);
    setIsLoadingVideo(true);
    try {
      const meta = await extractVideoMetadata(file, file.name);
      onVideoLoaded(meta);
      historyLogger.log(
        'info',
        'video',
        'Video Imported',
        `Loaded "${meta.name}" (${meta.width}×${meta.height}px, ${formatDuration(meta.duration)}, ${formatBytes(meta.size)}).`
      );
    } catch (err: any) {
      setLoadError(err.message || 'Failed to read video metadata.');
      historyLogger.log('error', 'video', 'Video Load Failed', err.message || file.name);
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const handleGenerateDemo = async () => {
    setLoadError(null);
    setIsLoadingVideo(true);
    try {
      const demo = await generateDemoVideo();
      onVideoLoaded(demo);
      historyLogger.log(
        'info',
        'video',
        'Demo Video Created',
        `Generated 5s 1280×720 studio clip (${formatBytes(demo.size)}) for testing.`
      );
    } catch (err: any) {
      setLoadError(err.message || 'Could not generate demo video in this browser.');
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const handleWidthInput = (raw: string) => {
    setWidthDraft(raw);
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 16) return;
    const clampedW = Math.min(3840, parsed);
    if (config.maintainAspectRatio && loadedVideo) {
      const ratio = loadedVideo.width / Math.max(1, loadedVideo.height);
      const nextH = Math.max(16, Math.min(3840, Math.round(clampedW / ratio)));
      setHeightDraft(String(nextH));
      setConfig((prev) => ({ ...prev, width: clampedW, height: nextH }));
    } else {
      setConfig((prev) => ({ ...prev, width: clampedW }));
    }
  };

  const handleHeightInput = (raw: string) => {
    setHeightDraft(raw);
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 16) return;
    const clampedH = Math.min(3840, parsed);
    if (config.maintainAspectRatio && loadedVideo) {
      const ratio = loadedVideo.width / Math.max(1, loadedVideo.height);
      const nextW = Math.max(16, Math.min(3840, Math.round(clampedH * ratio)));
      setWidthDraft(String(nextW));
      setConfig((prev) => ({ ...prev, width: nextW, height: clampedH }));
    } else {
      setConfig((prev) => ({ ...prev, height: clampedH }));
    }
  };

  const handleBlurDimensions = () => {
    setWidthDraft(String(config.width));
    setHeightDraft(String(config.height));
  };

  const handleSwapDimensions = () => {
    const nextW = config.height;
    const nextH = config.width;
    setWidthDraft(String(nextW));
    setHeightDraft(String(nextH));
    setConfig((prev) => ({
      ...prev,
      width: nextW,
      height: nextH,
      maintainAspectRatio: false,
    }));
  };

  const handleResetOriginalDimensions = () => {
    if (!loadedVideo) return;
    setWidthDraft(String(loadedVideo.width));
    setHeightDraft(String(loadedVideo.height));
    setConfig((prev) => ({
      ...prev,
      width: loadedVideo.width,
      height: loadedVideo.height,
      maintainAspectRatio: true,
    }));
  };

  const handleApplyPreset = (presetW: number, presetH: number) => {
    setWidthDraft(String(presetW));
    setHeightDraft(String(presetH));
    setConfig((prev) => ({
      ...prev,
      width: presetW,
      height: presetH,
      maintainAspectRatio: false,
    }));
  };

  const handleTargetSizeInput = (raw: string) => {
    setTargetSizeDraft(raw);
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setConfig((prev) => ({
      ...prev,
      sizeControlMode: 'target_size',
      targetFileSizeValue: parsed,
    }));
  };

  const handleQuickTargetSize = (val: number, unit: FileSizeUnit) => {
    setTargetSizeDraft(String(val));
    setConfig((prev) => ({
      ...prev,
      sizeControlMode: 'target_size',
      targetFileSizeValue: val,
      targetFileSizeUnit: unit,
    }));
  };

  const togglePlay = () => {
    const v = previewVideoRef.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < config.trimStart || v.currentTime >= config.trimEnd) {
        v.currentTime = config.trimStart;
      }
      v.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleProcessVideo = async () => {
    if (!loadedVideo || isProcessing) return;

    // Pause preview while rendering
    if (previewVideoRef.current && !previewVideoRef.current.paused) {
      previewVideoRef.current.pause();
      setIsPlaying(false);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsProcessing(true);
    setProcessError(null);
    setResult(null);
    setProgress({
      percent: 0,
      currentTime: 0,
      totalDuration: Math.max(0.5, config.trimEnd - config.trimStart),
      frameCount: 0,
    });

    const startTime = performance.now();
    historyLogger.log(
      'info',
      'video',
      'Video Render Started',
      `Resizing "${loadedVideo.name}" to ${config.width}×${config.height}px (${config.fitMode}, ${
        config.sizeControlMode === 'target_size'
          ? `Target ${config.targetFileSizeValue} ${config.targetFileSizeUnit}`
          : `${config.videoBitrateKbps} kbps`
      }).`
    );

    try {
      const processed = await processVideo(
        loadedVideo,
        config,
        (prog) => setProgress(prog),
        controller.signal
      );

      const durationMs = Math.round(performance.now() - startTime);
      setResult(processed);

      const savedBytes = Math.max(0, loadedVideo.size - processed.size);
      historyLogger.log(
        'success',
        'video',
        'Video Rendered Successfully',
        `Exported ${processed.width}×${processed.height}px (${formatBytes(processed.size)}) in ${(
          durationMs / 1000
        ).toFixed(1)}s at ${processed.appliedVideoBitrateKbps} kbps.`,
        {
          dimensions: `${processed.width}x${processed.height}`,
          originalSize: loadedVideo.size,
          outputSize: processed.size,
          bitrateKbps: processed.appliedVideoBitrateKbps,
        },
        durationMs
      );

      historyLogger.addHistory({
        actionType: 'video_edit',
        title: `Video Resized: ${loadedVideo.name}`,
        summary: `Changed video dimensions to ${processed.width}×${processed.height}px (${config.fitMode}) · ${formatBytes(
          loadedVideo.size
        )} → ${formatBytes(processed.size)}`,
        itemCount: 1,
        originalTotalSize: loadedVideo.size,
        processedTotalSize: processed.size,
        savedBytes,
        metadata: {
          filenames: [loadedVideo.name],
          dimensions: `${processed.width}x${processed.height} px`,
          targetFormat: processed.mimeType,
        },
      });
    } catch (err: any) {
      if (err.message !== 'Video processing cancelled') {
        setProcessError(err.message || 'Video processing failed.');
        historyLogger.log('error', 'video', 'Video Render Failed', err.message || 'Unknown error');
      } else {
        historyLogger.log('warning', 'video', 'Video Render Cancelled', 'User cancelled video rendering.');
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelProcessing = () => {
    abortControllerRef.current?.abort();
  };

  const handleDownloadOutput = () => {
    if (!result || !loadedVideo) return;
    const baseName = loadedVideo.name.replace(/\.[^/.]+$/, '');
    const fileName = `${baseName}_${result.width}x${result.height}.${result.extension}`;
    downloadBlob(result.blob, fileName);
    historyLogger.log(
      'success',
      'export',
      'Processed Video Downloaded',
      `Saved "${fileName}" (${result.width}×${result.height}px, ${formatBytes(result.size)}).`
    );
  };

  const handleClearVideo = () => {
    if (isProcessing) handleCancelProcessing();
    if (loadedVideo?.url) URL.revokeObjectURL(loadedVideo.url);
    onVideoLoaded(null);
    setResult(null);
    setProcessError(null);
  };

  // Compute CSS aspect preview style for target framing
  const previewAspectRatio = Math.max(0.25, Math.min(4, config.width / Math.max(1, config.height)));
  const videoObjectFitClass =
    config.fitMode === 'cover'
      ? 'object-cover'
      : config.fitMode === 'stretch'
      ? 'object-fill'
      : 'object-contain';

  const estimatedDiffPct =
    loadedVideo && bitrateCalc
      ? Math.round(((bitrateCalc.estimatedBytes - loadedVideo.size) / Math.max(1, loadedVideo.size)) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Studio Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {lang === 'hi'
                ? 'वीडियो डायमेंशन और फाइल साइज एडिटर'
                : 'Video Dimension & File Size Studio'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'hi'
                ? 'वीडियो की चौड़ाई/ऊंचाई (px) बदलें, 9:16/1:1/16:9 फ्रेम करें और टारगेट फाइल साइज (MB/KB) सेट करें।'
                : 'Edit exact video pixel dimensions, switch aspect ratios, and compress to any target file size (MB or KB) locally.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loadedVideo && (
            <>
              <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer whitespace-nowrap shrink-0">
                <Upload className="h-3.5 w-3.5" />
                <span>{lang === 'hi' ? 'दूसरा वीडियो चुनें' : 'Replace Video'}</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleVideoFile(f);
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleClearVideo}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <X className="h-3.5 w-3.5" />
                <span>{lang === 'hi' ? 'हटाएं' : 'Remove'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty / Upload State */}
      {!loadedVideo ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleVideoFile(f);
          }}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition ${
            isDragging
              ? 'border-blue-500 bg-blue-50/60'
              : 'border-slate-300 bg-white hover:border-slate-400'
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-blue-600 mb-4">
            {isLoadingVideo ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <Video className="h-7 w-7" />
            )}
          </div>

          <h3 className="text-base font-bold text-slate-900">
            {isLoadingVideo
              ? lang === 'hi'
                ? 'वीडियो लोड हो रहा है...'
                : 'Loading video stream...'
              : lang === 'hi'
              ? 'यहाँ वीडियो ड्रैग और ड्रॉप करें या फ़ाइल चुनें'
              : 'Drop a video here or browse from your device'}
          </h3>

          <p className="mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed">
            {lang === 'hi'
              ? 'MP4, WebM, MOV सपोर्टेड · 100% ब्राउज़र में प्राइवेट प्रोसेसिंग · कस्टम पिक्सेल (W×H) और टारगेट MB/KB कंप्रेशन'
              : 'Supports MP4, WebM, MOV · 100% private client-side processing · Custom pixel dimensions (W×H) and exact MB/KB file size control.'}
          </p>

          {loadError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <label className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer shadow-sm">
              <Upload className="h-4 w-4" />
              <span>{lang === 'hi' ? 'वीडियो फ़ाइल चुनें' : 'Select Video File'}</span>
              <input
                id="video-upload-input"
                type="file"
                accept="video/*"
                className="hidden"
                disabled={isLoadingVideo}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleVideoFile(f);
                  e.target.value = '';
                }}
              />
            </label>

            <button
              id="generate-demo-video-btn"
              type="button"
              disabled={isLoadingVideo}
              onClick={handleGenerateDemo}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>{lang === 'hi' ? '5s डेमो वीडियो बनाएं (720p)' : 'Generate 5s Demo Video (720p)'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active 2-Column Video Editor Workspace */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* LEFT COLUMN: Live Framing Preview, Trim Controls & Processed Result */}
          <div className="lg:col-span-7 space-y-5">
            {/* Live Dimension Framing Preview Stage */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* Quiet metadata header strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs" title={loadedVideo.name}>
                    {loadedVideo.name}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {formatDuration(loadedVideo.duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono tabular-nums text-[11px] text-slate-600">
                  <span>
                    {loadedVideo.width}×{loadedVideo.height}px ({formatBytes(loadedVideo.size)})
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-blue-700">
                    {config.width}×{config.height}px
                  </span>
                </div>
              </div>

              {/* Dark Stage showing live aspect ratio & fit preview */}
              <div className="relative flex items-center justify-center bg-slate-950 p-6 min-h-[340px] max-h-[480px]">
                <div
                  className="relative overflow-hidden border border-white/20 shadow-lg flex items-center justify-center transition-all duration-200"
                  style={{
                    aspectRatio: `${previewAspectRatio}`,
                    maxHeight: '390px',
                    maxWidth: '100%',
                    width: previewAspectRatio >= 1 ? '100%' : 'auto',
                    height: previewAspectRatio < 1 ? '390px' : 'auto',
                    backgroundColor: config.backgroundColor || '#000000',
                  }}
                >
                  <video
                    ref={previewVideoRef}
                    src={loadedVideo.url}
                    muted={isMuted}
                    playsInline
                    onTimeUpdate={(e) => {
                      const v = e.currentTarget;
                      setCurrentTime(v.currentTime);
                      if (v.currentTime >= config.trimEnd && !v.paused) {
                        v.pause();
                        setIsPlaying(false);
                      }
                    }}
                    onEnded={() => setIsPlaying(false)}
                    onClick={togglePlay}
                    className={`h-full w-full cursor-pointer ${videoObjectFitClass}`}
                  />

                  {/* Subtle corner frame dimension guide */}
                  <div className="pointer-events-none absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-mono tabular-nums text-white/90">
                    {config.width} × {config.height} px · {config.fitMode}
                  </div>
                </div>
              </div>

              {/* Playback & Scrub Controls */}
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-blue-600 transition cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={loadedVideo.duration}
                    step={0.05}
                    value={currentTime}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value);
                      setCurrentTime(t);
                      if (previewVideoRef.current) previewVideoRef.current.currentTime = t;
                    }}
                    className="flex-1 h-1.5 accent-blue-600 cursor-pointer"
                  />

                  <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-600 shrink-0">
                    {formatDuration(currentTime)} / {formatDuration(loadedVideo.duration)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsMuted((m) => !m)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition cursor-pointer"
                    title={isMuted ? 'Unmute Preview' : 'Mute Preview'}
                  >
                    {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Trim Range Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                    <Scissors className="h-3.5 w-3.5 text-slate-400" />
                    <span>{lang === 'hi' ? 'ट्रिम अवधि (सेकंड)' : 'Trim Clip Range'}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <label className="flex items-center gap-1.5">
                      <span className="text-[11px] font-sans text-slate-500">Start</span>
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, config.trimEnd - 0.5)}
                        step={0.1}
                        value={config.trimStart}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(config.trimEnd - 0.5, Number(e.target.value) || 0));
                          setConfig((prev) => ({ ...prev, trimStart: Number(val.toFixed(1)) }));
                        }}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800"
                      />
                    </label>
                    <span className="text-slate-400">–</span>
                    <label className="flex items-center gap-1.5">
                      <span className="text-[11px] font-sans text-slate-500">End</span>
                      <input
                        type="number"
                        min={Math.min(loadedVideo.duration, config.trimStart + 0.5)}
                        max={Number(loadedVideo.duration.toFixed(2))}
                        step={0.1}
                        value={config.trimEnd}
                        onChange={(e) => {
                          const val = Math.min(
                            loadedVideo.duration,
                            Math.max(config.trimStart + 0.5, Number(e.target.value) || loadedVideo.duration)
                          );
                          setConfig((prev) => ({ ...prev, trimEnd: Number(val.toFixed(1)) }));
                        }}
                        className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800"
                      />
                    </label>
                    <span className="text-[11px] text-slate-500">
                      ({formatDuration(Math.max(0.5, config.trimEnd - config.trimStart))})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Rendering Progress Banner */}
            {isProcessing && progress && (
              <div className="rounded-2xl border border-blue-200 bg-white p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">
                      {lang === 'hi'
                        ? 'वीडियो रेंडर और कंप्रेस हो रहा है...'
                        : 'Rendering resized video frames...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums text-xs font-bold text-blue-700">
                      {progress.percent}%
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelProcessing}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                    </button>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-blue-600 transition-all duration-150"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
                  <span>
                    {formatDuration(progress.currentTime)} / {formatDuration(progress.totalDuration)}
                  </span>
                  <span>
                    {progress.frameCount} frames · {config.width}×{config.height} px
                  </span>
                </div>
              </div>
            )}

            {/* Error State */}
            {processError && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{processError}</span>
              </div>
            )}

            {/* Processed Output Comparison & Download Card */}
            {result && !isProcessing && (
              <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50/50 px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-950">
                      {lang === 'hi' ? 'प्रोसेस्ड वीडियो डाउनलोड के लिए तैयार है' : 'Processed Video Ready'}
                    </span>
                  </div>
                  <button
                    id="download-processed-video-btn"
                    type="button"
                    onClick={handleDownloadOutput}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>
                      {lang === 'hi'
                        ? `वीडियो डाउनलोड (.${result.extension.toUpperCase()})`
                        : `Download Video (.${result.extension.toUpperCase()})`}
                    </span>
                  </button>
                </div>

                {/* Comparison Metrics Strip */}
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 text-xs">
                  <div className="p-3.5">
                    <span className="block text-[11px] text-slate-500">
                      {lang === 'hi' ? 'आउटपुट डायमेंशन' : 'Output Dimensions'}
                    </span>
                    <span className="mt-0.5 block font-mono tabular-nums font-bold text-slate-900">
                      {result.width} × {result.height} px
                    </span>
                  </div>
                  <div className="p-3.5">
                    <span className="block text-[11px] text-slate-500">
                      {lang === 'hi' ? 'नया फाइल साइज' : 'Final File Size'}
                    </span>
                    <div className="mt-0.5 flex items-baseline gap-1.5 font-mono tabular-nums">
                      <span className="font-bold text-blue-700">{formatBytes(result.size)}</span>
                      <span className="text-[10px] text-slate-400">
                        (was {formatBytes(loadedVideo.size)})
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5">
                    <span className="block text-[11px] text-slate-500">
                      {lang === 'hi' ? 'साइज बदलाव' : 'Size Change'}
                    </span>
                    {(() => {
                      const pct = Math.round(
                        ((result.size - loadedVideo.size) / Math.max(1, loadedVideo.size)) * 100
                      );
                      const smaller = pct < 0;
                      return (
                        <span
                          className={`mt-0.5 inline-flex items-center gap-1 font-mono tabular-nums font-bold ${
                            smaller ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {smaller && <TrendingDown className="h-3.5 w-3.5" />}
                          {pct > 0 ? `+${pct}%` : `${pct}%`}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Playable Output Video Preview */}
                <div className="bg-slate-950 p-4 flex items-center justify-center">
                  <video
                    src={result.url}
                    controls
                    playsInline
                    className="max-h-[320px] max-w-full rounded-lg border border-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Video Dimension Editor & Target File Size Controls */}
          <div className="lg:col-span-5 space-y-5">
            {/* Section 1: Video Dimension Controls */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === 'hi' ? '1. वीडियो डायमेंशन एडिट करें' : '1. Edit Video Dimensions'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleResetOriginalDimensions}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>{lang === 'hi' ? 'मूल आकार' : 'Reset'}</span>
                </button>
              </div>

              {/* Manual Width & Height Px Inputs */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {lang === 'hi' ? 'चौड़ाई (Width px)' : 'Width (px)'}
                    </label>
                    <input
                      id="video-width-input"
                      type="number"
                      min={16}
                      max={3840}
                      value={widthDraft}
                      onChange={(e) => handleWidthInput(e.target.value)}
                      onBlur={handleBlurDimensions}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono tabular-nums text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Lock Ratio & Swap Controls */}
                  <div className="flex items-center gap-1 pt-5">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          maintainAspectRatio: !prev.maintainAspectRatio,
                        }))
                      }
                      title={config.maintainAspectRatio ? 'Aspect Ratio Locked' : 'Free Manual Dimensions'}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border transition cursor-pointer ${
                        config.maintainAspectRatio
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {config.maintainAspectRatio ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleSwapDimensions}
                      title="Swap Width & Height"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {lang === 'hi' ? 'ऊंचाई (Height px)' : 'Height (px)'}
                    </label>
                    <input
                      id="video-height-input"
                      type="number"
                      min={16}
                      max={3840}
                      value={heightDraft}
                      onChange={(e) => handleHeightInput(e.target.value)}
                      onBlur={handleBlurDimensions}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono tabular-nums text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  {config.maintainAspectRatio
                    ? lang === 'hi'
                      ? 'आस्पेक्ट रेशियो लॉक है — स्वतंत्र मैन्युअल पिक्सेल के लिए लॉक खोलें।'
                      : 'Aspect ratio locked. Click the lock icon to enter independent custom pixels.'
                    : lang === 'hi'
                    ? 'फ्री मैन्युअल मोड सक्रिय — कोई भी चौड़ाई व ऊंचाई सेट करें।'
                    : 'Free manual mode active — set any custom Width × Height.'}
                </p>
              </div>

              {/* Quick Platform Dimension Presets */}
              <div className="space-y-2">
                <span className="block text-[11px] font-semibold text-slate-600">
                  {lang === 'hi' ? 'त्वरित वीडियो प्रीसेट्स' : 'Quick Video Presets'}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {VIDEO_PRESETS.map((preset) => {
                    const isActive = config.width === preset.width && config.height === preset.height;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset.width, preset.height)}
                        className={`flex items-center justify-between rounded-xl border px-2.5 py-2 text-left transition cursor-pointer ${
                          isActive
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block text-xs font-bold truncate">{preset.name}</span>
                          <span className="block font-mono tabular-nums text-[10px] text-slate-500">
                            {preset.width}×{preset.height}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-slate-400 ml-1 shrink-0">
                          {preset.ratioLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Framing / Fit Mode */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {lang === 'hi' ? 'फ्रेम फिट मोड (Fit Mode)' : 'Framing / Fit Mode'}
                  </span>
                  {config.fitMode === 'contain' && (
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>{lang === 'hi' ? 'पैड रंग:' : 'Pad:'}</span>
                      <input
                        type="color"
                        value={config.backgroundColor}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, backgroundColor: e.target.value }))
                        }
                        className="h-5 w-6 cursor-pointer rounded border border-slate-300 p-0"
                      />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
                  {(
                    [
                      { id: 'contain', label: lang === 'hi' ? 'फिट (Pad)' : 'Contain (Pad)' },
                      { id: 'cover', label: lang === 'hi' ? 'क्रॉप फिल' : 'Cover (Crop)' },
                      { id: 'stretch', label: lang === 'hi' ? 'स्ट्रेच' : 'Stretch' },
                    ] as { id: VideoFitMode; label: string }[]
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, fitMode: mode.id }))}
                      className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                        config.fitMode === mode.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Video File Size Control */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === 'hi' ? '2. वीडियो फाइल साइज बदलें' : '2. Change Video File Size'}
                  </h3>
                </div>
              </div>

              {/* Mode Switcher: Target File Size vs Manual Bitrate */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  id="video-size-mode-target"
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, sizeControlMode: 'target_size' }))}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    config.sizeControlMode === 'target_size'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'hi' ? 'टारगेट फाइल साइज (MB/KB)' : 'Target File Size'}
                </button>
                <button
                  id="video-size-mode-bitrate"
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, sizeControlMode: 'bitrate' }))}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    config.sizeControlMode === 'bitrate'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'hi' ? 'मैन्युअल बिटरेट (kbps)' : 'Manual Bitrate'}
                </button>
              </div>

              {config.sizeControlMode === 'target_size' ? (
                <div className="space-y-3">
                  {/* Target Size Input + Unit Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      id="video-target-size-input"
                      type="number"
                      min={0.1}
                      step={config.targetFileSizeUnit === 'MB' ? 0.5 : 50}
                      value={targetSizeDraft}
                      onChange={(e) => handleTargetSizeInput(e.target.value)}
                      onBlur={() => setTargetSizeDraft(String(config.targetFileSizeValue))}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono tabular-nums text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                    <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
                      {(['KB', 'MB'] as FileSizeUnit[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => {
                            if (u === config.targetFileSizeUnit) return;
                            const converted =
                              u === 'KB'
                                ? Math.round(config.targetFileSizeValue * 1024)
                                : Number((config.targetFileSizeValue / 1024).toFixed(2));
                            setTargetSizeDraft(String(converted));
                            setConfig((prev) => ({
                              ...prev,
                              targetFileSizeUnit: u,
                              targetFileSizeValue: Math.max(0.1, converted),
                            }));
                          }}
                          className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                            config.targetFileSizeUnit === u
                              ? 'bg-white text-blue-700 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Target File Size Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '500 KB', val: 500, unit: 'KB' as FileSizeUnit },
                      { label: '1 MB', val: 1, unit: 'MB' as FileSizeUnit },
                      { label: '2 MB', val: 2, unit: 'MB' as FileSizeUnit },
                      { label: '5 MB', val: 5, unit: 'MB' as FileSizeUnit },
                      { label: '10 MB', val: 10, unit: 'MB' as FileSizeUnit },
                      { label: '25 MB', val: 25, unit: 'MB' as FileSizeUnit },
                    ].map((opt) => {
                      const active =
                        config.targetFileSizeValue === opt.val && config.targetFileSizeUnit === opt.unit;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => handleQuickTargetSize(opt.val, opt.unit)}
                          className={`rounded-lg border px-2.5 py-1 font-mono tabular-nums text-[11px] font-semibold transition cursor-pointer ${
                            active
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">
                      {lang === 'hi' ? 'वीडियो बिटरेट' : 'Video Bitrate'}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-blue-700">
                      {config.videoBitrateKbps >= 1000
                        ? `${(config.videoBitrateKbps / 1000).toFixed(1)} Mbps`
                        : `${config.videoBitrateKbps} kbps`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={200}
                    max={10000}
                    step={100}
                    value={config.videoBitrateKbps}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, videoBitrateKbps: Number(e.target.value) }))
                    }
                    className="h-2 w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Low (500k)', kbps: 500 },
                      { label: 'Web (1.5M)', kbps: 1500 },
                      { label: 'HD (3M)', kbps: 3000 },
                      { label: 'High (6M)', kbps: 6000 },
                    ].map((b) => (
                      <button
                        key={b.kbps}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, videoBitrateKbps: b.kbps }))}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                          config.videoBitrateKbps === b.kbps
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Bitrate & Size Estimate Readout */}
              {bitrateCalc && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">
                      {lang === 'hi' ? 'अनुमानित आउटपुट साइज' : 'Estimated Output Size'}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      ~{formatBytes(bitrateCalc.estimatedBytes)}{' '}
                      <span
                        className={
                          estimatedDiffPct <= 0 ? 'text-emerald-700' : 'text-amber-700'
                        }
                      >
                        ({estimatedDiffPct > 0 ? `+${estimatedDiffPct}%` : `${estimatedDiffPct}%`})
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                    <span>
                      Video: {Math.round(bitrateCalc.videoBitsPerSecond / 1000)} kbps
                    </span>
                    <span>
                      Audio: {config.includeAudio ? `${Math.round(bitrateCalc.audioBitsPerSecond / 1000)} kbps` : 'Muted'}
                    </span>
                  </div>
                  {bitrateCalc.isExtremeCompression && (
                    <p className="pt-1 text-[11px] text-amber-700 font-medium">
                      {lang === 'hi'
                        ? 'ध्यान दें: बहुत कम टारगेट साइज के लिए कम रेजोल्यूशन (जैसे 480p/360p) चुनना बेहतर क्लैरिटी देगा।'
                        : 'Tip: Very tight size budget — lowering dimensions (e.g. 480p or 360p) will preserve much sharper clarity.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: Format, FPS, Audio & Process CTA */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'hi' ? 'आउटपुट फॉर्मेट' : 'Output Format'}
                  </label>
                  <select
                    value={config.mimeType}
                    onChange={(e) => setConfig((prev) => ({ ...prev, mimeType: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                  >
                    {supportedFormats.map((fmt) => (
                      <option key={fmt.mimeType} value={fmt.mimeType}>
                        {fmt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {lang === 'hi' ? 'फ्रेम रेट (FPS)' : 'Frame Rate (FPS)'}
                  </label>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
                    {([24, 30, 60] as (24 | 30 | 60)[]).map((fpsVal) => (
                      <button
                        key={fpsVal}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, fps: fpsVal }))}
                        className={`rounded-lg py-1 font-mono tabular-nums text-xs font-bold transition cursor-pointer ${
                          config.fps === fpsVal
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {fpsVal}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs cursor-pointer">
                <span className="font-semibold text-slate-700">
                  {lang === 'hi' ? 'ऑडियो ट्रैक शामिल करें (Include Audio)' : 'Preserve Audio Track'}
                </span>
                <input
                  type="checkbox"
                  checked={config.includeAudio}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, includeAudio: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-blue-600"
                />
              </label>

              <button
                id="process-video-btn"
                type="button"
                disabled={isProcessing}
                onClick={handleProcessVideo}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white transition shadow-sm ${
                  isProcessing
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] cursor-pointer shadow-blue-500/20'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {lang === 'hi'
                        ? `प्रोसेसिंग... ${progress?.percent ?? 0}%`
                        : `Processing Video... ${progress?.percent ?? 0}%`}
                    </span>
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    <span>
                      {lang === 'hi'
                        ? `वीडियो रिसाइज व कंप्रेस करें (${config.width}×${config.height})`
                        : `Resize & Change Video Size (${config.width}×${config.height} px)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
