import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Crop, Move, Maximize2, Minimize2 } from 'lucide-react';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropToolOverlayProps {
  imageSrc: string;
  originalWidth: number;
  originalHeight: number;
  crop: CropRect;
  onChangeCrop: (newCrop: CropRect) => void;
  aspectRatio: number | null; // null for freeform, or e.g. 1, 4/5, 16/9, 35/45
  presetLabel?: string;
  lang: 'en' | 'hi';
}

type DragMode =
  | 'move'
  | 'handle-nw'
  | 'handle-n'
  | 'handle-ne'
  | 'handle-e'
  | 'handle-se'
  | 'handle-s'
  | 'handle-sw'
  | 'handle-w'
  | null;

export const CropToolOverlay: React.FC<CropToolOverlayProps> = ({
  imageSrc,
  originalWidth,
  originalHeight,
  crop,
  onChangeCrop,
  aspectRatio,
  presetLabel,
  lang,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState<{
    clientX: number;
    clientY: number;
    cropStart: CropRect;
  } | null>(null);

  const [imageBounds, setImageBounds] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
    scale: number;
  }>({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    scale: 1,
  });

  // Calculate displayed image bounds within the container
  const updateImageBounds = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return;
    const imgRect = imgRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    if (imgRect.width > 0 && originalWidth > 0) {
      const scale = imgRect.width / originalWidth;
      setImageBounds({
        width: imgRect.width,
        height: imgRect.height,
        left: imgRect.left - containerRect.left,
        top: imgRect.top - containerRect.top,
        scale,
      });
    }
  }, [originalWidth]);

  useEffect(() => {
    updateImageBounds();
    window.addEventListener('resize', updateImageBounds);
    return () => window.removeEventListener('resize', updateImageBounds);
  }, [updateImageBounds]);

  // Handle pointer down on drag box or handles
  const handlePointerDown = (
    e: React.PointerEvent,
    mode: DragMode
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setDragMode(mode);
    setDragStart({
      clientX: e.clientX,
      clientY: e.clientY,
      cropStart: { ...crop },
    });
  };

  // Handle pointer move during drag
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragMode || !dragStart || imageBounds.scale <= 0) return;

    const deltaX = (e.clientX - dragStart.clientX) / imageBounds.scale;
    const deltaY = (e.clientY - dragStart.clientY) / imageBounds.scale;
    const { cropStart } = dragStart;

    let newX = cropStart.x;
    let newY = cropStart.y;
    let newW = cropStart.width;
    let newH = cropStart.height;

    const MIN_SIZE = 24;

    if (dragMode === 'move') {
      newX = Math.max(0, Math.min(originalWidth - newW, cropStart.x + deltaX));
      newY = Math.max(0, Math.min(originalHeight - newH, cropStart.y + deltaY));
    } else if (aspectRatio) {
      // Locked aspect ratio resizing
      if (dragMode === 'handle-se') {
        const rawW = Math.max(MIN_SIZE, cropStart.width + deltaX);
        const rawH = rawW / aspectRatio;
        newW = Math.min(originalWidth - cropStart.x, rawW);
        newH = newW / aspectRatio;
        if (cropStart.y + newH > originalHeight) {
          newH = originalHeight - cropStart.y;
          newW = newH * aspectRatio;
        }
      } else if (dragMode === 'handle-nw') {
        const rawW = Math.max(MIN_SIZE, cropStart.width - deltaX);
        const rawH = rawW / aspectRatio;
        const testX = cropStart.x + cropStart.width - rawW;
        const testY = cropStart.y + cropStart.height - rawH;
        if (testX >= 0 && testY >= 0) {
          newX = testX;
          newY = testY;
          newW = rawW;
          newH = rawH;
        }
      } else if (dragMode === 'handle-ne') {
        const rawW = Math.max(MIN_SIZE, cropStart.width + deltaX);
        const rawH = rawW / aspectRatio;
        const testY = cropStart.y + cropStart.height - rawH;
        if (cropStart.x + rawW <= originalWidth && testY >= 0) {
          newY = testY;
          newW = rawW;
          newH = rawH;
        }
      } else if (dragMode === 'handle-sw') {
        const rawW = Math.max(MIN_SIZE, cropStart.width - deltaX);
        const rawH = rawW / aspectRatio;
        const testX = cropStart.x + cropStart.width - rawW;
        if (testX >= 0 && cropStart.y + rawH <= originalHeight) {
          newX = testX;
          newW = rawW;
          newH = rawH;
        }
      } else if (dragMode === 'handle-e' || dragMode === 'handle-s') {
        const rawW = Math.max(MIN_SIZE, cropStart.width + deltaX);
        const rawH = rawW / aspectRatio;
        if (cropStart.x + rawW <= originalWidth && cropStart.y + rawH <= originalHeight) {
          newW = rawW;
          newH = rawH;
        }
      } else if (dragMode === 'handle-w' || dragMode === 'handle-n') {
        const rawW = Math.max(MIN_SIZE, cropStart.width - deltaX);
        const rawH = rawW / aspectRatio;
        const testX = cropStart.x + cropStart.width - rawW;
        const testY = cropStart.y + cropStart.height - rawH;
        if (testX >= 0 && testY >= 0) {
          newX = testX;
          newY = testY;
          newW = rawW;
          newH = rawH;
        }
      }
    } else {
      // Freeform resizing
      if (dragMode.includes('e')) {
        newW = Math.max(MIN_SIZE, Math.min(originalWidth - cropStart.x, cropStart.width + deltaX));
      }
      if (dragMode.includes('s')) {
        newH = Math.max(MIN_SIZE, Math.min(originalHeight - cropStart.y, cropStart.height + deltaY));
      }
      if (dragMode.includes('w')) {
        const rawX = cropStart.x + deltaX;
        if (rawX >= 0 && cropStart.x + cropStart.width - rawX >= MIN_SIZE) {
          newX = rawX;
          newW = cropStart.x + cropStart.width - rawX;
        }
      }
      if (dragMode.includes('n')) {
        const rawY = cropStart.y + deltaY;
        if (rawY >= 0 && cropStart.y + cropStart.height - rawY >= MIN_SIZE) {
          newY = rawY;
          newH = cropStart.y + cropStart.height - rawY;
        }
      }
    }

    onChangeCrop({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragMode) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      setDragMode(null);
      setDragStart(null);
    }
  };

  // Computed displayed coordinates for CSS styling
  const dispX = imageBounds.left + crop.x * imageBounds.scale;
  const dispY = imageBounds.top + crop.y * imageBounds.scale;
  const dispW = crop.width * imageBounds.scale;
  const dispH = crop.height * imageBounds.scale;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full select-none items-center justify-center overflow-hidden bg-slate-950/95"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Background Reference Image */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt="Crop Target"
        onLoad={updateImageBounds}
        className="max-h-[60vh] max-w-full object-contain pointer-events-none"
      />

      {/* Dimmed Overlay outside the crop rectangle */}
      {imageBounds.width > 0 && (
        <>
          {/* Top dark block */}
          <div
            className="absolute bg-slate-950/65 pointer-events-none"
            style={{
              left: imageBounds.left,
              top: imageBounds.top,
              width: imageBounds.width,
              height: Math.max(0, dispY - imageBounds.top),
            }}
          />
          {/* Bottom dark block */}
          <div
            className="absolute bg-slate-950/65 pointer-events-none"
            style={{
              left: imageBounds.left,
              top: dispY + dispH,
              width: imageBounds.width,
              height: Math.max(0, imageBounds.top + imageBounds.height - (dispY + dispH)),
            }}
          />
          {/* Left dark block */}
          <div
            className="absolute bg-slate-950/65 pointer-events-none"
            style={{
              left: imageBounds.left,
              top: dispY,
              width: Math.max(0, dispX - imageBounds.left),
              height: dispH,
            }}
          />
          {/* Right dark block */}
          <div
            className="absolute bg-slate-950/65 pointer-events-none"
            style={{
              left: dispX + dispW,
              top: dispY,
              width: Math.max(0, imageBounds.left + imageBounds.width - (dispX + dispW)),
              height: dispH,
            }}
          />

          {/* Interactive Crop Box Window */}
          <div
            className={`absolute border-2 border-blue-400/90 shadow-2xl transition-shadow ${
              dragMode ? 'ring-2 ring-blue-400/40 shadow-blue-500/30' : ''
            }`}
            style={{
              left: dispX,
              top: dispY,
              width: dispW,
              height: dispH,
              cursor: 'move',
            }}
            onPointerDown={(e) => handlePointerDown(e, 'move')}
          >
            {/* Rule of Thirds Photographic Grid */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-r border-b border-white/25" />
              <div className="border-b border-white/25" />
              <div className="border-r border-white/25" />
              <div className="border-r border-white/25" />
              <div />
            </div>

            {/* Corner Highlight Brackets */}
            <div className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 border-t-2 border-l-2 border-white pointer-events-none" />
            <div className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 border-t-2 border-r-2 border-white pointer-events-none" />
            <div className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 border-b-2 border-l-2 border-white pointer-events-none" />
            <div className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 border-b-2 border-r-2 border-white pointer-events-none" />

            {/* Center Drag Helper Indicator */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
              <div className="rounded-full bg-slate-900/70 p-2 text-white/80 backdrop-blur-xs">
                <Move className="h-4 w-4" />
              </div>
            </div>

            {/* Live Size & Preset Badge */}
            <div className="absolute -top-7 left-0 flex items-center gap-1.5 pointer-events-none whitespace-nowrap">
              <span className="rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                {crop.width} × {crop.height} px
              </span>
              {presetLabel && (
                <span className="rounded-md bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200 backdrop-blur-xs">
                  {presetLabel}
                </span>
              )}
            </div>

            {/* 8 Interactive Resize Handles */}
            {/* NW */}
            <div
              className="absolute -top-2 -left-2 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
              onPointerDown={(e) => handlePointerDown(e, 'handle-nw')}
            />
            {/* N */}
            <div
              className="absolute -top-2 left-1/2 -translate-x-1/2 h-3.5 w-6 rounded-full border border-white bg-blue-600 shadow-md cursor-ns-resize hover:scale-110 transition-transform"
              onPointerDown={(e) => handlePointerDown(e, 'handle-n')}
            />
            {/* NE */}
            <div
              className="absolute -top-2 -right-2 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
              onPointerDown={(e) => handlePointerDown(e, 'handle-ne')}
            />
            {/* E */}
            <div
              className="absolute top-1/2 -right-2 -translate-y-1/2 h-6 w-3.5 rounded-full border border-white bg-blue-600 shadow-md cursor-ew-resize hover:scale-110 transition-transform"
              onPointerDown={(e) => handlePointerDown(e, 'handle-e')}
            />
            {/* SE */}
            <div
              className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
              onPointerDown={(e) => handlePointerDown(e, 'handle-se')}
            />
            {/* S */}
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-3.5 w-6 rounded-full border border-white bg-blue-600 shadow-md cursor-ns-resize hover:scale-110 transition-transform"
              onPointerDown={(e) => handlePointerDown(e, 'handle-s')}
            />
            {/* SW */}
            <div
              className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
              onPointerDown={(e) => handlePointerDown(e, 'handle-sw')}
            />
            {/* W */}
            <div
              className="absolute top-1/2 -left-2 -translate-y-1/2 h-6 w-3.5 rounded-full border border-white bg-blue-600 shadow-md cursor-ew-resize hover:scale-110 transition-transform"
              onPointerDown={(e) => handlePointerDown(e, 'handle-w')}
            />
          </div>
        </>
      )}
    </div>
  );
};
