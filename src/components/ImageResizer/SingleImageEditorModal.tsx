import React, { useState, useEffect } from 'react';
import {
  ImageProcessingConfig,
  ProcessedImageItem,
  SupportedFormat,
  PhotoManualFitMode,
  FileSizeUnit,
} from '../../types';
import { processImage, formatBytes } from '../../utils/imageProcessor';
import { CropToolOverlay, CropRect } from './CropToolOverlay';
import {
  X,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Check,
  Download,
  Loader2,
  Lock,
  Unlock,
  Sun,
  Eye,
  RefreshCw,
  Crop,
  Layers,
  Sparkles,
  Maximize2,
  RotateCcw,
  AlignCenter,
  Scan,
  Zap,
  Frame,
  Palette,
  Paintbrush,
  Square,
  ArrowLeftRight,
  HardDrive,
} from 'lucide-react';

interface SingleImageEditorModalProps {
  item: ProcessedImageItem | null;
  baseConfig: ImageProcessingConfig;
  initialTab?: 'crop' | 'tune' | 'border';
  onSave: (updatedItem: ProcessedImageItem) => void;
  onClose: () => void;
  lang: 'en' | 'hi';
}

interface AspectPreset {
  id: string;
  label: string;
  ratio: number | null;
  desc: string;
}

const ASPECT_PRESETS: AspectPreset[] = [
  { id: 'free', label: 'Freeform', ratio: null, desc: 'Custom unconstrained' },
  { id: '1:1', label: '1:1 Square', ratio: 1, desc: 'Instagram / Avatar' },
  { id: '4:5', label: '4:5 Portrait', ratio: 4 / 5, desc: 'Instagram Feed' },
  { id: '16:9', label: '16:9 Landscape', ratio: 16 / 9, desc: 'YouTube / Desktop' },
  { id: '9:16', label: '9:16 Reels', ratio: 9 / 16, desc: 'TikTok / Stories' },
  { id: '4:3', label: '4:3 Standard', ratio: 4 / 3, desc: 'Classic Photo' },
  { id: '3:2', label: '3:2 Classic', ratio: 3 / 2, desc: '35mm / DSLR' },
  { id: '35:45', label: '35:45 Passport', ratio: 35 / 45, desc: 'Govt / Visa ID' },
  { id: 'original', label: 'Original', ratio: 0, desc: 'Source photo ratio' },
];

