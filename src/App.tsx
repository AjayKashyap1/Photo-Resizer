import React, { useEffect, useState, useCallback } from 'react';
import {
  ImageProcessingConfig,
  ProcessedImageItem,
  BulkBarcodeItem,
} from './types';
import {
  DEFAULT_CONFIG,
  processImage,
  loadImage,
} from './utils/imageProcessor';
import { SAMPLE_IMAGES, SAMPLE_BARCODES } from './utils/sampleData';
import { downloadBlob, generateImageFilename } from './utils/zipExporter';
import { Header } from './components/Header';
import { ImageUploadZone } from './components/ImageResizer/ImageUploadZone';
import { BatchControlPanel } from './components/ImageResizer/BatchControlPanel';
import { ImageCard } from './components/ImageResizer/ImageCard';
import { BeforeAfterModal } from './components/ImageResizer/BeforeAfterModal';
import { SingleImageEditorModal } from './components/ImageResizer/SingleImageEditorModal';
import { BarcodeStudio } from './components/BarcodeGenerator/BarcodeStudio';
import { BulkBarcodeManager } from './components/BarcodeGenerator/BulkBarcodeManager';
import { PrintableSheetModal } from './components/BarcodeGenerator/PrintableSheetModal';
import { BarcodeOverlayTool } from './components/BarcodeOverlayTool';
import { ZipDownloadModal } from './components/ZipDownloadModal';
import { HistoryAndLogsView } from './components/HistoryAndLogs/HistoryAndLogsView';
import { historyLogger, LogEntry } from './utils/historyLogger';
import {
  Sparkles,
  Download,
  Trash2,
  Sliders,
  Images,
  Barcode,
  Layers,
  FileArchive,
  RefreshCw,
  Plus,
  History,
  Terminal,
  Activity,
} from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [activeTab, setActiveTab] = useState<'resizer' | 'barcode' | 'overlay' | 'history'>('resizer');
  const [latestLog, setLatestLog] = useState<LogEntry | null>(null);
  
  // Images state
  const [images, setImages] = useState<ProcessedImageItem[]>([]);
  const [globalConfig, setGlobalConfig] = useState<ImageProcessingConfig>(DEFAULT_CONFIG);
  const [isProcessing, setIsProcessing] = useState(false);

  // Barcodes state
  const [barcodes, setBarcodes] = useState<BulkBarcodeItem[]>([]);

  // Modals state
  const [inspectItem, setInspectItem] = useState<ProcessedImageItem | null>(null);
  const [editItem, setEditItem] = useState<ProcessedImageItem | null>(null);
  const [showZipModal, setShowZipModal] = useState(false);
  const [showPrintSheetModal, setShowPrintSheetModal] = useState(false);

  // Subscribe to latest log
  useEffect(() => {
    const unsub = historyLogger.subscribeLogs((logs) => {
      if (logs.length > 0) {
        setLatestLog(logs[0]);
      }
    });
    return () => unsub();
  }, []);

  // Process a single item with config
  const runProcessSingle = async (
    item: ProcessedImageItem,
    cfg = globalConfig
  ): Promise<ProcessedImageItem> => {
    try {
      const result = await processImage(item.originalUrl, item.customConfig ? { ...cfg, ...item.customConfig } : cfg);
      return {
        ...item,
        outputBlob: result.blob,
        outputUrl: result.dataUrl,
        outputWidth: result.width,
        outputHeight: result.height,
        outputSize: result.size,
        isProcessing: false,
        error: undefined,
      };
    } catch (err: any) {
      return {
        ...item,
        isProcessing: false,
        error: err.message || 'Processing failed',
      };
    }
  };

  // Batch process all images with given or current config
  const handleProcessAllImages = useCallback(async (cfg = globalConfig, currentList = images) => {
    if (currentList.length === 0) return;
    const startTime = performance.now();
    setIsProcessing(true);

    historyLogger.log(
      'info',
      'resizer',
      'Batch Processing Started',
      `Starting processing of ${currentList.length} photos (${cfg.resizeMode}, ${cfg.width}x${cfg.height}px, ${cfg.format.split('/')[1].toUpperCase()}).`
    );

    // Mark all as processing
    setImages((prev) => prev.map((img) => ({ ...img, isProcessing: true })));

    const updatedList: ProcessedImageItem[] = [];

    for (let i = 0; i < currentList.length; i++) {
      const item = currentList[i];
      const processed = await runProcessSingle(item, cfg);
      updatedList.push(processed);

      // Update state incrementally for responsive feedback
      setImages([...updatedList, ...currentList.slice(i + 1).map((x) => ({ ...x, isProcessing: true }))]);
    }

    setImages(updatedList);
    setIsProcessing(false);
    const duration = Math.round(performance.now() - startTime);

    // Compute size savings & stats
    const totalOriginalSize = updatedList.reduce((acc, cur) => acc + (cur.originalSize || 0), 0);
    const totalOutputSize = updatedList.reduce((acc, cur) => acc + (cur.outputSize || 0), 0);
    const savedBytes = Math.max(0, totalOriginalSize - totalOutputSize);

    // Determine action type
    let actionType: 'image_resize' | 'image_upscale' | 'border_frame' = 'image_resize';
    let title = `Batch Photo Resized (${updatedList.length} photos)`;
    if (cfg.resizeMode === 'upscale') {
      actionType = 'image_upscale';
      title = `AI Super-Resolution (${cfg.upscaleFactor || 2}x) Applied`;
    } else if (cfg.addBorder) {
      actionType = 'border_frame';
      title = `Extra Border & Framing (${cfg.borderWidth || 20}px)`;
    }

    historyLogger.log(
      'success',
      cfg.resizeMode === 'upscale' ? 'upscale' : cfg.addBorder ? 'border' : 'resizer',
      'Batch Processing Completed',
      `Processed ${updatedList.length} photos in ${duration}ms. Original: ${(totalOriginalSize / 1024).toFixed(1)} KB → Output: ${(totalOutputSize / 1024).toFixed(1)} KB (Saved ${(savedBytes / 1024).toFixed(1)} KB).`,
      {
        itemCount: updatedList.length,
        durationMs: duration,
        dimensions: `${cfg.width}x${cfg.height}`,
        format: cfg.format,
      },
      duration
    );

    // Save record to history
    historyLogger.addHistory({
      actionType,
      title,
      summary: `Processed ${updatedList.length} photos to ${cfg.width}x${cfg.height}px (${cfg.format.split('/')[1].toUpperCase()}, Q${Math.round(cfg.quality * 100)}%). Total space saved: ${(savedBytes / (1024 * 1024)).toFixed(2)} MB`,
      itemCount: updatedList.length,
      originalTotalSize: totalOriginalSize,
      processedTotalSize: totalOutputSize,
      savedBytes,
      previewUrls: updatedList.slice(0, 3).map((u) => u.outputUrl || u.originalUrl),
      metadata: {
        filenames: updatedList.map((u) => u.name),
        dimensions: `${cfg.width}x${cfg.height} px`,
        targetFormat: cfg.format,
        appliedConfig: {
          resizeMode: cfg.resizeMode,
          width: cfg.width,
          height: cfg.height,
          quality: cfg.quality,
          dpi: cfg.dpi,
          addBorder: cfg.addBorder,
          borderWidth: cfg.borderWidth,
        },
      },
    });
  }, [images, globalConfig]);

  // Handle uploaded files
  const handleFilesSelected = async (files: File[]) => {
    const newItems: ProcessedImageItem[] = [];

    for (const file of files) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        newItems.push({
          id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          file,
          name: file.name,
          originalUrl: url,
          originalWidth: img.naturalWidth || img.width,
          originalHeight: img.naturalHeight || img.height,
          originalSize: file.size,
          originalFormat: file.type,
          outputBlob: null,
          outputUrl: null,
          outputWidth: 0,
          outputHeight: 0,
          outputSize: 0,
          isProcessing: true,
        });
      } catch (e) {
        console.error('Failed to read image metadata', e);
        historyLogger.log('error', 'resizer', 'Image Load Failed', `Could not decode image ${file.name}`);
      }
    }

    if (newItems.length > 0) {
      historyLogger.log(
        'info',
        'resizer',
        'Files Imported',
        `Imported ${newItems.length} image file(s) into workspace.`
      );
      const combined = [...images, ...newItems];
      setImages(combined);
      // Auto process the newly added batch
      handleProcessAllImages(globalConfig, combined);
    }
  };

  // Load rich sample demo data
  const handleLoadSamples = async () => {
    const sampleList: ProcessedImageItem[] = [];

    for (const sample of SAMPLE_IMAGES) {
      sampleList.push({
        id: 'sample_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        file: null,
        name: sample.name,
        originalUrl: sample.url,
        originalWidth: sample.width,
        originalHeight: sample.height,
        originalSize: sample.size,
        originalFormat: sample.format,
        outputBlob: null,
        outputUrl: null,
        outputWidth: 0,
        outputHeight: 0,
        outputSize: 0,
        isProcessing: true,
      });
    }

    historyLogger.log(
      'info',
      'system',
      'Demo Samples Loaded',
      `Loaded ${SAMPLE_IMAGES.length} demo images and preset configurations.`
    );

    const combined = [...images, ...sampleList];
    setImages(combined);
    handleProcessAllImages(globalConfig, combined);
  };

  // Clear all images & barcodes
  const handleClearAll = () => {
    if (window.confirm(lang === 'hi' ? 'क्या आप सभी फाइलों को हटाना चाहते हैं?' : 'Are you sure you want to clear all images and barcodes?')) {
      // revoke blob urls
      images.forEach((img) => {
        if (img.outputUrl) URL.revokeObjectURL(img.outputUrl);
      });
      setImages([]);
      setBarcodes([]);
      historyLogger.log('info', 'system', 'Workspace Cleared', 'All images and barcodes were removed from active workspace.');
    }
  };

  // Download a single processed image
  const handleDownloadSingleImage = (item: ProcessedImageItem) => {
    if (item.outputBlob) {
      const filename = generateImageFilename(
        item.name,
        0,
        item.outputWidth,
        item.outputHeight,
        item.outputBlob.type
      );
      downloadBlob(item.outputBlob, filename);
      historyLogger.log(
        'success',
        'export',
        'Single Photo Downloaded',
        `Saved "${filename}" (${item.outputWidth}x${item.outputHeight}px, ${(item.outputBlob.size / 1024).toFixed(1)} KB).`
      );
    }
  };

  // Delete a single image
  const handleDeleteImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Update item from single editor
  const handleSaveEditedItem = (updated: ProcessedImageItem) => {
    setImages((prev) => prev.map((img) => (img.id === updated.id ? updated : img)));

    historyLogger.log(
      'success',
      'resizer',
      'Photo Fine-Tuned',
      `Saved custom adjustments for "${updated.name}" (${updated.outputWidth}x${updated.outputHeight}px).`
    );

    historyLogger.addHistory({
      actionType: 'image_resize',
      title: `Fine-Tuned: ${updated.name}`,
      summary: `Custom cropped, resized or enhanced image to ${updated.outputWidth}x${updated.outputHeight}px (${(updated.outputSize / 1024).toFixed(1)} KB)`,
      itemCount: 1,
      originalTotalSize: updated.originalSize,
      processedTotalSize: updated.outputSize,
      savedBytes: Math.max(0, updated.originalSize - updated.outputSize),
      previewUrls: [updated.outputUrl || updated.originalUrl],
      metadata: {
        filenames: [updated.name],
        dimensions: `${updated.outputWidth}x${updated.outputHeight} px`,
      },
    });
  };

  // Global clipboard paste support (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const imageFiles = Array.from(e.clipboardData.files).filter((f) =>
          f.type.startsWith('image/')
        );
        if (imageFiles.length > 0) {
          handleFilesSelected(imageFiles);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [images, globalConfig]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Main Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        imageCount={images.length}
        barcodeCount={barcodes.length}
        onDownloadAllZip={() => setShowZipModal(true)}
        onClearAll={handleClearAll}
        onLoadSamples={handleLoadSamples}
        lang={lang}
        setLang={setLang}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* TAB 1: Photo Pixel & Quality Resizer */}
        {activeTab === 'resizer' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* Batch Control Panel */}
            <BatchControlPanel
              config={globalConfig}
              onChange={(newCfg) => {
                setGlobalConfig(newCfg);
              }}
              onApplyAll={() => handleProcessAllImages(globalConfig, images)}
              imageCount={images.length}
              isProcessing={isProcessing}
              lang={lang}
            />

            {/* Upload Area or Top Action Bar */}
            {images.length === 0 ? (
              <ImageUploadZone
                onFilesSelected={handleFilesSelected}
                onLoadSamples={handleLoadSamples}
                lang={lang}
              />
            ) : (
              <div className="space-y-4">
                
                {/* Status and quick add toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-sm">
                      {images.length}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {lang === 'hi' ? 'अपलोड की गई फोटो फाइल्स' : 'Processed Photos Workspace'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {images.filter((i) => i.outputBlob).length} / {images.length}{' '}
                        {lang === 'hi' ? 'फोटो तैयार हैं' : 'ready for download or export'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Add more button */}
                    <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs">
                      <Plus className="h-3.5 w-3.5" />
                      <span>{lang === 'hi' ? 'और फोटो जोड़ें' : 'Add More Photos'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleFilesSelected(Array.from(e.target.files));
                            e.target.value = '';
                          }
                        }}
                        className="hidden"
                      />
                    </label>

                    {/* Download All ZIP */}
                    <button
                      id="download-all-images-zip-btn"
                      type="button"
                      onClick={() => setShowZipModal(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm shadow-blue-500/20 cursor-pointer"
                    >
                      <FileArchive className="h-3.5 w-3.5" />
                      <span>{lang === 'hi' ? 'सभी ZIP डाउनलोड' : 'Download All (ZIP)'}</span>
                    </button>
                  </div>
                </div>

                {/* Grid of Image Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {images.map((item, idx) => (
                    <ImageCard
                      key={item.id}
                      item={item}
                      index={idx}
                      onDownload={handleDownloadSingleImage}
                      onDelete={handleDeleteImage}
                      onInspect={(it) => setInspectItem(it)}
                      onEdit={(it) => setEditItem(it)}
                      lang={lang}
                    />
                  ))}
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 2: Barcode & QR Studio */}
        {activeTab === 'barcode' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Single Interactive Barcode Studio */}
            <BarcodeStudio
              onAddBarcodeToBatch={(bc) => setBarcodes((prev) => [...prev, bc])}
              lang={lang}
              onOpenPrintSheet={() => setShowPrintSheetModal(true)}
            />

            {/* Bulk Barcode Generator */}
            <BulkBarcodeManager
              barcodes={barcodes}
              setBarcodes={setBarcodes}
              onOpenPrintSheet={() => setShowPrintSheetModal(true)}
              lang={lang}
            />
          </div>
        )}

        {/* TAB 3: Barcode Overlay on Photos */}
        {activeTab === 'overlay' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <BarcodeOverlayTool
              config={globalConfig}
              onChangeConfig={(newCfg) => setGlobalConfig(newCfg)}
              onApplyAll={() => handleProcessAllImages(globalConfig, images)}
              images={images}
              lang={lang}
            />

            {/* Grid preview of images with stamped barcodes */}
            {images.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {images.map((item, idx) => (
                  <ImageCard
                    key={item.id}
                    item={item}
                    index={idx}
                    onDownload={handleDownloadSingleImage}
                    onDelete={handleDeleteImage}
                    onInspect={(it) => setInspectItem(it)}
                    onEdit={(it) => setEditItem(it)}
                    lang={lang}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center bg-white">
                <p className="text-sm font-semibold text-slate-700">
                  {lang === 'hi' ? 'कोई फोटो अपलोड नहीं है' : 'No photos uploaded yet'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === 'hi'
                    ? 'पहले "फोटो पिक्सेल और साइज" टैब में फोटो अपलोड करें।'
                    : 'Upload photos first to see live barcode stamping.'}
                </p>
                <button
                  type="button"
                  onClick={handleLoadSamples}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{lang === 'hi' ? 'डेमो फोटो लोड करें' : 'Load Demo Photos'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: History & System Event Logs */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <HistoryAndLogsView
              lang={lang}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          </div>
        )}

      </main>

      {/* Floating Live Activity Stream Bar / Ticker (when not on history tab) */}
      {latestLog && activeTab !== 'history' && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md hidden sm:block animate-in slide-in-from-bottom-2 fade-in">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className="group flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/95 px-3.5 py-2 text-left text-xs text-white shadow-xl backdrop-blur-md transition hover:border-blue-500 hover:bg-slate-900 cursor-pointer"
          >
            <div className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold uppercase text-slate-400">
                  {latestLog.category}
                </span>
                <span className="text-[10px] text-slate-500">•</span>
                <span className="truncate font-semibold text-slate-200 text-[11px]">
                  {latestLog.title}
                </span>
              </div>
              <p className="truncate text-[10px] text-slate-400 font-mono">
                {latestLog.message}
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
              <History className="h-3 w-3" />
              <span>Logs</span>
            </div>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 print:hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">PixelCraft & Barcode Studio</span>
            <span>•</span>
            <span>Single & Bulk Image Resizer, Compressor & Multi-format Barcode Generator</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Client-side 100% Privacy</span>
            <span>•</span>
            <span>EAN-13, UPC, QR, Code128</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* Before & After Inspector Modal */}
      {inspectItem && (
        <BeforeAfterModal
          item={inspectItem}
          onClose={() => setInspectItem(null)}
          onDownload={handleDownloadSingleImage}
          lang={lang}
        />
      )}

      {/* Single Photo Fine-Tuning Modal */}
      {editItem && (
        <SingleImageEditorModal
          item={editItem}
          baseConfig={globalConfig}
          onSave={handleSaveEditedItem}
          onClose={() => setEditItem(null)}
          lang={lang}
        />
      )}

      {/* Printable Barcode Sheet Modal */}
      {showPrintSheetModal && (
        <PrintableSheetModal
          barcodes={barcodes.length > 0 ? barcodes : [
            {
              id: 'demo_bc',
              type: 'ean13',
              text: '8901030384355',
              labelTitle: 'Product Sample',
              labelPrice: '₹199.00',
              dataUrl: '',
            },
          ]}
          onClose={() => setShowPrintSheetModal(false)}
          lang={lang}
        />
      )}

      {/* Direct Batch ZIP Download Modal */}
      {showZipModal && (
        <ZipDownloadModal
          images={images}
          barcodes={barcodes}
          onClose={() => setShowZipModal(false)}
          lang={lang}
        />
      )}

    </div>
  );
}
