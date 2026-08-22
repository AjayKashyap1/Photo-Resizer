import React from 'react';
import { ProcessedImageItem } from '../../types';
import { formatBytes } from '../../utils/imageProcessor';
import {
  Download,
  Trash2,
  Maximize2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  TrendingDown,
  Zap,
  Frame,
} from 'lucide-react';

interface ImageCardProps {
  item: ProcessedImageItem;
  index: number;
  onDownload: (item: ProcessedImageItem) => void;
  onDelete: (id: string) => void;
  onInspect: (item: ProcessedImageItem) => void;
  onEdit: (item: ProcessedImageItem) => void;
  lang: 'en' | 'hi';
}

export const ImageCard: React.FC<ImageCardProps> = ({
  item,
  index,
  onDownload,
  onDelete,
  onInspect,
  onEdit,
  lang,
}) => {
  const sizeDiff = item.outputSize
    ? ((item.outputSize - item.originalSize) / item.originalSize) * 100
    : 0;

  const isReduced = sizeDiff < 0;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-slate-300 hover:shadow-md">
      
      {/* Top Image Preview & Quick Actions */}
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-100 flex items-center justify-center">
        {item.outputUrl || item.originalUrl ? (
          <img
            src={item.outputUrl || item.originalUrl}
            alt={item.name}
            className="h-full w-full object-contain transition group-hover:scale-105 duration-300"
          />
        ) : (
          <div className="text-xs text-slate-400">Loading preview...</div>
        )}

        {/* Processing overlay */}
        {item.isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-xs">
            <div className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </div>
          </div>
        )}

        {/* Floating Quick Action Overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onInspect(item)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow-sm hover:bg-white hover:text-blue-600 transition"
            title="Inspect / Compare Before & After"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-slate-700 shadow-sm hover:bg-white hover:text-blue-600 transition"
            title="Edit Individual Photo"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-red-600 shadow-sm hover:bg-red-50 transition"
            title="Remove Photo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          {item.outputBlob ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs backdrop-blur-xs">
              <CheckCircle2 className="h-3 w-3" />
              Ready
            </span>
          ) : item.error ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
              <AlertCircle className="h-3 w-3" />
              Error
            </span>
          ) : null}

          {item.outputWidth > item.originalWidth && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs backdrop-blur-xs">
              <Zap className="h-2.5 w-2.5" />
              {Math.round(item.outputWidth / item.originalWidth)}x Upscaled
            </span>
          )}

          {item.customConfig?.addBorder && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-purple-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-2xs backdrop-blur-xs">
              <Frame className="h-2.5 w-2.5" />
              {item.customConfig.borderWidth || 20}px Border
            </span>
          )}
        </div>
      </div>

      {/* Details & Metadata */}
      <div className="mt-3 flex flex-col gap-2">
        {/* Title */}
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-bold text-slate-800" title={item.name}>
            {item.name}
          </p>
          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600">
            #{index + 1}
          </span>
        </div>

        {/* Dimension comparison */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-[11px] border border-slate-100">
          <div>
            <span className="block text-[9px] font-semibold text-slate-400 uppercase">Original</span>
            <span className="font-medium text-slate-700">
              {item.originalWidth} × {item.originalHeight} px
            </span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <div className="text-right">
            <span className="block text-[9px] font-semibold text-blue-500 uppercase">Output</span>
            <span className="font-bold text-blue-700">
              {item.outputWidth || item.originalWidth} × {item.outputHeight || item.originalHeight} px
            </span>
          </div>
        </div>

        {/* File size comparison */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-500">
            <span>{formatBytes(item.originalSize)}</span>
            <ArrowRight className="h-3 w-3 text-slate-300" />
            <span className="font-bold text-slate-900">
              {item.outputSize ? formatBytes(item.outputSize) : '—'}
            </span>
          </div>

          {item.outputSize && sizeDiff !== 0 && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isReduced
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isReduced && <TrendingDown className="h-3 w-3" />}
              {sizeDiff > 0 ? `+${sizeDiff.toFixed(0)}%` : `${sizeDiff.toFixed(0)}%`}
            </span>
          )}
        </div>

        {/* Single Download button */}
        <button
          type="button"
          onClick={() => onDownload(item)}
          disabled={!item.outputBlob}
          className={`mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
            item.outputBlob
              ? 'bg-slate-900 text-white hover:bg-blue-600 active:scale-98 shadow-2xs'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Download className="h-3.5 w-3.5" />
          <span>{lang === 'hi' ? 'डाउनलोड करें' : 'Download Photo'}</span>
        </button>
      </div>

    </div>
  );
};
