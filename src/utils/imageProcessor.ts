import { ImageProcessingConfig, SupportedFormat } from '../types';
import { generateBarcodeCanvas } from './barcodeGenerator';
import { injectDpiMetadata } from './dpiHelper';

export const DEFAULT_CONFIG: ImageProcessingConfig = {
  resizeMode: 'exact',
  width: 1200,
  height: 800,
  maintainAspectRatio: true,
  aspectRatio: 1200 / 800,
  percentage: 100,
  targetMaxKb: 0, // 0 = disabled
  format: 'image/jpeg',
  quality: 0.85,
  dpi: 96,
  backgroundColor: '#ffffff',
  rotation: 0,
  flipH: false,
  flipV: false,
  grayscale: false,
  brightness: 100,
  contrast: 100,
  sharpen: false,
  overlayBarcode: false,
  overlayPosition: 'bottom-right',
  overlayScale: 25,
  overlayOpacity: 0.9,
};

// Calculate target dimensions based on config & original size
export function calculateTargetDimensions(
  origW: number,
  origH: number,
  config: ImageProcessingConfig
): { targetW: number; targetH: number } {
  let targetW = config.width;
  let targetH = config.height;

  if (config.resizeMode === 'percentage') {
    const scale = Math.max(1, config.percentage) / 100;
    targetW = Math.round(origW * scale);
    targetH = Math.round(origH * scale);
    return {
      targetW: Math.max(1, targetW),
      targetH: Math.max(1, targetH),
    };
  }

  if (config.maintainAspectRatio) {
    if (origW > 0 && origH > 0) {
      const origAspect = origW / origH;
      if (config.resizeMode === 'fit') {
        // Fit within bounding box
        const scale = Math.min(config.width / origW, config.height / origH);
        targetW = Math.round(origW * scale);
        targetH = Math.round(origH * scale);
      } else {
        // Compute based on dominant given dimension
        if (config.width && !config.height) {
          targetW = config.width;
          targetH = Math.round(config.width / origAspect);
        } else if (!config.width && config.height) {
          targetH = config.height;
          targetW = Math.round(config.height * origAspect);
        } else {
          // Standard locked aspect from config.width
          targetW = config.width;
          targetH = Math.round(config.width / origAspect);
        }
      }
    }
  }

  return {
    targetW: Math.max(1, Math.round(targetW)),
    targetH: Math.max(1, Math.round(targetH)),
  };
}

// Convert units (mm, cm, in) to pixels
export function unitToPixels(value: number, unit: 'px' | 'mm' | 'cm' | 'in', dpi = 96): number {
  switch (unit) {
    case 'mm':
      return Math.round((value / 25.4) * dpi);
    case 'cm':
      return Math.round((value / 2.54) * dpi);
    case 'in':
      return Math.round(value * dpi);
    case 'px':
    default:
      return Math.round(value);
  }
}

export function pixelsToUnit(px: number, unit: 'px' | 'mm' | 'cm' | 'in', dpi = 96): number {
  switch (unit) {
    case 'mm':
      return Number(((px / dpi) * 25.4).toFixed(1));
    case 'cm':
      return Number(((px / dpi) * 2.54).toFixed(2));
    case 'in':
      return Number((px / dpi).toFixed(2));
    case 'px':
    default:
      return px;
  }
}

// Load Image from URL or Blob safely
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = src;
  });
}

// Simple 3x3 Convolution filter (sharpen)
function applySharpenFilter(ctx: CanvasRenderingContext2D, width: number, height: number) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let val = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pIndex = ((y + ky) * width + (x + kx)) * 4 + c;
              val += copy[pIndex] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const index = (y * width + x) * 4 + c;
          data[index] = Math.min(255, Math.max(0, val));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    console.warn('Sharpen skipped due to canvas context security/bounds:', e);
  }
}

