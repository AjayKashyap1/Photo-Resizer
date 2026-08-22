import React, { useState, useEffect } from 'react';
import { ImageProcessingConfig, ProcessedImageItem, SupportedFormat } from '../../types';
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
} from 'lucide-react';

interface SingleImageEditorModalProps {
  item: ProcessedImageItem | null;
  baseConfig: ImageProcessingConfig;
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
  onSave,
  onClose,
  lang,
}) => {
  if (!item) return null;

  const origW = item.originalWidth;
  const origH = item.originalHeight;

  // Active Editor Sub-tab
  const [activeTab, setActiveTab] = useState<'crop' | 'tune'>('crop');

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
  });

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

                {/* Output Dimensions & Ratio Control */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {lang === 'hi' ? 'आउटपुट पिक्सेल आकार व अनुपात' : 'Output Dimensions & Ratio'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('crop')}
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Crop className="h-3 w-3" />
                      <span>{lang === 'hi' ? 'क्रॉप एडिटर' : 'Crop Tool'}</span>
                    </button>
                  </div>

                  {/* Quick Ratio Change Buttons */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-semibold text-slate-500">
                      {lang === 'hi' ? 'अनुपात बदलें (Aspect Ratio Override)' : 'Change Aspect Ratio'}
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
                        const isCurrent = Math.abs((config.width / config.height) - rItem.ratio) < 0.02;
                        return (
                          <button
                            key={rItem.label}
                            type="button"
                            onClick={() => {
                              const newHeight = Math.max(1, Math.round(config.width / rItem.ratio));
                              const newCfg = {
                                ...config,
                                height: newHeight,
                                aspectRatio: rItem.ratio,
                                maintainAspectRatio: true,
                              };
                              setConfig(newCfg);
                            }}
                            className={`rounded-lg py-1 px-1.5 text-[11px] font-bold transition border ${
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

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <span className="block text-[10px] font-semibold text-slate-500">Width (px)</span>
                      <input
                        type="number"
                        min="1"
                        value={config.width}
                        onChange={(e) => {
                          const w = Math.max(1, Number(e.target.value));
                          const h = config.maintainAspectRatio
                            ? Math.max(1, Math.round(w / config.aspectRatio))
                            : config.height;
                          const newCfg = { ...config, width: w, height: h };
                          setConfig(newCfg);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            maintainAspectRatio: !config.maintainAspectRatio,
                            aspectRatio: config.width / config.height,
                          })
                        }
                        title={config.maintainAspectRatio ? 'Aspect Ratio Locked' : 'Aspect Ratio Unlocked'}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                          config.maintainAspectRatio
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        {config.maintainAspectRatio ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex-1">
                      <span className="block text-[10px] font-semibold text-slate-500">Height (px)</span>
                      <input
                        type="number"
                        min="1"
                        value={config.height}
                        onChange={(e) => {
                          const h = Math.max(1, Number(e.target.value));
                          const w = config.maintainAspectRatio
                            ? Math.max(1, Math.round(h * config.aspectRatio))
                            : config.width;
                          const newCfg = { ...config, height: h, width: w };
                          setConfig(newCfg);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
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

            {activeTab === 'tune' && (
              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                ← Back to Crop
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
