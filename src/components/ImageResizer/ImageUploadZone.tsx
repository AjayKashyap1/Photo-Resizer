import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, FolderUp, Plus } from 'lucide-react';

interface ImageUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSamples: () => void;
  lang: 'en' | 'hi';
  compact?: boolean;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  onFilesSelected,
  onLoadSamples,
  lang,
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = (Array.from(e.dataTransfer.files) as File[]).filter((file) =>
        file.type.startsWith('image/')
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = (Array.from(e.target.files) as File[]).filter((file) =>
        file.type.startsWith('image/')
      );
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
      // reset value so same file can be re-uploaded
      e.target.value = '';
    }
  };

  if (compact) {
    return (
      <div
        id="compact-upload-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center justify-between rounded-xl border-2 border-dashed p-4 transition cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-300 bg-slate-50/70 hover:border-blue-400 hover:bg-slate-100/60'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*"
          className="hidden"
        />
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {lang === 'hi' ? 'और फोटो जोड़ें (सिंगल या बल्क)' : 'Add More Photos (Single or Bulk)'}
            </p>
            <p className="text-xs text-slate-500">
              {lang === 'hi' ? 'यहाँ ड्रैग करें या क्लिक करके चुनें' : 'Drag & drop more images or click to browse'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700"
        >
          {lang === 'hi' ? 'ब्राउज़ करें' : 'Browse Files'}
        </button>
      </div>
    );
  }

  return (
    <div
      id="main-image-upload-dropzone"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
        isDragging
          ? 'border-blue-500 bg-blue-50/60 scale-[1.005]'
          : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50'
      } shadow-xs`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/jpeg,image/png,image/webp,image/svg+xml,image/avif"
        className="hidden"
      />

      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
          <UploadCloud className="h-8 w-8" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          {lang === 'hi'
            ? 'अपनी फोटो यहाँ डालें (सिंगल या बल्क)'
            : 'Drop your photos here for Bulk/Single Editing'}
        </h3>

        <p className="mt-1.5 text-sm text-slate-500">
          {lang === 'hi'
            ? 'JPG, PNG, WebP, AVIF फाइल्स सपोर्टेड। जितने मर्जी फोटो एक साथ अपलोड करें।'
            : 'Supports JPEG, PNG, WEBP, and AVIF. Batch process multiple photos with lightning speed.'}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            id="browse-files-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition cursor-pointer"
          >
            <FolderUp className="h-4 w-4" />
            <span>{lang === 'hi' ? 'कंप्यूटर / फोन से फोटो चुनें' : 'Choose Files to Resize'}</span>
          </button>

          <button
            id="load-sample-images-btn"
            type="button"
            onClick={onLoadSamples}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer shadow-2xs"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>{lang === 'hi' ? 'सैंपल डेमो फोटो लोड करें' : 'Try Demo Images'}</span>
          </button>
        </div>

        <div className="mt-5 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" /> High-Quality Resampling
          </span>
          <span>•</span>
          <span>Target File Size Optimizer (KB / MB)</span>
          <span>•</span>
          <span>Clipboard Paste (Ctrl+V)</span>
        </div>
      </div>
    </div>
  );
};
