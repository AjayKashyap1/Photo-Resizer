import React, { useState } from 'react';
import { BulkBarcodeItem, NamingTemplate, ProcessedImageItem } from '../types';
import {
  exportImagesAsZip,
  exportBarcodesAsZip,
  exportAllBundleZip,
  downloadBlob,
} from '../utils/zipExporter';
import { historyLogger } from '../utils/historyLogger';
import confetti from 'canvas-confetti';
import {
  X,
  FileArchive,
  Download,
  CheckCircle2,
  FolderArchive,
  Images,
  Barcode,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface ZipDownloadModalProps {
  images: ProcessedImageItem[];
  barcodes: BulkBarcodeItem[];
  onClose: () => void;
  lang: 'en' | 'hi';
}

export const ZipDownloadModal: React.FC<ZipDownloadModalProps> = ({
  images,
  barcodes,
  onClose,
  lang,
}) => {
  const [exportType, setExportType] = useState<'images' | 'barcodes' | 'bundle'>('images');
  const [zipFilename, setZipFilename] = useState('pixelcraft_batch_export.zip');
  const [namingPattern, setNamingPattern] = useState<NamingTemplate['pattern']>('original_resized');
  const [customPrefix, setCustomPrefix] = useState('photo_resized');
  const [includeDimensions, setIncludeDimensions] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  const readyImagesCount = images.filter((img) => img.outputBlob).length;
  const readyBarcodesCount = barcodes.filter((b) => b.blob).length;

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgressPercent(5);
    setProgressStatus('Initializing export...');

    const template: NamingTemplate = {
      pattern: namingPattern,
      prefix: customPrefix,
      includeDimensions,
    };

    try {
      let zipBlob: Blob;
      let targetName = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;

      if (exportType === 'images') {
        zipBlob = await exportImagesAsZip(
          images,
          targetName,
          template,
          (pct, status) => {
            setProgressPercent(pct);
            setProgressStatus(status);
          }
        );
      } else if (exportType === 'barcodes') {
        zipBlob = await exportBarcodesAsZip(
          barcodes,
          targetName,
          (pct, status) => {
            setProgressPercent(pct);
            setProgressStatus(status);
          }
        );
      } else {
        zipBlob = await exportAllBundleZip(
          images,
          barcodes,
          (pct, status) => {
            setProgressPercent(pct);
            setProgressStatus(status);
          }
        );
      }

      setProgressPercent(100);
      setProgressStatus('Download started!');
      downloadBlob(zipBlob, targetName);

      // Record to history and system logs
      const totalItems =
        exportType === 'images'
          ? readyImagesCount
          : exportType === 'barcodes'
          ? readyBarcodesCount
          : readyImagesCount + readyBarcodesCount;

      historyLogger.log(
        'success',
        'export',
        'ZIP Archive Exported',
        `Successfully packaged ${totalItems} items into "${targetName}" (${(zipBlob.size / (1024 * 1024)).toFixed(2)} MB).`,
        { targetName, exportType, totalItems, zipSize: zipBlob.size }
      );

      historyLogger.addHistory({
        actionType: 'zip_export',
        title: `Exported Archive: ${targetName}`,
        summary: `Created ZIP archive with ${totalItems} items (${(zipBlob.size / (1024 * 1024)).toFixed(2)} MB)`,
        itemCount: totalItems,
        processedTotalSize: zipBlob.size,
        metadata: {
          exportFilename: targetName,
        },
      });

      // Nice UX confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1200);
    } catch (e) {
      console.error('ZIP Export Error:', e);
      setIsExporting(false);
      alert('Failed to generate zip file: ' + e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <FileArchive className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'hi' ? 'डायरेक्ट ZIP डाउनलोड' : 'Direct Batch ZIP Package Export'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'hi' ? 'सभी फाइलों को एक .zip फॉर्मेट में डाउनलोड करें।' : 'Export all processed photos & generated barcodes in one archive.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* 1. What to Export */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {lang === 'hi' ? '1. क्या एक्सपोर्ट करना है?' : '1. Select Package Content'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setExportType('images')}
                className={`flex flex-col items-center justify-center rounded-xl p-3 text-center border transition ${
                  exportType === 'images'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold ring-1 ring-blue-500/30'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Images className="h-5 w-5 mb-1 text-blue-600" />
                <span className="text-xs">Resized Images</span>
                <span className="text-[10px] text-slate-500">({readyImagesCount} files)</span>
              </button>

              <button
                type="button"
                onClick={() => setExportType('barcodes')}
                className={`flex flex-col items-center justify-center rounded-xl p-3 text-center border transition ${
                  exportType === 'barcodes'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold ring-1 ring-emerald-500/30'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Barcode className="h-5 w-5 mb-1 text-emerald-600" />
                <span className="text-xs">Barcodes & QR</span>
                <span className="text-[10px] text-slate-500">({readyBarcodesCount} files)</span>
              </button>

              <button
                type="button"
                onClick={() => setExportType('bundle')}
                className={`flex flex-col items-center justify-center rounded-xl p-3 text-center border transition ${
                  exportType === 'bundle'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 font-bold ring-1 ring-purple-500/30'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FolderArchive className="h-5 w-5 mb-1 text-purple-600" />
                <span className="text-xs">All Bundle</span>
                <span className="text-[10px] text-slate-500">({readyImagesCount + readyBarcodesCount} files)</span>
              </button>
            </div>
          </div>

          {/* 2. ZIP Archive Filename */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {lang === 'hi' ? '2. ZIP फाइल का नाम' : '2. ZIP Archive Filename'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={zipFilename}
                onChange={(e) => setZipFilename(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Image File Naming Template (for images) */}
          {(exportType === 'images' || exportType === 'bundle') && (
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                {lang === 'hi' ? '3. फोटो फाइल नेमिंग पैटर्न' : '3. Output File Naming Rules'}
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'original_resized', label: 'Original Name + Resized' },
                  { id: 'custom_prefix', label: 'Custom Prefix (e.g. batch_001)' },
                  { id: 'dimensions', label: 'Dimensions (e.g. 1200x800_1)' },
                  { id: 'counter', label: 'Sequential (e.g. photo_001)' },
                ].map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => setNamingPattern(pat.id as any)}
                    className={`rounded-lg border p-2 text-left text-xs transition ${
                      namingPattern === pat.id
                        ? 'border-blue-500 bg-white text-blue-900 font-bold shadow-2xs'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>

              {namingPattern === 'custom_prefix' && (
                <div>
                  <span className="block text-[11px] font-medium text-slate-600 mb-1">Prefix Text:</span>
                  <input
                    type="text"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={includeDimensions}
                  onChange={(e) => setIncludeDimensions(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Include pixel dimensions in file name (e.g. _1200x800)</span>
              </label>
            </div>
          )}

          {/* Export Progress Bar */}
          {isExporting && (
            <div className="space-y-2 rounded-xl bg-blue-50 p-4 border border-blue-200">
              <div className="flex justify-between text-xs font-bold text-blue-900">
                <span>{progressStatus}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>

          <button
            id="start-zip-download-btn"
            type="button"
            onClick={handleStartExport}
            disabled={isExporting || (exportType === 'images' && readyImagesCount === 0) || (exportType === 'barcodes' && readyBarcodesCount === 0)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm shadow-blue-500/20 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>
              {isExporting
                ? 'Creating ZIP...'
                : lang === 'hi'
                ? 'ZIP डाउनलोड शुरू करें'
                : 'Download .ZIP Package'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