// Main image processing engine
export async function processImage(
  imageSource: string | HTMLImageElement,
  config: ImageProcessingConfig
): Promise<{
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
}> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // If crop is specified, clamp crop coordinates safely to source dimensions
  let cropRect: { x: number; y: number; width: number; height: number } | null = null;
  if (config.crop && config.crop.width > 0 && config.crop.height > 0) {
    const cx = Math.max(0, Math.min(origW - 1, Math.round(config.crop.x)));
    const cy = Math.max(0, Math.min(origH - 1, Math.round(config.crop.y)));
    const cw = Math.max(1, Math.min(origW - cx, Math.round(config.crop.width)));
    const ch = Math.max(1, Math.min(origH - cy, Math.round(config.crop.height)));
    cropRect = { x: cx, y: cy, width: cw, height: ch };
  }

  const effectiveOrigW = cropRect ? cropRect.width : origW;
  const effectiveOrigH = cropRect ? cropRect.height : origH;

  const { targetW, targetH } = calculateTargetDimensions(effectiveOrigW, effectiveOrigH, config);

  // Determine final canvas size accounting for 90/270 deg rotation
  const isRotated = config.rotation === 90 || config.rotation === 270;
  const canvasW = isRotated ? targetH : targetW;
  const canvasH = isRotated ? targetW : targetH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  // Draw background if converting transparent image to JPEG or configured
  if (config.format === 'image/jpeg' || config.backgroundColor !== 'transparent') {
    ctx.fillStyle = config.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  ctx.save();

  // Apply Transformations (Rotate, Flip)
  ctx.translate(canvasW / 2, canvasH / 2);
  if (config.rotation !== 0) {
    ctx.rotate((config.rotation * Math.PI) / 180);
  }
  ctx.scale(config.flipH ? -1 : 1, config.flipV ? -1 : 1);

  // Apply CSS Filters (Brightness, Contrast, Grayscale)
  const filterParts = [];
  if (config.brightness !== 100) filterParts.push(`brightness(${config.brightness}%)`);
  if (config.contrast !== 100) filterParts.push(`contrast(${config.contrast}%)`);
  if (config.grayscale) filterParts.push('grayscale(100%)');
  if (filterParts.length > 0) {
    ctx.filter = filterParts.join(' ');
  }

  // Step-down bilinear scaling for crisp quality on large downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (cropRect) {
    ctx.drawImage(
      img,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      -targetW / 2,
      -targetH / 2,
      targetW,
      targetH
    );
  } else {
    ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
  }
  ctx.restore();

  // Sharpening if requested
  if (config.sharpen) {
    applySharpenFilter(ctx, canvasW, canvasH);
  }

  // Optional Barcode Overlay
  if (config.overlayBarcode && config.overlayBarcodeData) {
    try {
      const barcodeCanvas = await generateBarcodeCanvas({
        type: (config.overlayBarcodeType || 'qrcode') as any,
        text: config.overlayBarcodeData,
        scale: 2,
        height: 40,
        includeText: true,
        textMargin: 4,
        textSize: 10,
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
        transparentBackground: false,
        qrErrorCorrection: 'M',
      });

      const overlayW = Math.round((canvasW * (config.overlayScale || 25)) / 100);
      const aspect = barcodeCanvas.width / barcodeCanvas.height;
      const overlayH = Math.round(overlayW / aspect);
      const margin = Math.round(canvasW * 0.02);

      let ox = margin;
      let oy = margin;

      switch (config.overlayPosition) {
        case 'bottom-right':
          ox = canvasW - overlayW - margin;
          oy = canvasH - overlayH - margin;
          break;
        case 'bottom-left':
          ox = margin;
          oy = canvasH - overlayH - margin;
          break;
        case 'top-right':
          ox = canvasW - overlayW - margin;
          oy = margin;
          break;
        case 'top-left':
          ox = margin;
          oy = margin;
          break;
        case 'center':
          ox = (canvasW - overlayW) / 2;
          oy = (canvasH - overlayH) / 2;
          break;
        case 'bottom-center':
          ox = (canvasW - overlayW) / 2;
          oy = canvasH - overlayH - margin;
          break;
      }

      ctx.save();
      ctx.globalAlpha = config.overlayOpacity || 0.9;
      // draw subtle white backing box with rounded corners
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox - 4, oy - 4, overlayW + 8, overlayH + 8);
      ctx.drawImage(barcodeCanvas, ox, oy, overlayW, overlayH);
      ctx.restore();
    } catch (err) {
      console.warn('Barcode overlay failed:', err);
    }
  }

  // Handle Export Quality & Target KB Optimizer
  let finalQuality = config.quality;
  let finalBlob: Blob;

  if (config.targetMaxKb && config.targetMaxKb > 0 && config.format !== 'image/png') {
    // Binary search quality to hit target size in KB
    const targetBytes = config.targetMaxKb * 1024;
    let minQ = 0.05;
    let maxQ = 0.98;
    let bestBlob: Blob | null = null;

    for (let i = 0; i < 6; i++) {
      const testQ = (minQ + maxQ) / 2;
      const blob = await canvasToBlob(canvas, config.format, testQ);
      if (!blob) break;

      if (blob.size <= targetBytes) {
        bestBlob = blob;
        minQ = testQ; // try higher quality
      } else {
        maxQ = testQ; // reduce quality
      }
    }

    finalBlob = bestBlob || (await canvasToBlob(canvas, config.format, minQ))!;
  } else {
    finalBlob = (await canvasToBlob(canvas, config.format, finalQuality))!;
  }

  if (!finalBlob) {
    throw new Error('Failed to generate image blob');
  }

  // Embed DPI metadata (JFIF for JPEG, pHYs for PNG)
  if (config.dpi && config.dpi > 0) {
    finalBlob = await injectDpiMetadata(finalBlob, config.format, config.dpi);
  }

  const dataUrl = URL.createObjectURL(finalBlob);

  return {
    blob: finalBlob,
    dataUrl,
    width: canvasW,
    height: canvasH,
    size: finalBlob.size,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, format: SupportedFormat, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), format, quality);
  });
}

// Human readable file size formatter
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
