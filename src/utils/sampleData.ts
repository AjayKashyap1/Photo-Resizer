import { DimensionPreset } from '../types';

export const DIMENSION_PRESETS: DimensionPreset[] = [
  // E-Commerce & Retail
  {
    id: 'amazon_main',
    name: 'Amazon / Flipkart Product Main',
    category: 'E-Commerce',
    width: 2000,
    height: 2000,
    unit: 'px',
    description: 'High-res 1:1 square for zoom capability on e-commerce marketplaces.',
  },
  {
    id: 'shopify_thumb',
    name: 'E-Commerce Catalog Square',
    category: 'E-Commerce',
    width: 1080,
    height: 1080,
    unit: 'px',
    description: 'Standard product catalog thumbnail (1080x1080px).',
  },
  {
    id: 'ebay_standard',
    name: 'Product Listing (1600x1200)',
    category: 'E-Commerce',
    width: 1600,
    height: 1200,
    unit: 'px',
    description: '4:3 standard aspect product photo.',
  },

  // Passport & ID Forms
  {
    id: 'passport_in',
    name: 'Passport Photo (3.5 x 4.5 cm)',
    category: 'Passport & ID',
    width: 413,
    height: 531,
    unit: 'px',
    description: 'Indian & European standard passport size (35mm x 45mm @ 300 DPI).',
  },
  {
    id: 'us_visa',
    name: 'US Visa / OCI (2 x 2 inch)',
    category: 'Passport & ID',
    width: 600,
    height: 600,
    unit: 'px',
    description: 'US Passport / Visa / OCI photo (2x2 inches @ 300 DPI).',
  },
  {
    id: 'gov_job_signature',
    name: 'Govt Exam / Signature Box',
    category: 'Passport & ID',
    width: 300,
    height: 120,
    unit: 'px',
    description: 'Standard signature box for SSC / UPSC / Bank job forms (Under 50 KB).',
  },

  // Social Media
  {
    id: 'insta_post',
    name: 'Instagram Post Portrait (4:5)',
    category: 'Social Media',
    width: 1080,
    height: 1350,
    unit: 'px',
    description: 'Full vertical feed post for maximum screen coverage.',
  },
  {
    id: 'insta_story',
    name: 'Story / Reel / Shorts (9:16)',
    category: 'Social Media',
    width: 1080,
    height: 1920,
    unit: 'px',
    description: 'Full HD vertical portrait for Stories, Reels, and YouTube Shorts.',
  },
  {
    id: 'youtube_thumb',
    name: 'YouTube Thumbnail (16:9)',
    category: 'Social Media',
    width: 1280,
    height: 720,
    unit: 'px',
    description: 'Standard 720p HD 16:9 thumbnail for video platforms.',
  },
  {
    id: 'facebook_banner',
    name: 'Banner / Cover (1200x630)',
    category: 'Social Media',
    width: 1200,
    height: 630,
    unit: 'px',
    description: 'OpenGraph link preview & Facebook header.',
  },

  // Web & Display
  {
    id: 'web_fhd',
    name: 'Full HD (1920 x 1080)',
    category: 'Display / Web',
    width: 1920,
    height: 1080,
    unit: 'px',
    description: 'Standard 1080p widescreen display resolution.',
  },
  {
    id: 'web_4k',
    name: 'Ultra HD 4K (3840 x 2160)',
    category: 'Display / Web',
    width: 3840,
    height: 2160,
    unit: 'px',
    description: 'Crisp 4K UHD presentation and display.',
  },
  {
    id: 'avatar_icon',
    name: 'Profile Avatar / Icon (512x512)',
    category: 'Display / Web',
    width: 512,
    height: 512,
    unit: 'px',
    description: 'Square avatar for user profiles, favicons, and app icons.',
  },

  // Print
  {
    id: 'print_a4',
    name: 'A4 Document (300 DPI)',
    category: 'Print & Paper',
    width: 2480,
    height: 3508,
    unit: 'px',
    description: 'Standard A4 page size for high-resolution print.',
  },
  {
    id: 'print_4x6',
    name: 'Photo Print 4x6 inch (300 DPI)',
    category: 'Print & Paper',
    width: 1800,
    height: 1200,
    unit: 'px',
    description: 'Classic physical postcard & photo album print.',
  },
];

// Generates dynamic SVG sample images
export function createSamplePhoto(title: string, color1: string, color2: string, width = 1600, height = 1200): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)"/>
    <rect width="100%" height="100%" fill="url(#grid)"/>
    <circle cx="${width / 2}" cy="${height / 2 - 40}" r="${Math.min(width, height) * 0.22}" fill="rgba(255,255,255,0.15)"/>
    <text x="50%" y="${height / 2 - 20}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.max(28, Math.round(width * 0.035))}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
      ${title}
    </text>
    <text x="50%" y="${height / 2 + 40}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.max(16, Math.round(width * 0.018))}" fill="rgba(255,255,255,0.85)" text-anchor="middle">
      Original Dimensions: ${width} × ${height} px
    </text>
    <rect x="${width / 2 - 120}" y="${height / 2 + 80}" width="240" height="36" rx="18" fill="rgba(0,0,0,0.25)"/>
    <text x="50%" y="${height / 2 + 103}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#ffffff" text-anchor="middle">
      PixelCraft Ready
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_IMAGES = [
  {
    name: 'Sample_Product_Earphones.svg',
    url: createSamplePhoto('Wireless Pro Earbuds - Studio Edition', '#2563eb', '#1e1b4b', 2400, 1800),
    width: 2400,
    height: 1800,
    size: 280000,
    format: 'image/svg+xml',
  },
  {
    name: 'Sample_Passport_Photo.svg',
    url: createSamplePhoto('Formal Identity Portrait', '#059669', '#064e3b', 1200, 1500),
    width: 1200,
    height: 1500,
    size: 195000,
    format: 'image/svg+xml',
  },
  {
    name: 'Sample_Landscape_Hero.svg',
    url: createSamplePhoto('Mountain Sunset Vista HDR', '#d97706', '#78350f', 3840, 2160),
    width: 3840,
    height: 2160,
    size: 512000,
    format: 'image/svg+xml',
  },
];

export const SAMPLE_BARCODES = [
  { text: '8901030384355', type: 'ean13' as const, labelTitle: 'Amul Butter 500g', labelPrice: '₹275.00' },
  { text: '8901491101837', type: 'ean13' as const, labelTitle: 'Tata Tea Gold 1kg', labelPrice: '₹480.00' },
  { text: '012345678905', type: 'upca' as const, labelTitle: 'Premium Coffee Blend', labelPrice: '$14.99' },
  { text: 'SHIP-IND-9948210', type: 'code128' as const, labelTitle: 'Express Logistics Parcel', labelPrice: 'Priority' },
  { text: 'https://ais.studio/build', type: 'qrcode' as const, labelTitle: 'Google AI Studio Scan', labelPrice: 'Scan Me' },
];
