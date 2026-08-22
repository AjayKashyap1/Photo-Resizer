import React, { useState } from 'react';
import { ImageProcessingConfig, ProcessedImageItem } from '../types';
import { BARCODE_TYPES } from '../utils/barcodeGenerator';
import { Layers, Sparkles, Check, RefreshCw, Stamp } from 'lucide-react';

interface BarcodeOverlayToolProps {
  config: ImageProcessingConfig;
  onChangeConfig: (newConfig: ImageProcessingConfig) => void;
  onApplyAll: () => void;
  images: ProcessedImageItem[];
  lang: 'en' | 'hi';
}

export const BarcodeOverlayTool: React.FC<BarcodeOverlayToolProps> = ({
  config,
  onChangeConfig,
  onApplyAll,
  images,
  lang,
}) => {
  const [barcodeText, setBarcodeText] = useState(config.overlayBarcodeData || 'PROD-890123');
  const [barcodeType, setBarcodeType] = useState(config.overlayBarcodeType || 'qrcode');

  const handleUpdate = (updates: Partial<ImageProcessingConfig>) => {
    onChangeConfig({
      ...config,
      ...updates,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Stamp className="h-5 w-5 text-purple-600" />
            <span>{lang === 'hi' ? 'फोटो पर बारकोड स्टैम्पिंग (वाटरमार्क / लेबल)' : 'Stamp Barcode / QR directly onto Photos'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'hi'
              ? 'अपनी रिसाइज की गई फोटो के कोने या सेंटर में बारकोड स्टैम्प करें।'
              : 'Automatically embed and overlay generated barcodes / QR tags onto all batch photos.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            handleUpdate({
              overlayBarcode: !config.overlayBarcode,
              overlayBarcodeData: barcodeText,
              overlayBarcodeType: barcodeType,
            });
            setTimeout(() => onApplyAll(), 50);
          }}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition shadow-sm ${
            config.overlayBarcode
              ? 'bg-purple-600 hover:bg-purple-700 active:scale-95 shadow-purple-500/20'
              : 'bg-slate-800 hover:bg-slate-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>
            {config.overlayBarcode
              ? lang === 'hi'
                ? 'स्टैम्प ऑन है (अपडेट करें)'
                : 'Barcode Stamp Active (Update)'
              : lang === 'hi'
              ? 'स्टैम्प चालू करें'
              : 'Enable Barcode Stamping'}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        
        {/* Step 1: Barcode Data & Type */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Barcode Tag Data
          </label>

          <div>
            <span className="block text-[11px] font-medium text-slate-600 mb-1">Barcode Type</span>
            <select
              value={barcodeType}
              onChange={(e) => {
                setBarcodeType(e.target.value);
                handleUpdate({ overlayBarcodeType: e.target.value });
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800"
            >
              {BARCODE_TYPES.map((bt) => (
                <option key={bt.type} value={bt.type}>
                  {bt.type.toUpperCase()} - {bt.name.split('(')[0]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[11px] font-medium text-slate-600 mb-1">Payload / Text</span>
            <input
              type="text"
              value={barcodeText}
              onChange={(e) => {
                setBarcodeText(e.target.value);
                handleUpdate({ overlayBarcodeData: e.target.value });
              }}
              placeholder="e.g. SKU-10492"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900"
            />
          </div>
        </div>

        {/* Step 2: Position */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            2. Stamp Position
          </label>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'top-left', label: 'Top Left' },
              { id: 'center', label: 'Center' },
              { id: 'top-right', label: 'Top Right' },
              { id: 'bottom-left', label: 'Bottom Left' },
              { id: 'bottom-center', label: 'Bottom Mid' },
              { id: 'bottom-right', label: 'Bottom Right' },
            ].map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => handleUpdate({ overlayPosition: pos.id as any })}
                className={`rounded-xl border p-2 text-center text-xs font-semibold transition ${
                  config.overlayPosition === pos.id
                    ? 'border-purple-600 bg-purple-50 text-purple-700 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Size & Opacity */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            3. Scale & Transparency
          </label>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
              <span>Stamp Size</span>
              <span>{config.overlayScale || 25}% of photo</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              value={config.overlayScale || 25}
              onChange={(e) => handleUpdate({ overlayScale: Number(e.target.value) })}
              className="h-1.5 w-full cursor-pointer accent-purple-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
              <span>Opacity</span>
              <span>{Math.round((config.overlayOpacity || 0.9) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={config.overlayOpacity || 0.9}
              onChange={(e) => handleUpdate({ overlayOpacity: Number(e.target.value) })}
              className="h-1.5 w-full cursor-pointer accent-purple-600"
            />
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          {images.length} photo(s) currently ready in your batch workspace.
        </p>

        <button
          type="button"
          onClick={onApplyAll}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white hover:bg-purple-700 transition shadow-sm cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{lang === 'hi' ? 'सभी फोटो पर बारकोड स्टैम्प लागू करें' : 'Apply Stamp to All Photos'}</span>
        </button>
      </div>

    </div>
  );
};
