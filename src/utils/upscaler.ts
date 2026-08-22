import { UpscaleFactor, UpscaleEngine } from '../types';

interface UpscaleOptions {
  factor: UpscaleFactor; // 2, 4, 8
  engine: UpscaleEngine; // 'super_resolution' | 'smart_sharpen' | 'smooth_bicubic' | 'pixel_art'
  denoise?: boolean;
  clarity?: number; // 0 to 100
}

/**
 * High-quality multi-step Super Resolution Upscaling Engine.
 * Scales image with intermediate canvas steps and applies adaptive edge-preserving
 * sharpening, noise reduction, and texture clarity enhancement.
 */
export function upscaleCanvas(
  sourceCanvas: HTMLCanvasElement | CanvasImageSource,
  sourceW: number,
  sourceH: number,
  targetW: number,
  targetH: number,
  options: UpscaleOptions
): HTMLCanvasElement {
  const { factor, engine, denoise = true, clarity = 75 } = options;

  // 1. Pixel Art Mode -> Nearest Neighbor scaling
  if (engine === 'pixel_art') {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas as any, 0, 0, targetW, targetH);
    return canvas;
  }

  // 2. Multi-Step Intermediate Scaling for High Factors (4x, 8x)
  // Step-wise scaling prevents blurred interpolation artifacts compared to a single giant jump.
  let currentCanvas = document.createElement('canvas');
  currentCanvas.width = sourceW;
  currentCanvas.height = sourceH;
  let currentCtx = currentCanvas.getContext('2d', { willReadFrequently: true });
  if (!currentCtx) return currentCanvas;

  currentCtx.imageSmoothingEnabled = true;
  currentCtx.imageSmoothingQuality = 'high';
  currentCtx.drawImage(sourceCanvas as any, 0, 0, sourceW, sourceH);

  // Progressive step scaling
  let curW = sourceW;
  let curH = sourceH;
  const stepMultiplier = 2;

  while (curW * stepMultiplier <= targetW && curH * stepMultiplier <= targetH) {
    const nextW = curW * stepMultiplier;
    const nextH = curH * stepMultiplier;
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextW;
    stepCanvas.height = nextH;
    const stepCtx = stepCanvas.getContext('2d', { willReadFrequently: true });
    if (!stepCtx) break;

    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(currentCanvas, 0, 0, nextW, nextH);

    // Apply mild sharpening at intermediate steps if super resolution is selected
    if (engine === 'super_resolution' || engine === 'smart_sharpen') {
      applyIntermediateUnsharpMask(stepCtx, nextW, nextH, 0.4);
    }

    currentCanvas = stepCanvas;
    currentCtx = stepCtx;
    curW = nextW;
    curH = nextH;
  }

  // Final step to exact target dimensions
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetW;
  finalCanvas.height = targetH;
  const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true });
  if (!finalCtx) return currentCanvas;

  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(currentCanvas, 0, 0, targetW, targetH);

  // 3. Post-Processing: Denoise, Clarity, Adaptive Sharpening
  if (denoise && (engine === 'super_resolution' || engine === 'smooth_bicubic')) {
    applyAdaptiveDenoise(finalCtx, targetW, targetH);
  }

  if (engine === 'super_resolution') {
    const sharpenAmount = (clarity / 100) * 0.85 + 0.35;
    applyHighFrequencyEnhance(finalCtx, targetW, targetH, sharpenAmount);
  } else if (engine === 'smart_sharpen') {
    const sharpenAmount = (clarity / 100) * 1.1 + 0.5;
    applyHighFrequencyEnhance(finalCtx, targetW, targetH, sharpenAmount);
  }

  return finalCanvas;
}

/**
 * Intermediate step unsharp mask for progressive upscaling
 */
function applyIntermediateUnsharpMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number
) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = copy[idx + c];
          const top = copy[((y - 1) * width + x) * 4 + c];
          const bottom = copy[((y + 1) * width + x) * 4 + c];
          const left = copy[(y * width + (x - 1)) * 4 + c];
          const right = copy[(y * width + (x + 1)) * 4 + c];

          const blurred = (top + bottom + left + right) * 0.25;
          const diff = center - blurred;
          const sharpened = center + diff * strength;
          data[idx + c] = Math.min(255, Math.max(0, Math.round(sharpened)));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    // Graceful fallback
  }
}

/**
 * Adaptive Edge-preserving Super Resolution & Clarity booster
 */
function applyHighFrequencyEnhance(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);

    // 3x3 Laplacian / Unsharp Kernel with Edge Gating
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const centerIdx = (y * width + x) * 4;

        // Calculate luminance gradient to avoid noisy flat areas
        const lumCenter = (copy[centerIdx] * 299 + copy[centerIdx + 1] * 587 + copy[centerIdx + 2] * 114) / 1000;
        const lumTop = (copy[((y - 1) * width + x) * 4] * 299 + copy[((y - 1) * width + x) * 4 + 1] * 587 + copy[((y - 1) * width + x) * 4 + 2] * 114) / 1000;
        const lumBottom = (copy[((y + 1) * width + x) * 4] * 299 + copy[((y + 1) * width + x) * 4 + 1] * 587 + copy[((y + 1) * width + x) * 4 + 2] * 114) / 1000;
        const lumLeft = (copy[(y * width + (x - 1)) * 4] * 299 + copy[(y * width + (x - 1)) * 4 + 1] * 587 + copy[(y * width + (x - 1)) * 4 + 2] * 114) / 1000;
        const lumRight = (copy[(y * width + (x + 1)) * 4] * 299 + copy[(y * width + (x + 1)) * 4 + 1] * 587 + copy[(y * width + (x + 1)) * 4 + 2] * 114) / 1000;

        const grad = Math.abs(lumTop - lumBottom) + Math.abs(lumLeft - lumRight);

        // Threshold gating: apply subtle sharpening on smooth gradients, strong on true edges
        const weight = grad > 15 ? amount : amount * 0.35;

        for (let c = 0; c < 3; c++) {
          const center = copy[centerIdx + c];
          const top = copy[((y - 1) * width + x) * 4 + c];
          const bottom = copy[((y + 1) * width + x) * 4 + c];
          const left = copy[(y * width + (x - 1)) * 4 + c];
          const right = copy[(y * width + (x + 1)) * 4 + c];

          const laplacian = 4 * center - (top + bottom + left + right);
          const enhanced = center + laplacian * (weight * 0.28);
          data[centerIdx + c] = Math.min(255, Math.max(0, Math.round(enhanced)));
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    // Ignore canvas security errors
  }
}

/**
 * Selective Denoising on flat surfaces to remove compression noise before upscaling
 */
function applyAdaptiveDenoise(ctx: CanvasRenderingContext2D, width: number, height: number) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const idx = (y * width + x) * 4;

        // Check color variance with neighbors
        let sumR = 0, sumG = 0, sumB = 0;
        let count = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            const diff =
              Math.abs(copy[idx] - copy[nIdx]) +
              Math.abs(copy[idx + 1] - copy[nIdx + 1]) +
              Math.abs(copy[idx + 2] - copy[nIdx + 2]);

            // Only average if color difference is low (not crossing an edge)
            if (diff < 30) {
              sumR += copy[nIdx];
              sumG += copy[nIdx + 1];
              sumB += copy[nIdx + 2];
              count++;
            }
          }
        }

        if (count > 2) {
          data[idx] = Math.round(sumR / count);
          data[idx + 1] = Math.round(sumG / count);
          data[idx + 2] = Math.round(sumB / count);
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    // Ignore
  }
}
