import bwipjs from 'bwip-js';
import { BarcodeConfig, BarcodeType, BulkBarcodeItem } from '../types';

export interface BarcodeTypeMeta {
  type: BarcodeType;
  name: string;
  category: 'Retail & EAN/UPC' | '2D & QR' | 'Logistics & 1D' | 'Specialty';
  description: string;
  defaultText: string;
  patternHelp: string;
  example: string;
}

export const BARCODE_TYPES: BarcodeTypeMeta[] = [
  {
    type: 'ean13',
    name: 'EAN-13 (International Retail)',
    category: 'Retail & EAN/UPC',
    description: '13-digit standard for retail products worldwide.',
    defaultText: '890123456789',
    patternHelp: 'Enter 12 or 13 digits (auto calculates checksum).',
    example: '8901030384355',
  },
  {
    type: 'ean8',
    name: 'EAN-8 (Compact Retail)',
    category: 'Retail & EAN/UPC',
    description: '8-digit compact barcode for small products.',
    defaultText: '9638507',
    patternHelp: 'Enter 7 or 8 digits.',
    example: '96385074',
  },
  {
    type: 'upca',
    name: 'UPC-A (Universal Product Code)',
    category: 'Retail & EAN/UPC',
    description: '12-digit standard in USA & Canada for retail goods.',
    defaultText: '01234567890',
    patternHelp: 'Enter 11 or 12 digits.',
    example: '012345678905',
  },
  {
    type: 'upce',
    name: 'UPC-E (Zero-Suppressed UPC)',
    category: 'Retail & EAN/UPC',
    description: 'Compact 6 or 8 digit version of UPC-A.',
    defaultText: '0123456',
    patternHelp: 'Enter 6 to 8 digits.',
    example: '01234565',
  },
  {
    type: 'qrcode',
    name: 'QR Code (Quick Response 2D)',
    category: '2D & QR',
    description: 'High-density 2D code for URLs, UPI payments, text, WiFi, and contacts.',
    defaultText: 'https://example.com',
    patternHelp: 'Enter any text, URL, UPI link, or WiFi credentials.',
    example: 'https://mysite.com/product/123',
  },
  {
    type: 'code128',
    name: 'Code 128 (Universal Shipping & Inventory)',
    category: 'Logistics & 1D',
    description: 'High-density alphanumeric barcode for logistics, e-commerce, and warehouses.',
    defaultText: 'PROD-2026-X99',
    patternHelp: 'Any alphanumeric characters & symbols.',
    example: 'SHIP-99482104-IN',
  },
  {
    type: 'code39',
    name: 'Code 39 (Industrial & Inventory)',
    category: 'Logistics & 1D',
    description: 'Classic uppercase alphanumeric industrial barcode.',
    defaultText: 'ITEM-10492',
    patternHelp: 'Uppercase letters, numbers, and - . $ / + % space.',
    example: 'SKU-8821',
  },
  {
    type: 'itf14',
    name: 'ITF-14 (Carton / Outer Packaging)',
    category: 'Logistics & 1D',
    description: '14-digit shipping container barcode with bearer bars.',
    defaultText: '1001234567890',
    patternHelp: '13 or 14 digits.',
    example: '10012345678902',
  },
  {
    type: 'datamatrix',
    name: 'Data Matrix (2D Micro-Engineering)',
    category: '2D & QR',
    description: 'Compact 2D matrix for pharmaceuticals, electronics, and small parts.',
    defaultText: 'MED-BATCH-49021',
    patternHelp: 'Any text or alphanumeric payload.',
    example: 'BATCH-2026-A1',
  },
  {
    type: 'pdf417',
    name: 'PDF417 (High-Capacity 2D)',
    category: '2D & QR',
    description: 'Stacked linear 2D barcode for boarding passes, government IDs, and shipping.',
    defaultText: 'ID-PASSPORT-984210',
    patternHelp: 'Large alphanumeric or structured data.',
    example: 'BOARDING-GATE-14B',
  },
  {
    type: 'azteccode',
    name: 'Aztec Code (Ticket & Transit 2D)',
    category: '2D & QR',
    description: 'Square 2D code with central bullseye for transport tickets.',
    defaultText: 'TKT-2026-TRAIN-89',
    patternHelp: 'Any text data.',
    example: 'PASS-8921-VIP',
  },
  {
    type: 'isbn',
    name: 'ISBN (Book Publishing Barcode)',
    category: 'Specialty',
    description: 'International Standard Book Number barcode with EAN-13 structure.',
    defaultText: '978030640615',
    patternHelp: '12 or 13 digits starting with 978 or 979.',
    example: '9780306406157',
  },
];

export const DEFAULT_BARCODE_CONFIG: BarcodeConfig = {
  type: 'ean13',
  text: '890123456789',
  scale: 3,
  height: 15, // in mm approx
  includeText: true,
  textMargin: 4,
  textSize: 12,
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  transparentBackground: false,
  qrErrorCorrection: 'M',
  qrContentType: 'text',
  labelTitle: '',
  labelSubtitle: '',
  labelPrice: '',
};

// Checksum helper for EAN-13
export function computeEAN13Checksum(digits12: string): string {
  const clean = digits12.replace(/\D/g, '').slice(0, 12);
  if (clean.length < 12) return clean;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return clean + checksum;
}

// Checksum helper for UPC-A
export function computeUPCAChecksum(digits11: string): string {
  const clean = digits11.replace(/\D/g, '').slice(0, 11);
  if (clean.length < 11) return clean;
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return clean + checksum;
}

