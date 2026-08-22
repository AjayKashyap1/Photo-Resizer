import React, { useState } from 'react';
import { ProcessedImageItem } from '../../types';
import { formatBytes } from '../../utils/imageProcessor';
import { X, Download, Split, Columns, ZoomIn, ZoomOut, Check, ArrowRight } from 'lucide-react';

interface BeforeAfterModalProps {
  item: ProcessedImageItem | null;
  onClose: () => void;
  onDownload: (item: ProcessedImageItem) => void;
  lang: 'en' | 'hi';
}

export const BeforeAfterModal: React.FC<BeforeAfterModalProps> = ({
  item,
  onClose,
  onDownload,
  lang,
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('side-by-side');
  const [zoom, setZoom] = useState(1);

  if (!item) return null;

  const sizeSaved = item.outputSize
    ? item.originalSize - item.outputSize
    : 0;
  const percentSaved = item.outputSize
    ? ((sizeSaved / item.originalSize) * 100).toFixed(1)
    : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {lang === 'hi' ? 'पहले और बाद का तुलनात्मक दृश्य' : 'Before & After Comparison'}
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-md">{item.name}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('side-by-side')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                  viewMode === 'side-by-side'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Columns className="h-3.5 w-3.5" />
                <span>Side by Side</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('slider')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${
                  viewMode === 'slider'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Split className="h-3.5 w-3.5" />
                <span>Split Slider</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 bg-slate-50 border-b border-slate-200 px-6 py-3 text-xs sm:grid-cols-4 sm:divide-x">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Original Size</span>
            <p className="font-bold text-slate-800">
              {formatBytes(item.originalSize)} ({item.originalWidth}×{item.originalHeight}px)
            </p>
          </div>
          <div className="pl-4">
            <span className="text-[10px] uppercase font-bold text-blue-500">Output Size</span>
            <p className="font-bold text-blue-700">
              {item.outputSize ? formatBytes(item.outputSize) : '—'} ({item.outputWidth}×{item.outputHeight}px)
            </p>
          </div>
          <div className="pl-4">
            <span className="text-[10px] uppercase font-bold text-emerald-600">Space Saved</span>
            <p className="font-bold text-emerald-700">
              {sizeSaved > 0 ? `${formatBytes(sizeSaved)} (${percentSaved}%)` : 'Quality Optimized'}
            </p>
          </div>
          <div className="pl-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Format</span>
            <p className="font-bold text-slate-800">
              {item.outputBlob?.type || 'Standard'}
            </p>
          </div>
        </div>

        {/* Comparison Canvas Area */}
        <div className="relative flex-1 overflow-auto bg-slate-900/90 p-6 flex items-center justify-center">
          {viewMode === 'side-by-side' ? (
            <div className="grid h-full w-full grid-cols-1 gap-6 md:grid-cols-2">
              {/* Original */}
              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-800/80 p-4 border border-slate-700">
                <span className="mb-2 rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-white">
                  Original ({item.originalWidth} × {item.originalHeight} px)
                </span>
                <div className="flex-1 flex items-center justify-center overflow-hidden w-full max-h-[50vh]">
                  <img
                    src={item.originalUrl}
                    alt="Original"
                    className="max-h-full max-w-full object-contain rounded"
                  />
                </div>
              </div>

              {/* Output */}
              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-800/80 p-4 border border-blue-500/30">
                <span className="mb-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  Resized Output ({item.outputWidth} × {item.outputHeight} px)
                </span>
                <div className="flex-1 flex items-center justify-center overflow-hidden w-full max-h-[50vh]">
                  <img
                    src={item.outputUrl || item.originalUrl}
                    alt="Output"
                    className="max-h-full max-w-full object-contain rounded"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Split Interactive Slider */
            <div className="relative h-full max-h-[60vh] w-full max-w-3xl overflow-hidden rounded-xl bg-slate-800 flex items-center justify-center select-none">
              <img
                src={item.originalUrl}
                alt="Original"
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)` }}
              >
                <img
                  src={item.outputUrl || item.originalUrl}
                  alt="Output"
                  className="h-full w-full object-contain pointer-events-none"
                />
              </div>

              {/* Slider Handle Divider */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl cursor-ew-resize z-20"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -left-3.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg text-xs font-bold">
                  ↔
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-ew-resize z-30 w-full h-full"
              />

              {/* Float Labels */}
              <span className="absolute bottom-4 left-4 z-10 rounded bg-slate-900/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs">
                ← Original
              </span>
              <span className="absolute bottom-4 right-4 z-10 rounded bg-blue-600/90 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-xs">
                Processed →
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <p className="text-xs text-slate-500">
            {lang === 'hi'
              ? 'अल्ट्रा-फास्ट क्लाइंट-साइड रेंडरिंग द्वारा पिक्सेल प्रोसेस किए गए हैं।'
              : 'Lossless & high fidelity downsampling rendered directly in-browser.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              {lang === 'hi' ? 'बंद करें' : 'Close'}
            </button>
            <button
              type="button"
              onClick={() => {
                onDownload(item);
                onClose();
              }}
              disabled={!item.outputBlob}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm shadow-blue-500/20"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{lang === 'hi' ? 'यह फोटो डाउनलोड करें' : 'Download Photo'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
