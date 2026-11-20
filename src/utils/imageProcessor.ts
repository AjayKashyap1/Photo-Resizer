import { ImageProcessingConfig, SupportedFormat } from '../types';
import { generateBarcodeCanvas } from './barcodeGenerator';
import { injectDpiMetadata } from './dpiHelper';
import { upscaleCanvas } from './upscaler';

export const DEFAULT_CONFIG: ImageProcessingConfig = {
  resizeMode: 'exact',
  width: 1200,
  height: 800,
  maintainAspectRatio: true,
  aspectRatio: 1200 / 800,
  manualFitMode: 'cover',
  percentage: 100,
  targetMaxKb: 0, // 0 = disabled
  format: 'image/jpeg',
  quality: 0.85,
  dpi: 96,
  backgroundColor: '#ffffff',
  addBorder: false,
  borderWidth: 20,
  borderColor: '#ffffff',
  borderPlacement: 'expand',
  borderRadius: 0,
  borderShadow: false,
  rotation: 0,
  flipH: false,
  flipV: false,
  grayscale: false,
  brightness: 100,
  contrast: 100,
  sharpen: false,
  upscaleFactor: 2,
  upscaleEngine: 'super_resolution',
  upscaleDenoise: true,
  upscaleClarity: 75,
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

  if (config.resizeMode === 'upscale') {
    const factor = config.upscaleFactor || 2;
    return {
      targetW: Math.max(1, Math.round(origW * factor)),
      targetH: Math.max(1, Math.round(origH * factor)),
    };
  }

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

  // Determine final canvas size accounting for 90/270 deg rotation & border padding
  const isRotated = config.rotation === 90 || config.rotation === 270;
  const baseW = isRotated ? targetH : targetW;
  const baseH = isRotated ? targetW : targetH;

  const hasBorder = Boolean(config.addBorder && (config.borderWidth ?? 0) > 0);
  const bw = hasBorder ? Math.max(1, config.borderWidth || 20) : 0;
  const placement = config.borderPlacement || 'expand';
  const borderColor = config.borderColor || config.backgroundColor || '#ffffff';
  const borderRadius = hasBorder ? Math.max(0, config.borderRadius || 0) : 0;
  const borderShadow = hasBorder && Boolean(config.borderShadow);

  let padLeft = 0;
  let padRight = 0;
  let padTop = 0;
  let padBottom = 0;

  if (hasBorder) {
    if (placement === 'polaroid') {
      padLeft = bw;
      padRight = bw;
      padTop = bw;
      padBottom = Math.round(bw * 3.5);
    } else {
      padLeft = bw;
      padRight = bw;
      padTop = bw;
      padBottom = bw;
    }
  }

  let canvasW: number;
  let canvasH: number;
  let drawW: number;
  let drawH: number;

  if (hasBorder && placement === 'expand') {
    drawW = baseW;
    drawH = baseH;
    canvasW = baseW + padLeft + padRight;
    canvasH = baseH + padTop + padBottom;
  } else if (hasBorder && placement === 'inset') {
    canvasW = baseW;
    canvasH = baseH;
    drawW = Math.max(10, baseW - (padLeft + padRight));
    drawH = Math.max(10, baseH - (padTop + padBottom));
  } else {
    canvasW = baseW;
    canvasH = baseH;
    drawW = baseW;
    drawH = baseH;
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  // Prepare source / cropped region
  let sourceElement: CanvasImageSource = img;
  let sourceW = origW;
  let sourceH = origH;

  if (cropRect) {
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropRect.width;
    cropCanvas.height = cropRect.height;
    const cropCtx = cropCanvas.getContext('2d');
    if (cropCtx) {
      cropCtx.drawImage(
        img,
        cropRect.x,
        cropRect.y,
        cropRect.width,
        cropRect.height,
        0,
        0,
        cropRect.width,
        cropRect.height
      );
      sourceElement = cropCanvas;
      sourceW = cropRect.width;
      sourceH = cropRect.height;
    }
  }

  // Check if upscaling engine should be invoked (when scaling up or in upscale mode)
  let renderSource: CanvasImageSource = sourceElement;
  const isUpscaling =
    config.resizeMode === 'upscale' ||
    targetW > sourceW * 1.1 ||
    targetH > sourceH * 1.1;

  if (isUpscaling && config.upscaleEngine) {
    const computedFactor =
      config.upscaleFactor ||
      (targetW / sourceW >= 6 ? 8 : targetW / sourceW >= 3 ? 4 : 2);

    const upscaled = upscaleCanvas(
      sourceElement,
      sourceW,
      sourceH,
      targetW,
      targetH,
      {
        factor: computedFactor,
        engine: config.upscaleEngine || 'super_resolution',
        denoise: config.upscaleDenoise ?? true,
        clarity: config.upscaleClarity ?? 75,
      }
    );
    renderSource = upscaled;
  }

  // Draw background / border color
  const finalBgColor = hasBorder ? borderColor : config.backgroundColor;
  if (config.format === 'image/jpeg' || (finalBgColor && finalBgColor !== 'transparent')) {
    ctx.fillStyle = finalBgColor || '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Soft drop shadow behind inner image if enabled
  if (hasBorder && borderShadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = Math.min(30, Math.max(4, Math.round(bw * 0.5 + 4)));
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.min(12, Math.max(2, Math.round(bw * 0.2 + 2)));
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    if (borderRadius > 0) {
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(padLeft, padTop, drawW, drawH, Math.min(borderRadius, drawW / 2, drawH / 2));
      } else {
        ctx.rect(padLeft, padTop, drawW, drawH);
      }
    } else {
      ctx.rect(padLeft, padTop, drawW, drawH);
    }
    ctx.fill();
    ctx.restore();
  }

  ctx.save();

  // Clip rounded corners if specified
  if (hasBorder && borderRadius > 0) {
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(padLeft, padTop, drawW, drawH, Math.min(borderRadius, drawW / 2, drawH / 2));
    } else {
      ctx.rect(padLeft, padTop, drawW, drawH);
    }
    ctx.clip();
  }

  // Apply Transformations (Rotate, Flip) centered on the inner photo
  ctx.translate(padLeft + drawW / 2, padTop + drawH / 2);
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

  // Scaling quality
  ctx.imageSmoothingEnabled = config.upscaleEngine !== 'pixel_art';
  ctx.imageSmoothingQuality = 'high';

  const unrotatedDrawW = isRotated ? drawH : drawW;
  const unrotatedDrawH = isRotated ? drawW : drawH;

  // Apply manualFitMode when target aspect ratio differs from source aspect ratio
  const fitMode = config.manualFitMode || 'stretch';
  const renderSrcW = renderSource instanceof HTMLCanvasElement ? renderSource.width : sourceW;
  const renderSrcH = renderSource instanceof HTMLCanvasElement ? renderSource.height : sourceH;
  const srcAspect = renderSrcW / Math.max(1, renderSrcH);
  const dstAspect = unrotatedDrawW / Math.max(1, unrotatedDrawH);
  const aspectDiffers = Math.abs(srcAspect - dstAspect) > 0.015;

  if (aspectDiffers && fitMode === 'cover') {
    // Smart center-crop to fill exact manual pixel dimensions without stretching
    let sx = 0;
    let sy = 0;
    let sw = renderSrcW;
    let sh = renderSrcH;
    if (srcAspect > dstAspect) {
      sw = Math.round(renderSrcH * dstAspect);
      sx = Math.round((renderSrcW - sw) / 2);
    } else {
      sh = Math.round(renderSrcW / dstAspect);
      sy = Math.round((renderSrcH - sh) / 2);
    }
    ctx.drawImage(
      renderSource,
      sx,
      sy,
      sw,
      sh,
      -unrotatedDrawW / 2,
      -unrotatedDrawH / 2,
      unrotatedDrawW,
      unrotatedDrawH
    );
  } else if (aspectDiffers && fitMode === 'contain') {
    // Fit entire photo inside manual pixel box with background fill padding
    const scale = Math.min(unrotatedDrawW / renderSrcW, unrotatedDrawH / renderSrcH);
    const fitW = Math.round(renderSrcW * scale);
    const fitH = Math.round(renderSrcH * scale);
    ctx.drawImage(renderSource, -fitW / 2, -fitH / 2, fitW, fitH);
  } else {
    // Stretch or matching aspect ratio
    ctx.drawImage(renderSource, -unrotatedDrawW / 2, -unrotatedDrawH / 2, unrotatedDrawW, unrotatedDrawH);
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
    // High-precision binary search on quality to match target file size in KB
    const targetBytes = config.targetMaxKb * 1024;
    let minQ = 0.02;
    let maxQ = 0.99;
    let bestBlob: Blob | null = null;

    // First check max quality — if already under target, use high quality directly
    const highBlob = await canvasToBlob(canvas, config.format, maxQ);
    if (highBlob && highBlob.size <= targetBytes) {
      bestBlob = highBlob;
    } else {
      for (let i = 0; i < 10; i++) {
        const testQ = (minQ + maxQ) / 2;
        const blob = await canvasToBlob(canvas, config.format, testQ);
        if (!blob) break;

        if (blob.size <= targetBytes) {
          bestBlob = blob;
          minQ = testQ; // try higher quality while staying under target
        } else {
          maxQ = testQ; // reduce quality
        }
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
