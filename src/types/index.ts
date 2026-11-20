export type SupportedFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export type ResizeMode = 'exact' | 'fit' | 'fill' | 'percentage' | 'target_size' | 'upscale';

export type DimensionUnit = 'px' | '%' | 'mm' | 'cm' | 'in';

export type UpscaleFactor = 2 | 4 | 8;
export type UpscaleEngine = 'super_resolution' | 'smart_sharpen' | 'smooth_bicubic' | 'pixel_art';
export type BorderPlacement = 'expand' | 'inset' | 'polaroid';
export type PhotoManualFitMode = 'stretch' | 'cover' | 'contain';

export interface ImageProcessingConfig {
  resizeMode: ResizeMode;
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  aspectRatio: number;
  manualFitMode?: PhotoManualFitMode; // How photo fits when manual WxH differs from original aspect
  percentage: number;
  targetMaxKb: number; // Target file size in KB (0 = off)
  format: SupportedFormat;
  quality: number; // 0.01 to 1.0
  dpi: number;
  backgroundColor: string; // for PNG to JPG or fill padding
  // Extra Border & Background Padding
  addBorder?: boolean;
  borderWidth?: number; // Border width in px
  borderColor?: string; // Border color hex (e.g. #ffffff, #000000)
  borderPlacement?: BorderPlacement; // 'expand' | 'inset' | 'polaroid'
  borderRadius?: number; // Inner image corner radius in px
  borderShadow?: boolean; // Subtle photo shadow inside border
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  grayscale: boolean;
  brightness: number; // 0 to 200 (100 is default)
  contrast: number; // 0 to 200 (100 is default)
  sharpen: boolean;
  // Upscaling options
  upscaleFactor?: UpscaleFactor; // 2x, 4x, 8x
  upscaleEngine?: UpscaleEngine;
  upscaleDenoise?: boolean;
  upscaleClarity?: number;
  // Cropping
  crop?: {
    x: number; // in natural image pixels
    y: number;
    width: number;
    height: number;
  };
  cropPreset?: string;
  // Barcode overlay on image
  overlayBarcode: boolean;
  overlayBarcodeData?: string;
  overlayBarcodeType?: string;
  overlayPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'bottom-center';
  overlayScale: number; // 10% to 50% of image width
  overlayOpacity: number; // 0.1 to 1
}

export type VideoFitMode = 'contain' | 'cover' | 'stretch';
export type VideoSizeControlMode = 'target_size' | 'bitrate';
export type FileSizeUnit = 'KB' | 'MB';

export interface VideoProcessingConfig {
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  fitMode: VideoFitMode;
  backgroundColor: string;
  fps: 24 | 30 | 60;
  sizeControlMode: VideoSizeControlMode;
  videoBitrateKbps: number;
  targetFileSizeValue: number;
  targetFileSizeUnit: FileSizeUnit;
  includeAudio: boolean;
  audioBitrateKbps: number;
  mimeType: string;
  trimStart: number;
  trimEnd: number;
}

export interface VideoPreset {
  id: string;
  name: string;
  ratioLabel: string;
  width: number;
  height: number;
  description: string;
}

export interface LoadedVideoItem {
  id: string;
  name: string;
  url: string;
  file: File | Blob;
  width: number;
  height: number;
  duration: number;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface ProcessedVideoResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  duration: number;
  mimeType: string;
  extension: string;
  appliedVideoBitrateKbps: number;
}

export interface ProcessedImageItem {
  id: string;
  file: File | null;
  name: string;
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  originalSize: number; // in bytes
  originalFormat: string;
  
  // Custom overrides per image if user wants
  customConfig?: Partial<ImageProcessingConfig>;
  
  // Output result
  outputBlob: Blob | null;
  outputUrl: string | null;
  outputWidth: number;
  outputHeight: number;
  outputSize: number; // in bytes
  isProcessing: boolean;
  error?: string;
}

export interface DimensionPreset {
  id: string;
  name: string;
  category: 'Social Media' | 'E-Commerce' | 'Passport & ID' | 'Print & Paper' | 'Display / Web';
  width: number;
  height: number;
  unit: DimensionUnit;
  description: string;
}

export type BarcodeType =
  | 'qrcode'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'code128'
  | 'code39'
  | 'code93'
  | 'itf14'
  | 'datamatrix'
  | 'pdf417'
  | 'azteccode'
  | 'isbn';

export interface BarcodeConfig {
  type: BarcodeType;
  text: string;
  altText?: string;
  scale: number;
  height: number; // bar height
  includeText: boolean;
  textMargin: number;
  textSize: number;
  foregroundColor: string;
  backgroundColor: string;
  transparentBackground: boolean;
  // QR specific
  qrErrorCorrection: 'L' | 'M' | 'Q' | 'H';
  qrContentType?: 'text' | 'url' | 'wifi' | 'upi' | 'vcard' | 'phone' | 'email';
  // Product label extras
  labelTitle?: string;
  labelSubtitle?: string;
  labelPrice?: string;
}

export interface BulkBarcodeItem {
  id: string;
  text: string;
  type: BarcodeType;
  labelTitle?: string;
  labelPrice?: string;
  dataUrl?: string;
  svgString?: string;
  blob?: Blob;
  error?: string;
}

export interface NamingTemplate {
  pattern: 'original_resized' | 'custom_prefix' | 'dimensions' | 'counter';
  prefix: string;
  includeDimensions: boolean;
}

export type {
  LogLevel,
  LogCategory,
  LogEntry,
  HistoryActionType,
  HistoryRecord,
} from '../utils/historyLogger';
