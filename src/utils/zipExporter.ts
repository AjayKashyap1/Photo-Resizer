import JSZip from 'jszip';
import { BulkBarcodeItem, NamingTemplate, ProcessedImageItem } from '../types';

// Trigger direct browser download of Blob or DataURL
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Generate formatted file name based on naming templates
export function generateImageFilename(
  originalName: string,
  index: number,
  width: number,
  height: number,
  mimeType: string,
  template?: NamingTemplate
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';

  if (!template) {
    return `${baseName}_resized_${width}x${height}.${ext}`;
  }

  switch (template.pattern) {
    case 'custom_prefix':
      const prefix = template.prefix ? `${template.prefix}_` : 'img_';
      const num = String(index + 1).padStart(3, '0');
      const dimPart = template.includeDimensions ? `_${width}x${height}` : '';
      return `${prefix}${num}${dimPart}.${ext}`;
    case 'dimensions':
      return `${width}x${height}_${index + 1}.${ext}`;
    case 'counter':
      return `photo_${String(index + 1).padStart(3, '0')}.${ext}`;
    case 'original_resized':
    default:
      const dim = template.includeDimensions !== false ? `_${width}x${height}` : '_resized';
      return `${baseName}${dim}.${ext}`;
  }
}

// Export all processed images into a ZIP file
export async function exportImagesAsZip(
  images: ProcessedImageItem[],
  zipFilename = 'processed_photos.zip',
  namingTemplate?: NamingTemplate,
  onProgress?: (percent: number, statusText: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('resized_images') || zip;

  let completed = 0;
  const total = images.length;

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    if (item.outputBlob) {
      const filename = generateImageFilename(
        item.name,
        i,
        item.outputWidth,
        item.outputHeight,
        item.outputBlob.type || 'image/jpeg',
        namingTemplate
      );
      folder.file(filename, item.outputBlob);
    }
    completed++;
    if (onProgress) {
      onProgress(Math.round((completed / total) * 60), `Adding image ${completed}/${total}...`);
    }
  }

  // Add a manifest summary text file
  const summary = [
    `=== PixelCraft Studio Batch Image Export ===`,
    `Generated at: ${new Date().toLocaleString()}`,
    `Total Images Processed: ${images.length}`,
    `\nFile Details:`,
    ...images.map((img, idx) => {
      return `${idx + 1}. Original: ${img.name} (${img.originalWidth}x${img.originalHeight}px, ${(img.originalSize / 1024).toFixed(1)} KB) -> Output: (${img.outputWidth}x${img.outputHeight}px, ${((img.outputSize || 0) / 1024).toFixed(1)} KB)`;
    }),
  ].join('\n');

  zip.file('batch_summary.txt', summary);

  if (onProgress) {
    onProgress(75, 'Compressing ZIP package...');
  }

  const content = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(75 + Math.round(metadata.percent * 0.25), `Archiving ${metadata.percent.toFixed(0)}%`);
      }
    }
  );

  return content;
}

// Export batch barcodes into a ZIP file
export async function exportBarcodesAsZip(
  barcodes: BulkBarcodeItem[],
  zipFilename = 'generated_barcodes.zip',
  onProgress?: (percent: number, statusText: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('barcodes') || zip;

  let completed = 0;
  const total = barcodes.length;

  for (let i = 0; i < barcodes.length; i++) {
    const item = barcodes[i];
    if (item.blob) {
      const cleanName = `${item.type}_${item.text.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      folder.file(cleanName, item.blob);
    }
    completed++;
    if (onProgress) {
      onProgress(Math.round((completed / total) * 70), `Packaging barcode ${completed}/${total}...`);
    }
  }

  const content = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(70 + Math.round(metadata.percent * 0.3), `Creating ZIP...`);
      }
    }
  );

  return content;
}

// Export full project bundle (Images + Barcodes) in one zip
export async function exportAllBundleZip(
  images: ProcessedImageItem[],
  barcodes: BulkBarcodeItem[],
  onProgress?: (percent: number, statusText: string) => void
): Promise<Blob> {
  const zip = new JSZip();

  // Images folder
  if (images.length > 0) {
    const imgFolder = zip.folder('images');
    images.forEach((img, i) => {
      if (img.outputBlob && imgFolder) {
        const fname = generateImageFilename(img.name, i, img.outputWidth, img.outputHeight, img.outputBlob.type);
        imgFolder.file(fname, img.outputBlob);
      }
    });
  }

  // Barcodes folder
  if (barcodes.length > 0) {
    const bcFolder = zip.folder('barcodes');
    barcodes.forEach((bc) => {
      if (bc.blob && bcFolder) {
        const cleanName = `${bc.type}_${bc.text.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
        bcFolder.file(cleanName, bc.blob);
      }
    });
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    imageCount: images.length,
    barcodeCount: barcodes.length,
    app: 'PixelCraft & Barcode Studio',
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, (meta) => {
    if (onProgress) onProgress(Math.round(meta.percent), 'Bundling all files...');
  });
}