export const SingleImageEditorModal: React.FC<SingleImageEditorModalProps> = ({
  item,
  baseConfig,
  initialTab = 'crop',
  onSave,
  onClose,
  lang,
}) => {
  if (!item) return null;

  const origW = item.originalWidth;
  const origH = item.originalHeight;

  // Active Editor Sub-tab
  const [activeTab, setActiveTab] = useState<'crop' | 'tune' | 'border'>(initialTab);
  const [sizeUnit, setSizeUnit] = useState<FileSizeUnit>('KB');

  // Initial Crop setup
  const initialCrop: CropRect = item.customConfig?.crop || {
    x: 0,
    y: 0,
    width: origW,
    height: origH,
  };

  const [crop, setCrop] = useState<CropRect>(initialCrop);
  const [selectedPreset, setSelectedPreset] = useState<string>(
    item.customConfig?.cropPreset || 'free'
  );

  const [config, setConfig] = useState<ImageProcessingConfig>({
    ...baseConfig,
    ...(item.customConfig || {}),
    crop: initialCrop,
    cropPreset: item.customConfig?.cropPreset || 'free',
    width: item.customConfig?.width || item.outputWidth || initialCrop.width,
    height: item.customConfig?.height || item.outputHeight || initialCrop.height,
    aspectRatio: initialCrop.width / initialCrop.height,
    manualFitMode: item.customConfig?.manualFitMode || baseConfig.manualFitMode || 'cover',
  });

  const [widthDraft, setWidthDraft] = useState<string>(String(config.width));
  const [heightDraft, setHeightDraft] = useState<string>(String(config.height));

  useEffect(() => {
    setWidthDraft(String(config.width));
    setHeightDraft(String(config.height));
  }, [config.width, config.height]);

  const [isRendering, setIsRendering] = useState(false);
  const [previewData, setPreviewData] = useState<{
    blob: Blob;
    url: string;
    width: number;
    height: number;
    size: number;
  } | null>(
    item.outputBlob && item.outputUrl
      ? {
          blob: item.outputBlob,
          url: item.outputUrl,
          width: item.outputWidth,
          height: item.outputHeight,
          size: item.outputSize,
        }
      : null
  );

  // Compute aspect ratio value for crop tool
  const currentRatioValue: number | null = (() => {
    if (selectedPreset === 'free') return null;
    if (selectedPreset === 'original') return origW / origH;
    const preset = ASPECT_PRESETS.find((p) => p.id === selectedPreset);
    return preset?.ratio ?? null;
  })();

  const handleReprocess = async (customCfg = config) => {
    setIsRendering(true);
    try {
      const res = await processImage(item.originalUrl, customCfg);
      setPreviewData({
        blob: res.blob,
        url: res.dataUrl,
        width: res.width,
        height: res.height,
        size: res.size,
      });
    } catch (e) {
      console.error('Failed to process image preview:', e);
    } finally {
      setIsRendering(false);
    }
  };

  // When crop preset changes, re-fit crop rectangle automatically
  const handleSelectPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    let targetRatio: number | null = null;

    if (presetId === 'original') {
      targetRatio = origW / origH;
    } else if (presetId !== 'free') {
      const p = ASPECT_PRESETS.find((x) => x.id === presetId);
      targetRatio = p?.ratio ?? null;
    }

    if (targetRatio) {
      let newW = origW;
      let newH = Math.round(origW / targetRatio);

      if (newH > origH) {
        newH = origH;
        newW = Math.round(origH * targetRatio);
      }

      const newX = Math.round((origW - newW) / 2);
      const newY = Math.round((origH - newH) / 2);

      const newCrop: CropRect = {
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      };

      setCrop(newCrop);
      const newCfg: ImageProcessingConfig = {
        ...config,
        crop: newCrop,
        cropPreset: presetId,
        width: newW,
        height: newH,
        aspectRatio: targetRatio,
      };
      setConfig(newCfg);
      handleReprocess(newCfg);
    } else {
      // Freeform keeps current crop bounds
      const newCfg = { ...config, crop, cropPreset: 'free' };
      setConfig(newCfg);
    }
  };

  // Center the current crop frame
  const handleCenterCrop = () => {
    const newX = Math.max(0, Math.round((origW - crop.width) / 2));
    const newY = Math.max(0, Math.round((origH - crop.height) / 2));
    const newCrop = { ...crop, x: newX, y: newY };
    setCrop(newCrop);
    const newCfg = { ...config, crop: newCrop };
    setConfig(newCfg);
    handleReprocess(newCfg);
  };

  // Maximize crop frame within image bounds
  const handleMaximizeCrop = () => {
    if (currentRatioValue) {
      let newW = origW;
      let newH = Math.round(origW / currentRatioValue);
      if (newH > origH) {
        newH = origH;
        newW = Math.round(origH * currentRatioValue);
      }
      const newCrop: CropRect = {
        x: Math.round((origW - newW) / 2),
        y: Math.round((origH - newH) / 2),
        width: newW,
        height: newH,
      };
      setCrop(newCrop);
      const newCfg = { ...config, crop: newCrop, width: newW, height: newH };
      setConfig(newCfg);
      handleReprocess(newCfg);
    } else {
      const fullCrop: CropRect = { x: 0, y: 0, width: origW, height: origH };
      setCrop(fullCrop);
      const newCfg = { ...config, crop: fullCrop, width: origW, height: origH };
      setConfig(newCfg);
      handleReprocess(newCfg);
    }
  };

  // Reset crop to full original image
  const handleResetCrop = () => {
    setSelectedPreset('free');
    const fullCrop: CropRect = { x: 0, y: 0, width: origW, height: origH };
    setCrop(fullCrop);
    const newCfg: ImageProcessingConfig = {
      ...config,
      crop: fullCrop,
      cropPreset: 'free',
      width: origW,
      height: origH,
      aspectRatio: origW / origH,
    };
    setConfig(newCfg);
    handleReprocess(newCfg);
  };

  const handleCropChangeFromOverlay = (newCrop: CropRect) => {
    setCrop(newCrop);
    const newCfg: ImageProcessingConfig = {
      ...config,
      crop: newCrop,
      cropPreset: selectedPreset,
      width: config.maintainAspectRatio ? newCrop.width : config.width,
      height: config.maintainAspectRatio ? newCrop.height : config.height,
      aspectRatio: newCrop.width / newCrop.height,
    };
    setConfig(newCfg);
  };

  // Apply crop change to live preview
  const handleApplyCropPreview = () => {
    const newCfg = {
      ...config,
      crop,
      cropPreset: selectedPreset,
      aspectRatio: crop.width / crop.height,
    };
    setConfig(newCfg);
    handleReprocess(newCfg);
  };

  const handleRotate = () => {
    const nextRot = ((config.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    const newCfg = { ...config, rotation: nextRot };
    setConfig(newCfg);
    handleReprocess(newCfg);
  };

  const handleFlipH = () => {
    const newCfg = { ...config, flipH: !config.flipH };
    setConfig(newCfg);
    handleReprocess(newCfg);
  };

  const handleFlipV = () => {
    const newCfg = { ...config, flipV: !config.flipV };
    setConfig(newCfg);
    handleReprocess(newCfg);
  };

  const handleApplyAndSave = () => {
    const finalCfg = {
      ...config,
      crop,
      cropPreset: selectedPreset,
    };

    if (previewData) {
      onSave({
        ...item,
        outputBlob: previewData.blob,
        outputUrl: previewData.url,
        outputWidth: previewData.width,
        outputHeight: previewData.height,
        outputSize: previewData.size,
        customConfig: finalCfg,
      });
    }
    onClose();
  };

  // Initial process on open if needed
  useEffect(() => {
    handleReprocess(config);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-[94vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Crop className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'hi' ? 'फोटो क्रॉप और एडिटर' : 'Photo Cropper & Fine-Tuner'}
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">{item.name}</p>
            </div>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('crop')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'crop'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crop className="h-3.5 w-3.5" />
              <span>{lang === 'hi' ? 'क्रॉप और आस्पेक्ट रेशियो' : 'Crop & Aspect Ratio'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('tune');
                handleReprocess();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'tune'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{lang === 'hi' ? 'पिक्सेल और फिल्टर्स' : 'Filters & Scaling'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('border');
                handleReprocess();
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === 'border'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Frame className="h-3.5 w-3.5" />
              <span>{lang === 'hi' ? 'बॉर्डर व बैकग्राउंड' : 'Border & Background'}</span>
            </button>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Layout */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          
          {/* Left Canvas Preview Area */}
          <div className="relative flex flex-1 items-center justify-center bg-slate-950 p-6 overflow-hidden select-none">
            {isRendering && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs">
                <div className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Rendering pixels...</span>
                </div>
              </div>
            )}

            {/* If in Crop Mode -> Show Interactive Crop Tool Overlay */}
            {activeTab === 'crop' ? (
              <CropToolOverlay
                imageSrc={item.originalUrl}
                originalWidth={origW}
                originalHeight={origH}
                crop={crop}
                onChangeCrop={handleCropChangeFromOverlay}
                aspectRatio={currentRatioValue}
                presetLabel={
                  ASPECT_PRESETS.find((p) => p.id === selectedPreset)?.label || 'Custom'
                }
                lang={lang}
              />
            ) : (
              /* If in Tune Mode -> Show Final Rendered Result with Filters */
              <div className="relative max-h-full max-w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center">
                <img
                  src={previewData?.url || item.outputUrl || item.originalUrl}
                  alt="Processed Preview"
                  className="max-h-[60vh] max-w-full object-contain"
                />
              </div>
            )}

            {/* Floating Info Badges */}
            <div className="absolute bottom-4 left-6 flex items-center gap-2 z-20 pointer-events-none">
              <span className="rounded-md bg-slate-900/90 px-2.5 py-1 text-[11px] font-mono font-bold text-white border border-slate-700/60 backdrop-blur-xs">
                {activeTab === 'crop'
                  ? `${crop.width} × ${crop.height} px (Crop Area)`
                  : `${previewData?.width || crop.width} × ${previewData?.height || crop.height} px (Output)`}
              </span>
              {previewData?.size ? (
                <span className="rounded-md bg-blue-600/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-xs">
                  {formatBytes(previewData.size)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Right Controls Panel */}
          <div className="w-full border-t border-slate-200 bg-slate-50/80 p-5 lg:w-96 lg:border-t-0 lg:border-l overflow-y-auto space-y-5">
            
            {/* ================= CROP CONTROLS TAB ================= */}
            {activeTab === 'crop' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                
                {/* Aspect Ratio Presets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {lang === 'hi' ? '1. आस्पेक्ट रेशियो चुनें' : '1. Aspect Ratio Presets'}
                    </label>
                    <span className="text-[11px] font-semibold text-blue-600">
                      {ASPECT_PRESETS.find((p) => p.id === selectedPreset)?.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {ASPECT_PRESETS.map((preset) => {
                      const isActive = selectedPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset.id)}
                          className={`flex flex-col items-start rounded-xl p-2.5 text-left border transition cursor-pointer ${
                            isActive
                              ? 'border-blue-600 bg-blue-50/90 text-blue-950 font-bold ring-1 ring-blue-500/40 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100/70 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xs font-bold">{preset.label}</span>
                          <span className="text-[10px] text-slate-500 line-clamp-1">
                            {preset.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Align & Fit Actions */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {lang === 'hi' ? '2. त्वरित अलाइनमेंट' : '2. Framing & Alignment'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={handleCenterCrop}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                    >
                      <AlignCenter className="h-3.5 w-3.5 text-blue-600" />
                      <span>Center</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleMaximizeCrop}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                    >
                      <Maximize2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Fit Max</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetCrop}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Exact Numeric Crop Bounds */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      {lang === 'hi' ? 'क्रॉप पिक्सेल निर्देशांक' : 'Crop Pixel Coordinates'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Source: {origW} × {origH} px
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">X Position</span>
                      <input
                        type="number"
                        min="0"
                        max={origW - 1}
                        value={crop.x}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(origW - crop.width, Number(e.target.value)));
                          const updated = { ...crop, x: val };
                          setCrop(updated);
                          setConfig({ ...config, crop: updated });
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Y Position</span>
                      <input
                        type="number"
                        min="0"
                        max={origH - 1}
                        value={crop.y}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(origH - crop.height, Number(e.target.value)));
                          const updated = { ...crop, y: val };
                          setCrop(updated);
                          setConfig({ ...config, crop: updated });
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Crop Width</span>
                      <input
                        type="number"
                        min="20"
                        max={origW}
                        value={crop.width}
                        onChange={(e) => {
                          const val = Math.max(20, Math.min(origW - crop.x, Number(e.target.value)));
                          const valH = currentRatioValue ? Math.round(val / currentRatioValue) : crop.height;
                          const updated = { ...crop, width: val, height: Math.min(origH - crop.y, valH) };
                          setCrop(updated);
                          setConfig({ ...config, crop: updated });
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Crop Height</span>
                      <input
                        type="number"
                        min="20"
                        max={origH}
                        value={crop.height}
                        onChange={(e) => {
                          const val = Math.max(20, Math.min(origH - crop.y, Number(e.target.value)));
                          const valW = currentRatioValue ? Math.round(val * currentRatioValue) : crop.width;
                          const updated = { ...crop, height: val, width: Math.min(origW - crop.x, valW) };
                          setCrop(updated);
                          setConfig({ ...config, crop: updated });
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Apply Crop & Preview button */}
                <button
                  type="button"
                  onClick={() => {
                    handleApplyCropPreview();
                    setActiveTab('tune');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{lang === 'hi' ? 'क्रॉप लागू करें और आगे बढ़ें' : 'Apply Crop & Fine-Tune'}</span>
                </button>

              </div>
            )}

            {/* ================= TUNE & SCALING TAB ================= */}
            {activeTab === 'tune' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                
                {/* Transform Bar (Rotate & Flip) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    {lang === 'hi' ? 'रोटेट और फ्लिप' : 'Orientation & Transform'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRotate}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                    >
                      <RotateCw className="h-4 w-4 text-blue-600" />
                      <span>Rotate 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFlipH}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition cursor-pointer ${
                        config.flipH
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <FlipHorizontal className="h-4 w-4" />
                      <span>Flip H</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFlipV}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition cursor-pointer ${
                        config.flipV
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <FlipVertical className="h-4 w-4" />
                      <span>Flip V</span>
                    </button>
                  </div>
                </div>

                {/* Manual Output Pixel Dimensions & Fit Control */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {lang === 'hi' ? 'मैन्युअल पिक्सेल (W × H px)' : 'Manual Pixel Dimensions'}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newCfg = {
                            ...config,
                            resizeMode: 'exact' as const,
                            width: crop.width,
                            height: crop.height,
                            aspectRatio: crop.width / Math.max(1, crop.height),
                          };
                          setConfig(newCfg);
                          handleReprocess(newCfg);
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 cursor-pointer"
                      >
                        {lang === 'hi' ? 'मूल आकार' : 'Reset Px'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('crop')}
                        className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Crop className="h-3 w-3" />
                        <span>{lang === 'hi' ? 'क्रॉप' : 'Crop'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual Width & Height Inputs + Lock + Swap */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Width (px)</span>
                      <input
                        id="single-manual-width-input"
                        type="number"
                        min="1"
                        value={widthDraft}
                        onChange={(e) => {
                          setWidthDraft(e.target.value);
                          const w = parseInt(e.target.value, 10);
                          if (!Number.isFinite(w) || w < 1) return;
                          const h = config.maintainAspectRatio
                            ? Math.max(1, Math.round(w / Math.max(0.01, config.aspectRatio)))
                            : config.height;
                          setConfig({ ...config, resizeMode: 'exact', width: w, height: h });
                        }}
                        onBlur={() => setWidthDraft(String(config.width))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono tabular-nums text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            maintainAspectRatio: !config.maintainAspectRatio,
                            aspectRatio: config.width / Math.max(1, config.height),
                          })
                        }
                        title={
                          config.maintainAspectRatio
                            ? 'Aspect Ratio Locked (click for Free Manual Px)'
                            : 'Free Manual Px (unlocked)'
                        }
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition cursor-pointer ${
                          config.maintainAspectRatio
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-emerald-500 bg-emerald-50 text-emerald-700'
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
                        onClick={() => {
                          const swapped = {
                            ...config,
                            resizeMode: 'exact' as const,
                            width: config.height,
                            height: config.width,
                            maintainAspectRatio: false,
                            aspectRatio: config.height / Math.max(1, config.width),
                          };
                          setConfig(swapped);
                          handleReprocess(swapped);
                        }}
                        title="Swap Width & Height"
                        className="flex h-8 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <ArrowLeftRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex-1">
                      <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Height (px)</span>
                      <input
                        id="single-manual-height-input"
                        type="number"
                        min="1"
                        value={heightDraft}
                        onChange={(e) => {
                          setHeightDraft(e.target.value);
                          const h = parseInt(e.target.value, 10);
                          if (!Number.isFinite(h) || h < 1) return;
                          const w = config.maintainAspectRatio
                            ? Math.max(1, Math.round(h * config.aspectRatio))
                            : config.width;
                          setConfig({ ...config, resizeMode: 'exact', height: h, width: w });
                        }}
                        onBlur={() => setHeightDraft(String(config.height))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono tabular-nums text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Manual Fit Mode Selector (when aspect differs) */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] font-semibold text-slate-500">
                      {lang === 'hi' ? 'मैन्युअल फिट मोड:' : 'Manual Fit Behavior:'}
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'cover', label: 'Crop Fill' },
                          { id: 'contain', label: 'Fit Pad' },
                          { id: 'stretch', label: 'Stretch' },
                        ] as { id: PhotoManualFitMode; label: string }[]
                      ).map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            const updated = { ...config, manualFitMode: mode.id };
                            setConfig(updated);
                            handleReprocess(updated);
                          }}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                            (config.manualFitMode || 'cover') === mode.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Ratio Change Buttons */}
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <span className="block text-[10px] font-semibold text-slate-500">
                      {lang === 'hi' ? 'त्वरित अनुपात (Aspect Ratio)' : 'Quick Aspect Ratio'}
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: '1:1', ratio: 1 },
                        { label: '4:5', ratio: 4 / 5 },
                        { label: '16:9', ratio: 16 / 9 },
                        { label: '9:16', ratio: 9 / 16 },
                        { label: '4:3', ratio: 4 / 3 },
                        { label: '3:2', ratio: 3 / 2 },
                        { label: '35:45', ratio: 35 / 45 },
                        { label: 'Orig', ratio: origW / origH },
                      ].map((rItem) => {
                        const isCurrent = Math.abs(config.width / Math.max(1, config.height) - rItem.ratio) < 0.02;
                        return (
                          <button
                            key={rItem.label}
                            type="button"
                            onClick={() => {
                              const newHeight = Math.max(1, Math.round(config.width / rItem.ratio));
                              const newCfg = {
                                ...config,
                                resizeMode: 'exact' as const,
                                height: newHeight,
                                aspectRatio: rItem.ratio,
                                maintainAspectRatio: false,
                              };
                              setConfig(newCfg);
                              handleReprocess(newCfg);
                            }}
                            className={`rounded-lg py-1 px-1.5 text-[11px] font-bold transition border cursor-pointer ${
                              isCurrent
                                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {rItem.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Single Photo Target File Size Control (KB / MB) */}
                <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                      <HardDrive className="h-3.5 w-3.5 text-blue-600" />
                      <span>{lang === 'hi' ? 'फाइल साइज बदलें (KB/MB)' : 'Change File Size'}</span>
                    </label>
                    <div className="flex items-center gap-0.5 rounded-md bg-slate-100 p-0.5 border border-slate-200">
                      {(['KB', 'MB'] as FileSizeUnit[]).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setSizeUnit(u)}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                            sizeUnit === u ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="single-target-size-input"
                      type="number"
                      min="0"
                      step={sizeUnit === 'MB' ? '0.1' : '1'}
                      placeholder="0 (Auto)"
                      value={
                        config.targetMaxKb > 0
                          ? sizeUnit === 'MB'
                            ? Number((config.targetMaxKb / 1024).toFixed(2))
                            : config.targetMaxKb
                          : ''
                      }
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        const kb = sizeUnit === 'MB' ? Math.round(val * 1024) : Math.round(val);
                        setConfig({
                          ...config,
                          targetMaxKb: kb,
                          format: kb > 0 && config.format === 'image/png' ? 'image/jpeg' : config.format,
                        });
                      }}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono tabular-nums text-xs font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                    <span className="text-xs font-bold text-slate-600">{sizeUnit}</span>
                    {config.targetMaxKb > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...config, targetMaxKb: 0 };
                          setConfig(updated);
                          handleReprocess(updated);
                        }}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: '20 KB', kb: 20, u: 'KB' as FileSizeUnit },
                      { label: '50 KB', kb: 50, u: 'KB' as FileSizeUnit },
                      { label: '100 KB', kb: 100, u: 'KB' as FileSizeUnit },
                      { label: '200 KB', kb: 200, u: 'KB' as FileSizeUnit },
                      { label: '500 KB', kb: 500, u: 'KB' as FileSizeUnit },
                      { label: '1 MB', kb: 1024, u: 'MB' as FileSizeUnit },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setSizeUnit(opt.u);
                          const updated: ImageProcessingConfig = {
                            ...config,
                            targetMaxKb: opt.kb,
                            format: config.format === 'image/png' ? 'image/jpeg' : config.format,
                          };
                          setConfig(updated);
                          handleReprocess(updated);
                        }}
                        className={`rounded-md border px-2 py-0.5 font-mono tabular-nums text-[10px] font-semibold transition cursor-pointer ${
                          config.targetMaxKb === opt.kb
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upscale Image (Super Resolution) Card */}
                <div className="space-y-2.5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-white">
                        <Zap className="h-3 w-3" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        {lang === 'hi' ? 'अपस्केल फोटो (Upscale Resolution)' : 'Upscale Image (Super Resolution)'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                      AI Super-Res Engine
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    {lang === 'hi'
                      ? 'फोटो की रेजोल्यूशन 2x, 4x या 8x तक बढ़ाएं बिना पिक्सेलेट हुए।'
                      : 'Enlarge image resolution with multi-step adaptive clarity and edge reconstruction.'}
                  </p>

                  {/* 1-Click Multipliers */}
                  <div className="grid grid-cols-3 gap-2">
                    {([2, 4, 8] as (2 | 4 | 8)[]).map((factor) => {
                      const newW = origW * factor;
                      const newH = origH * factor;
                      const isSelected =
                        config.upscaleFactor === factor &&
                        (config.width === newW || config.resizeMode === 'upscale');

                      return (
                        <button
                          key={factor}
                          type="button"
                          onClick={() => {
                            setConfig({
                              ...config,
                              resizeMode: 'upscale',
                              upscaleFactor: factor,
                              width: newW,
                              height: newH,
                              aspectRatio: origW / origH,
                              maintainAspectRatio: true,
                              upscaleEngine: config.upscaleEngine || 'super_resolution',
                              upscaleDenoise: config.upscaleDenoise ?? true,
                              upscaleClarity: config.upscaleClarity ?? 75,
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-xl p-2 transition border cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                        >
                          <span className="text-xs font-extrabold">
                            {factor}X {factor === 2 ? 'HD' : factor === 4 ? '4K' : '8K'}
                          </span>
                          <span
                            className={`text-[9px] font-medium ${
                              isSelected ? 'text-blue-100' : 'text-slate-500'
                            }`}
                          >
                            {newW} × {newH}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Upscale Algorithm Engine & Clarity */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-600 mb-1">
                        {lang === 'hi' ? 'अपस्केलिंग तकनीक' : 'Enhancement Engine'}
                      </span>
                      <select
                        value={config.upscaleEngine || 'super_resolution'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            upscaleEngine: e.target.value as any,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="super_resolution">🌟 Super Resolution</option>
                        <option value="smooth_bicubic">✨ Smooth & Clean</option>
                        <option value="smart_sharpen">🎨 Smart Sharpen</option>
                        <option value="pixel_art">👾 Pixel Art (Crisp)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 mb-1">
                        <span>{lang === 'hi' ? 'क्लैरिटी' : 'Texture Clarity'}</span>
                        <span className="font-bold text-blue-600">{config.upscaleClarity ?? 75}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={config.upscaleClarity ?? 75}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            upscaleClarity: Number(e.target.value),
                          })
                        }
                        className="h-1.5 w-full cursor-pointer accent-blue-600 mt-2"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-blue-100/80 pt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        checked={config.upscaleDenoise ?? true}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            upscaleDenoise: e.target.checked,
                          })
                        }
                        className="h-3.5 w-3.5 rounded text-blue-600 accent-blue-600"
                      />
                      <span>{lang === 'hi' ? 'स्मार्ट आर्टिफैक्ट रिमूवल' : 'Suppress compression noise'}</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Output: {config.width} × {config.height} px
                    </span>
                  </div>
                </div>

                {/* DPI (Resolution / Print Density) Control */}
                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {lang === 'hi' ? 'DPI (प्रिंट रेजोल्यूशन)' : 'DPI (Resolution & Print Density)'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {config.dpi >= 300
                          ? '300 DPI - High-Res Official/Print'
                          : config.dpi >= 150
                          ? '150 DPI - Standard Print'
                          : '96/72 DPI - Web & Screen'}
                      </span>
                    </div>
                    <select
                      id="single-dpi-select"
                      value={config.dpi || 96}
                      onChange={(e) => setConfig({ ...config, dpi: Number(e.target.value) })}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value={72}>72 DPI (Web)</option>
                      <option value={96}>96 DPI (Standard Screen)</option>
                      <option value={150}>150 DPI (Draft Print)</option>
                      <option value={200}>200 DPI (Medium Print)</option>
                      <option value={300}>300 DPI (Visa / Passport Print)</option>
                      <option value={600}>600 DPI (Ultra HD)</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[72, 96, 150, 300, 600].map((dpiVal) => (
                      <button
                        key={dpiVal}
                        type="button"
                        onClick={() => setConfig({ ...config, dpi: dpiVal })}
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
                          config.dpi === dpiVal
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {dpiVal} DPI
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality and Format */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {lang === 'hi' ? 'फॉर्मेट और क्वालिटी' : 'Format & Quality'}
                  </label>
                  
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1">
                    {(['image/jpeg', 'image/png', 'image/webp'] as SupportedFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setConfig({ ...config, format: fmt })}
                        className={`rounded-lg py-1 text-xs font-bold transition ${
                          config.format === fmt
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {fmt.replace('image/', '').toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {config.format !== 'image/png' && (
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                        <span>Quality</span>
                        <span className="font-bold text-blue-600">
                          {Math.round(config.quality * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={Math.round(config.quality * 100)}
                        onChange={(e) =>
                          setConfig({ ...config, quality: Number(e.target.value) / 100 })
                        }
                        className="h-1.5 w-full cursor-pointer accent-blue-600"
                      />
                    </div>
                  )}
                </div>

                {/* Brightness, Contrast & Grayscale */}
                <div className="space-y-3 border-t border-slate-200 pt-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {lang === 'hi' ? 'एडजस्टमेंट्स और फिल्टर्स' : 'Fine-Tuning Filters'}
                  </label>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>Brightness</span>
                      <span>{config.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={config.brightness}
                      onChange={(e) =>
                        setConfig({ ...config, brightness: Number(e.target.value) })
                      }
                      className="h-1.5 w-full cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>Contrast</span>
                      <span>{config.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={config.contrast}
                      onChange={(e) =>
                        setConfig({ ...config, contrast: Number(e.target.value) })
                      }
                      className="h-1.5 w-full cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.grayscale}
                        onChange={(e) => setConfig({ ...config, grayscale: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>B&W Grayscale</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.sharpen}
                        onChange={(e) => setConfig({ ...config, sharpen: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Sharpen</span>
                    </label>
                  </div>
                </div>

                {/* Refresh Preview */}
                <button
                  type="button"
                  onClick={() => handleReprocess()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-800 hover:bg-slate-300 transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{lang === 'hi' ? 'रिफ्रेश प्रीव्यू देखें' : 'Refresh Live Preview'}</span>
                </button>

              </div>
            )}

            {/* TAB 3: BORDER & BACKGROUND FILL */}
            {activeTab === 'border' && (
              <div className="space-y-4">
                {/* Enable Border Master Toggle */}
                <div className="flex items-center justify-between rounded-xl bg-blue-50/80 p-3.5 border border-blue-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                      <Frame className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {lang === 'hi' ? 'एक्स्ट्रा बॉर्डर व बैकग्राउंड फिल' : 'Extra Border & Background Fill'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'hi' ? 'फोटो के चारों ओर फ्रेम या एक्स्ट्रा पैडिंग जोड़ें' : 'Add custom border margin and color frame'}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={Boolean(config.addBorder)}
                      onChange={(e) => {
                        const newCfg: ImageProcessingConfig = {
                          ...config,
                          addBorder: e.target.checked,
                          borderWidth: config.borderWidth || 20,
                          borderColor: config.borderColor || '#ffffff',
                          borderPlacement: config.borderPlacement || 'expand',
                        };
                        setConfig(newCfg);
                        handleReprocess(newCfg);
                      }}
                      className="peer sr-only"
                    />
                    <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                  </label>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    {lang === 'hi' ? 'त्वरित बॉर्डर प्रीसेट्स' : 'Quick Border Presets'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: 'None (0px)', bw: 0, color: '#ffffff', place: 'expand' as const, shadow: false },
                      { label: 'Thin (10px)', bw: 10, color: '#ffffff', place: 'expand' as const, shadow: false },
                      { label: 'Classic (20px)', bw: 20, color: '#ffffff', place: 'expand' as const, shadow: false },
                      { label: 'Thick (40px)', bw: 40, color: '#ffffff', place: 'expand' as const, shadow: true },
                      { label: 'Dark Frame', bw: 20, color: '#000000', place: 'expand' as const, shadow: false },
                      { label: 'Polaroid Style', bw: 24, color: '#ffffff', place: 'polaroid' as const, shadow: true },
                    ].map((preset, idx) => {
                      const isSelected =
                        config.addBorder &&
                        config.borderWidth === preset.bw &&
                        config.borderPlacement === preset.place &&
                        (preset.bw === 0 ? !config.addBorder : true);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const newCfg: ImageProcessingConfig = {
                              ...config,
                              addBorder: preset.bw > 0,
                              borderWidth: preset.bw,
                              borderColor: preset.color,
                              borderPlacement: preset.place,
                              borderShadow: preset.shadow,
                            };
                            setConfig(newCfg);
                            handleReprocess(newCfg);
                          }}
                          className={`rounded-lg border px-2.5 py-1.5 text-center text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-500/20'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Border Width Controls */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      {lang === 'hi' ? 'बॉर्डर की चौड़ाई (Pixel)' : 'Border Width / Padding'}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="250"
                        value={config.borderWidth ?? 20}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          const newCfg = { ...config, addBorder: val > 0, borderWidth: val };
                          setConfig(newCfg);
                          handleReprocess(newCfg);
                        }}
                        className="w-16 rounded-md border border-slate-300 px-2 py-0.5 text-center text-xs font-bold text-slate-800"
                      />
                      <span className="text-xs text-slate-500 font-semibold">px</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="1"
                    value={config.borderWidth ?? 20}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const newCfg = { ...config, addBorder: val > 0, borderWidth: val };
                      setConfig(newCfg);
                      handleReprocess(newCfg);
                    }}
                    className="w-full accent-blue-600 cursor-pointer"
                  />

                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {[5, 10, 15, 20, 30, 50, 80].map((px) => (
                      <button
                        key={px}
                        type="button"
                        onClick={() => {
                          const newCfg = { ...config, addBorder: true, borderWidth: px };
                          setConfig(newCfg);
                          handleReprocess(newCfg);
                        }}
                        className={`rounded px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                          config.borderWidth === px && config.addBorder
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {px}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Border Color & Background Fill */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-blue-600" />
                      <span>{lang === 'hi' ? 'बॉर्डर व बैकग्राउंड रंग' : 'Border & Background Color'}</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={config.borderColor || config.backgroundColor || '#ffffff'}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newCfg = { ...config, addBorder: true, borderColor: val, backgroundColor: val };
                          setConfig(newCfg);
                          handleReprocess(newCfg);
                        }}
                        className="h-6 w-7 rounded border border-slate-300 p-0 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold text-slate-700 uppercase">
                        {config.borderColor || config.backgroundColor || '#ffffff'}
                      </span>
                    </div>
                  </div>

                  {/* Swatches */}
                  <div className="grid grid-cols-6 gap-1.5 pt-1">
                    {[
                      { name: 'White', color: '#ffffff', border: true },
                      { name: 'Snow', color: '#f8fafc', border: true },
                      { name: 'Black', color: '#000000', border: false },
                      { name: 'Slate', color: '#0f172a', border: false },
                      { name: 'Gray', color: '#e2e8f0', border: true },
                      { name: 'Cream', color: '#fffbeb', border: true },
                      { name: 'Sky', color: '#e0f2fe', border: true },
                      { name: 'Red', color: '#ef4444', border: false },
                      { name: 'Blue', color: '#2563eb', border: false },
                      { name: 'Emerald', color: '#10b981', border: false },
                      { name: 'Gold', color: '#eab308', border: false },
                      { name: 'Purple', color: '#8b5cf6', border: false },
                    ].map((swatch, idx) => {
                      const isActive = (config.borderColor || config.backgroundColor || '#ffffff').toLowerCase() === swatch.color.toLowerCase();
                      return (
                        <button
                          key={idx}
                          type="button"
                          title={swatch.name}
                          onClick={() => {
                            const newCfg = {
                              ...config,
                              addBorder: true,
                              borderColor: swatch.color,
                              backgroundColor: swatch.color,
                            };
                            setConfig(newCfg);
                            handleReprocess(newCfg);
                          }}
                          className={`h-7 w-full rounded-md transition-all flex items-center justify-center cursor-pointer ${
                            swatch.border ? 'border border-slate-300' : ''
                          } ${
                            isActive
                              ? 'ring-2 ring-blue-600 scale-105 shadow-xs'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: swatch.color }}
                        >
                          {isActive && (
                            <Check className={`h-3.5 w-3.5 ${swatch.color === '#ffffff' || swatch.color === '#f8fafc' || swatch.color === '#e2e8f0' || swatch.color === '#fffbeb' || swatch.color === '#e0f2fe' ? 'text-slate-900' : 'text-white'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Border Placement Mode */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {lang === 'hi' ? 'बॉर्डर प्लेसमेंट स्टाइल' : 'Border Placement Style'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'expand', label: lang === 'hi' ? 'कैनवस बढ़ाएं' : 'Expand Canvas', desc: lang === 'hi' ? 'पूरी फोटो सुरक्षित' : 'Keep 100% scale' },
                      { id: 'inset', label: lang === 'hi' ? 'फिक्स साइज' : 'Fit Inside', desc: lang === 'hi' ? 'समान रेजोल्यूशन' : 'Exact canvas size' },
                      { id: 'polaroid', label: lang === 'hi' ? 'पोलरॉइड' : 'Polaroid Frame', desc: lang === 'hi' ? 'विंटेज फोटो फ्रेम' : 'Classic bottom margin' },
                    ].map((mode) => {
                      const isSelected = (config.borderPlacement || 'expand') === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            const newCfg: ImageProcessingConfig = {
                              ...config,
                              addBorder: true,
                              borderPlacement: mode.id as any,
                            };
                            setConfig(newCfg);
                            handleReprocess(newCfg);
                          }}
                          className={`rounded-lg border p-2 text-left transition cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 text-blue-700 ring-1 ring-blue-500/20'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <p className="text-xs font-bold">{mode.label}</p>
                          <p className="text-[10px] text-slate-500">{mode.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inner Photo Corner Radius & Shadow */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      {lang === 'hi' ? 'फोटो के अंदरूनी कोने (Radius)' : 'Inner Corner Radius'}
                    </label>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {config.borderRadius || 0}px
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="2"
                    value={config.borderRadius || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      const newCfg = { ...config, borderRadius: val };
                      setConfig(newCfg);
                      handleReprocess(newCfg);
                    }}
                    className="w-full accent-blue-600 cursor-pointer"
                  />

                  <div className="flex items-center gap-1.5">
                    {[0, 8, 16, 24, 36].map((rad) => (
                      <button
                        key={rad}
                        type="button"
                        onClick={() => {
                          const newCfg = { ...config, borderRadius: rad };
                          setConfig(newCfg);
                          handleReprocess(newCfg);
                        }}
                        className={`rounded px-2 py-0.5 text-[11px] font-bold transition cursor-pointer ${
                          (config.borderRadius || 0) === rad
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {rad === 0 ? 'Sharp (0)' : `${rad}px`}
                      </button>
                    ))}
                  </div>

                  {/* Soft Drop Shadow Toggle */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {lang === 'hi' ? 'फोटो पर हल्की छाया (Drop Shadow)' : 'Soft Photo Drop Shadow'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'hi' ? 'बॉर्डर के ऊपर 3D एलिवेशन इफ़ेक्ट' : 'Adds realistic depth inside the frame'}
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={Boolean(config.borderShadow)}
                        onChange={(e) => {
                          const newCfg = { ...config, borderShadow: e.target.checked };
                          setConfig(newCfg);
                          handleReprocess(newCfg);
                        }}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none"></div>
                    </label>
                  </div>
                </div>

                {/* Dimension Comparison Info Box */}
                {previewData && (
                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">
                        {lang === 'hi' ? 'मूल फोटो रेजोल्यूशन' : 'Original Photo Size'}
                      </span>
                      <span className="font-bold text-slate-800">{origW} × {origH} px</span>
                    </div>
                    <span className="text-slate-400 font-bold">→</span>
                    <div className="text-right">
                      <span className="text-blue-600 block text-[11px] font-bold">
                        {lang === 'hi' ? 'बॉर्डर सहित अंतिम साइज' : 'Canvas with Border'}
                      </span>
                      <span className="font-bold text-blue-700">{previewData.width} × {previewData.height} px</span>
                    </div>
                  </div>
                )}

                {/* Refresh Preview */}
                <button
                  type="button"
                  onClick={() => handleReprocess()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-800 hover:bg-slate-300 transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{lang === 'hi' ? 'रिफ्रेश प्रीव्यू देखें' : 'Refresh Live Preview'}</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>

            {activeTab !== 'crop' && (
              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                ← {lang === 'hi' ? 'क्रॉप पर वापस जाएं' : 'Back to Crop'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleApplyAndSave}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>{lang === 'hi' ? 'बदलाव सेव करें' : 'Save Changes'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
