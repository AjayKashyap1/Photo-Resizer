export type SupportedFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export type ResizeMode = 'exact' | 'fit' | 'fill' | 'percentage' | 'target_size';

export type DimensionUnit = 'px' | '%' | 'mm' | 'cm' | 'in';

export interface ImageProcessingConfig {
  resizeMode: ResizeMode;
  width: number;
  height: number;
  maintainAspectRatio: boolean;
  aspectRatio: number;
  percentage: number;
  targetMaxKb: number; // Target file size in KB (0 = off)
  format: SupportedFormat;
  quality: number; // 0.01 to 1.0
  dpi: number;
  backgroundColor: string; // for PNG to JPG or fill padding
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  grayscale: boolean;
  brightness: number; // 0 to 200 (100 is default)
  contrast: number; // 0 to 200 (100 is default)
  sharpen: boolean;
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
