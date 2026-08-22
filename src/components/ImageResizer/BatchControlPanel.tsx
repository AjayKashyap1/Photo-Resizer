import React, { useState } from 'react';
import {
  ImageProcessingConfig,
  DimensionUnit,
  ResizeMode,
  SupportedFormat,
} from '../../types';
import { DIMENSION_PRESETS } from '../../utils/sampleData';
import { unitToPixels, pixelsToUnit } from '../../utils/imageProcessor';
import {
  Lock,
  Unlock,
  Sliders,
  Sparkles,
  Maximize2,
  FileArchive,
  RefreshCw,
  Sun,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface BatchControlPanelProps {
  config: ImageProcessingConfig;
  onChange: (newConfig: ImageProcessingConfig) => void;
  onApplyAll: () => void;
  imageCount: number;
  isProcessing: boolean;
  lang: 'en' | 'hi';
}

export const BatchControlPanel: React.FC<BatchControlPanelProps> = ({
  config,
  onChange,
  onApplyAll,
  imageCount,
  isProcessing,
  lang,
}) => {
  const [activeUnit, setActiveUnit] = useState<DimensionUnit>('px');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update dimension helper
  const handleWidthChange = (val: number) => {
    const pxVal = unitToPixels(val, activeUnit, config.dpi);
    let newHeight = config.height;
    if (config.maintainAspectRatio && config.aspectRatio > 0) {
      newHeight = Math.max(1, Math.round(pxVal / config.aspectRatio));
    }
    onChange({
      ...config,
      width: Math.max(1, pxVal),
      height: newHeight,
    });
  };

  const handleHeightChange = (val: number) => {
    const pxVal = unitToPixels(val, activeUnit, config.dpi);
    let newWidth = config.width;
    if (config.maintainAspectRatio && config.aspectRatio > 0) {
      newWidth = Math.max(1, Math.round(pxVal * config.aspectRatio));
    }
    onChange({
      ...config,
      height: Math.max(1, pxVal),
      width: newWidth,
    });
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = DIMENSION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const newAspect = preset.width / preset.height;
    onChange({
      ...config,
      resizeMode: 'exact',
      width: preset.width,
      height: preset.height,
      aspectRatio: newAspect,
      maintainAspectRatio: true,
    });
  };

  const currentDisplayWidth = pixelsToUnit(config.width, activeUnit, config.dpi);
  const currentDisplayHeight = pixelsToUnit(config.height, activeUnit, config.dpi);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Sliders className="h-4 w-4 text-blue-600" />
            <span>
              {lang === 'hi'
                ? 'बैच और पिक्सेल कंट्रोल पैनल'
                : 'Bulk Resize & Quality Controls'}
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'hi'
              ? 'यहाँ सेटिंग्स बदलें और सभी फोटो पर एक साथ लागू करें।'
              : 'Configure pixel dimensions, file format, and compression parameters.'}
          </p>
        </div>

        {/* Action Button */}
        <button
          id="apply-to-all-btn"
          onClick={onApplyAll}
          disabled={isProcessing || imageCount === 0}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition shadow-sm ${
            isProcessing || imageCount === 0
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-500/20 cursor-pointer'
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>
            {lang === 'hi'
              ? `सभी ${imageCount} फोटो पर लागू करें`
              : `Process All (${imageCount} Photos)`}
          </span>
        </button>
      </div>

      {/* Main Grid Controls */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        
        {/* Column 1: Resize Mode & Presets */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {lang === 'hi' ? '1. रिसाइज मोड व प्रीसेट' : '1. Mode & Presets'}
          </label>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              id="mode-exact-btn"
              type="button"
              onClick={() => onChange({ ...config, resizeMode: 'exact' })}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                config.resizeMode === 'exact'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'hi' ? 'पिक्सेल (Px)' : 'Exact Pixels'}
            </button>
            <button
              id="mode-percentage-btn"
              type="button"
              onClick={() => onChange({ ...config, resizeMode: 'percentage' })}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                config.resizeMode === 'percentage'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'hi' ? 'प्रतिशत (%)' : 'Percentage %'}
            </button>
          </div>

          {/* Presets dropdown */}
          {config.resizeMode === 'exact' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {lang === 'hi' ? 'रेडिमेड प्रीसेट्स (Social, Passport, E-com)' : 'Quick Presets'}
              </label>
              <select
                id="preset-select-dropdown"
                onChange={(e) => handlePresetSelect(e.target.value)}
                defaultValue=""
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition"
              >
                <option value="" disabled>
                  {lang === 'hi' ? '-- प्रीसेट चुनें --' : '-- Choose a Preset --'}
                </option>
                {['E-Commerce', 'Passport & ID', 'Social Media', 'Display / Web', 'Print & Paper'].map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {DIMENSION_PRESETS.filter((p) => p.category === cat).map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name} ({preset.width}x{preset.height} {preset.unit})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Column 2: Dimensions & Aspect Ratio */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              {lang === 'hi' ? '2. डायमेंशन और अनुपात' : '2. Dimensions & Ratio'}
            </label>

            {/* Units */}
            {config.resizeMode === 'exact' && (
              <div className="flex items-center gap-1">
                {(['px', 'mm', 'cm', 'in'] as DimensionUnit[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setActiveUnit(u)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase transition ${
                      activeUnit === u
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>

          {config.resizeMode === 'exact' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {/* Width */}
                <div className="flex-1">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                    {lang === 'hi' ? 'चौड़ाई (Width)' : 'Width'} ({activeUnit})
                  </span>
                  <input
                    id="input-width"
                    type="number"
                    min="1"
                    value={currentDisplayWidth}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Aspect Lock */}
                <div className="pt-4">
                  <button
                    id="toggle-aspect-ratio-btn"
                    type="button"
                    onClick={() =>
                      onChange({
                        ...config,
                        maintainAspectRatio: !config.maintainAspectRatio,
                        aspectRatio: config.width / config.height,
                      })
                    }
                    title={config.maintainAspectRatio ? 'Aspect Ratio Locked' : 'Aspect Ratio Unlocked'}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                      config.maintainAspectRatio
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {config.maintainAspectRatio ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Height */}
                <div className="flex-1">
                  <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                    {lang === 'hi' ? 'ऊंचाई (Height)' : 'Height'} ({activeUnit})
                  </span>
                  <input
                    id="input-height"
                    type="number"
                    min="1"
                    value={currentDisplayHeight}
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* DPI Setting */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs">
                <div>
                  <span className="font-bold text-slate-800 block text-[11px]">
                    {lang === 'hi' ? 'DPI (प्रिंट रेजोल्यूशन)' : 'DPI (Print Density)'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {config.dpi || 96} DPI ({config.dpi >= 300 ? 'Print Standard' : config.dpi >= 150 ? 'Medium' : 'Screen'})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    id="batch-dpi-select"
                    value={config.dpi || 96}
                    onChange={(e) => onChange({ ...config, dpi: Number(e.target.value) })}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={72}>72 DPI (Web)</option>
                    <option value={96}>96 DPI (Standard)</option>
                    <option value={150}>150 DPI (Draft Print)</option>
                    <option value={200}>200 DPI (Medium Print)</option>
                    <option value={300}>300 DPI (HQ Print / Visa)</option>
                    <option value={600}>600 DPI (Ultra HD)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span>{lang === 'hi' ? 'स्केल प्रतिशत' : 'Scale Factor'}</span>
                <span className="font-bold text-blue-600">{config.percentage}%</span>
              </div>
              <input
                id="input-percentage-slider"
                type="range"
                min="10"
                max="300"
                step="5"
                value={config.percentage}
                onChange={(e) => onChange({ ...config, percentage: Number(e.target.value) })}
                className="h-2 w-full cursor-pointer accent-blue-600"
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>25% (Small)</span>
                <span>100% (Original)</span>
                <span>200% (Enlarge)</span>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Format & Quality */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {lang === 'hi' ? '3. फॉर्मेट और क्वालिटी' : '3. Format & Quality'}
          </label>

          {/* Format pills */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            {(['image/jpeg', 'image/png', 'image/webp'] as SupportedFormat[]).map((fmt) => {
              const label = fmt === 'image/jpeg' ? 'JPEG' : fmt === 'image/png' ? 'PNG' : 'WEBP';
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => onChange({ ...config, format: fmt })}
                  className={`rounded-lg py-1.5 text-xs font-bold transition ${
                    config.format === fmt
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Quality Slider (unless PNG) */}
          {config.format !== 'image/png' ? (
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                <span>{lang === 'hi' ? 'क्वालिटी (कंप्रेशन)' : 'Quality'}</span>
                <span className="font-bold text-blue-600">
                  {Math.round(config.quality * 100)}%
                </span>
              </div>
              <input
                id="input-quality-slider"
                type="range"
                min="5"
                max="100"
                step="5"
                value={Math.round(config.quality * 100)}
                onChange={(e) =>
                  onChange({ ...config, quality: Number(e.target.value) / 100 })
                }
                className="h-2 w-full cursor-pointer accent-blue-600"
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>Low Size</span>
                <span>Balanced (85%)</span>
                <span>Lossless (100%)</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              PNG format provides lossless transparency. Quality slider is auto-optimized.
            </p>
          )}
        </div>

        {/* Column 4: Target KB Optimizer */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {lang === 'hi' ? '4. टारगेट फाइल साइज (KB)' : '4. Target Max File Size'}
          </label>

          <div>
            <div className="flex items-center gap-2">
              <input
                id="input-target-kb"
                type="number"
                min="0"
                max="10000"
                placeholder="0 (Unlimited)"
                value={config.targetMaxKb || ''}
                onChange={(e) =>
                  onChange({ ...config, targetMaxKb: Math.max(0, Number(e.target.value)) })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-xs font-bold text-slate-600">KB</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {lang === 'hi'
                ? 'सरकारी फॉर्म / पोर्टल के लिए लिमिट (उदा. 50 KB, 100 KB)'
                : 'Govt forms / Portal file limits (e.g. 50 KB, 100 KB, 200 KB)'}
            </p>
          </div>

          {/* Quick Target KB pills */}
          <div className="flex flex-wrap gap-1">
            {[20, 50, 100, 200, 500].map((kb) => (
              <button
                key={kb}
                type="button"
                onClick={() => onChange({ ...config, targetMaxKb: kb })}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition ${
                  config.targetMaxKb === kb
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                &lt; {kb} KB
              </button>
            ))}
            {config.targetMaxKb > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...config, targetMaxKb: 0 })}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-50 font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Advanced Adjustments Toggle (Filters, Sharpen, Rotation) */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <button
          id="toggle-advanced-settings-btn"
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          <span>
            {showAdvanced
              ? lang === 'hi'
                ? 'अतिरिक्त इफेक्ट्स छुपाएं'
                : 'Hide Advanced Adjustments'
              : lang === 'hi'
              ? 'अतिरिक्त इफेक्ट्स (शार्पन, ब्राइटनेस, ग्रे-स्केल, बैकग्राउंड)'
              : 'Advanced Adjustments (Sharpen, Brightness, Grayscale, Background Color)'}
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 md:grid-cols-4 border border-slate-200">
            {/* Brightness */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>{lang === 'hi' ? 'ब्राइटनेस' : 'Brightness'}</span>
                <span>{config.brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={config.brightness}
                onChange={(e) => onChange({ ...config, brightness: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer accent-blue-600"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>{lang === 'hi' ? 'कंट्रास्ट' : 'Contrast'}</span>
                <span>{config.contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={config.contrast}
                onChange={(e) => onChange({ ...config, contrast: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer accent-blue-600"
              />
            </div>

            {/* Grayscale and Sharpen toggles */}
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.grayscale}
                  onChange={(e) => onChange({ ...config, grayscale: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{lang === 'hi' ? 'ब्लैक एंड व्हाइट (B&W)' : 'Grayscale (B&W)'}</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.sharpen}
                  onChange={(e) => onChange({ ...config, sharpen: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{lang === 'hi' ? 'शार्पन फिल्टर (Crisp)' : 'Sharpen Filter'}</span>
              </label>
            </div>

            {/* Background Color */}
            <div>
              <span className="block text-[11px] font-medium text-slate-600 mb-1">
                {lang === 'hi' ? 'बैकग्राउंड रंग (JPG के लिए)' : 'Background Color'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.backgroundColor === 'transparent' ? '#ffffff' : config.backgroundColor}
                  onChange={(e) => onChange({ ...config, backgroundColor: e.target.value })}
                  className="h-7 w-9 cursor-pointer rounded border border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => onChange({ ...config, backgroundColor: '#ffffff' })}
                  className="rounded bg-white border border-slate-200 px-2 py-1 text-[11px] text-slate-700 font-semibold"
                >
                  White
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...config, backgroundColor: '#000000' })}
                  className="rounded bg-slate-900 px-2 py-1 text-[11px] text-white font-semibold"
                >
                  Black
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