// Clean and prepare text for bwip-js based on type
export function sanitizeBarcodeText(type: BarcodeType, input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '000000000000';

  if (type === 'ean13') {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 12) return computeEAN13Checksum(digits);
    if (digits.length >= 13) return digits.slice(0, 13);
    return digits.padEnd(12, '0');
  }

  if (type === 'ean8') {
    const digits = trimmed.replace(/\D/g, '');
    return digits.slice(0, 8);
  }

  if (type === 'upca') {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 11) return computeUPCAChecksum(digits);
    if (digits.length >= 12) return digits.slice(0, 12);
    return digits.padEnd(11, '0');
  }

  if (type === 'itf14') {
    const digits = trimmed.replace(/\D/g, '');
    return digits.slice(0, 14);
  }

  if (type === 'isbn') {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 12) return computeEAN13Checksum(digits);
    return digits.slice(0, 13);
  }

  return trimmed;
}

// Generate Barcode to Canvas with Optional Product Header / Price Badge
export async function generateBarcodeCanvas(config: BarcodeConfig): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const safeText = sanitizeBarcodeText(config.type, config.text);

  // Map bwip-js barcode type name
  let bcid: string = config.type;
  if (config.type === 'azteccode') bcid = 'azteccode';
  if (config.type === 'pdf417') bcid = 'pdf417';

  // Base options for bwipjs
  const bwipOptions: any = {
    bcid: bcid,
    text: safeText,
    scale: config.scale || 3,
    height: config.height || (config.type === 'qrcode' ? 30 : 15),
    includetext: config.includeText,
    textmargin: config.textMargin || 4,
    textsize: config.textSize || 11,
    barcolor: config.foregroundColor.replace('#', ''),
  };

  if (!config.transparentBackground) {
    bwipOptions.backgroundcolor = config.backgroundColor.replace('#', '');
  }

  if (config.type === 'qrcode') {
    bwipOptions.eclevel = config.qrErrorCorrection || 'M';
  }

  // Render raw barcode to an offscreen canvas
  const rawCanvas = document.createElement('canvas');
  try {
    bwipjs.toCanvas(rawCanvas, bwipOptions);
  } catch (err: any) {
    throw new Error(`Barcode generation error (${config.type}): ${err.message || err}`);
  }

  // If there is no custom label, return raw canvas
  const hasLabel = Boolean(config.labelTitle?.trim() || config.labelPrice?.trim() || config.labelSubtitle?.trim());
  if (!hasLabel) {
    return rawCanvas;
  }

  // Composite nice sticker/label with Title, Subtitle, Price, and Barcode
  const padding = 16;
  const headerHeight = (config.labelTitle ? 24 : 0) + (config.labelSubtitle ? 18 : 0);
  const footerHeight = config.labelPrice ? 28 : 0;

  const totalW = Math.max(rawCanvas.width + padding * 2, 260);
  const totalH = rawCanvas.height + headerHeight + footerHeight + padding * 2;

  canvas.width = totalW;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = config.transparentBackground ? 'transparent' : config.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);

  let currentY = padding;

  // Header Title
  if (config.labelTitle) {
    ctx.fillStyle = config.foregroundColor || '#111827';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.labelTitle, totalW / 2, currentY + 14);
    currentY += 22;
  }

  // Header Subtitle
  if (config.labelSubtitle) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.labelSubtitle, totalW / 2, currentY + 12);
    currentY += 18;
  }

  // Barcode Draw
  const barcodeX = (totalW - rawCanvas.width) / 2;
  ctx.drawImage(rawCanvas, barcodeX, currentY);
  currentY += rawCanvas.height + 6;

  // Price Badge / Footer
  if (config.labelPrice) {
    ctx.fillStyle = config.foregroundColor || '#047857';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(config.labelPrice, totalW / 2, currentY + 14);
  }

  return canvas;
}

// Generate Barcode as SVG String
export function generateBarcodeSVG(config: BarcodeConfig): string {
  const safeText = sanitizeBarcodeText(config.type, config.text);
  const bwipOptions: any = {
    bcid: config.type,
    text: safeText,
    scale: config.scale || 3,
    height: config.height || (config.type === 'qrcode' ? 30 : 15),
    includetext: config.includeText,
    textmargin: config.textMargin || 4,
    textsize: config.textSize || 11,
    barcolor: config.foregroundColor.replace('#', ''),
  };

  if (!config.transparentBackground) {
    bwipOptions.backgroundcolor = config.backgroundColor.replace('#', '');
  }

  if (config.type === 'qrcode') {
    bwipOptions.eclevel = config.qrErrorCorrection || 'M';
  }

  return bwipjs.toSVG(bwipOptions);
}

// QR Code Helpers
export function formatUPIPaymentString(vpa: string, name: string, amount?: string, note?: string): string {
  let upi = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name || 'Merchant')}`;
  if (amount && Number(amount) > 0) {
    upi += `&am=${encodeURIComponent(amount)}&cu=INR`;
  }
  if (note) {
    upi += `&tn=${encodeURIComponent(note)}`;
  }
  return upi;
}

export function formatWifiString(ssid: string, pass: string, encryption: 'WPA' | 'WEP' | 'nopass' = 'WPA', hidden = false): string {
  return `WIFI:S:${ssid};T:${encryption};P:${pass};H:${hidden ? 'true' : 'false'};;`;
}

export function formatVCardString(contact: {
  name: string;
  phone: string;
  email: string;
  company?: string;
  title?: string;
  website?: string;
}): string {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${contact.name};;;;`,
    `FN:${contact.name}`,
    contact.company ? `ORG:${contact.company}` : '',
    contact.title ? `TITLE:${contact.title}` : '',
    contact.phone ? `TEL;TYPE=CELL:${contact.phone}` : '',
    contact.email ? `EMAIL:${contact.email}` : '',
    contact.website ? `URL:${contact.website}` : '',
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\n');
}
