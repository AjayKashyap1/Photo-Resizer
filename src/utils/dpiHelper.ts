/**
 * Sets DPI metadata in JPEG (APP0 JFIF marker) and PNG (pHYs chunk) binary blobs.
 */

// Embed JFIF APP0 marker into JPEG blob to set DPI
export async function setJpegDpi(blob: Blob, dpi: number): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Check JPEG SOI (FF D8)
  if (uint8[0] !== 0xff || uint8[1] !== 0xd8) {
    return blob;
  }

  // APP0 JFIF segment:
  // Marker: FF E0
  // Length: 00 10 (16 bytes)
  // Identifier: "JFIF\0" (4A 46 49 46 00)
  // Version: 01 02
  // Units: 01 (dots per inch)
  // Xdensity: 2 bytes
  // Ydensity: 2 bytes
  // Xthumbnail: 00, Ythumbnail: 00
  const jfifHeader = new Uint8Array([
    0xff, 0xe0, // APP0
    0x00, 0x10, // length = 16
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x02, // version 1.2
    0x01, // units = 1 (DPI)
    (dpi >> 8) & 0xff, dpi & 0xff, // Xdensity
    (dpi >> 8) & 0xff, dpi & 0xff, // Ydensity
    0x00, 0x00, // no thumbnail
  ]);

  let insertPos = 2; // right after SOI (FF D8)

  // Check if existing APP0 segment exists
  if (uint8[2] === 0xff && uint8[3] === 0xe0) {
    const existingLen = (uint8[4] << 8) + uint8[5];
    const afterApp0 = 2 + 2 + existingLen;
    // Replace existing APP0 with our new JFIF
    const result = new Uint8Array(2 + jfifHeader.length + (uint8.length - afterApp0));
    result.set(uint8.subarray(0, 2), 0);
    result.set(jfifHeader, 2);
    result.set(uint8.subarray(afterApp0), 2 + jfifHeader.length);
    return new Blob([result], { type: 'image/jpeg' });
  }

  // Insert JFIF APP0 right after SOI
  const result = new Uint8Array(2 + jfifHeader.length + (uint8.length - 2));
  result.set(uint8.subarray(0, 2), 0);
  result.set(jfifHeader, 2);
  result.set(uint8.subarray(2), 2 + jfifHeader.length);
  return new Blob([result], { type: 'image/jpeg' });
}

// CRC32 table for PNG chunk generation
const crcTable = (() => {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

// Embed pHYs chunk into PNG blob to set DPI
export async function setPngDpi(blob: Blob, dpi: number): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    uint8[0] !== 0x89 ||
    uint8[1] !== 0x50 ||
    uint8[2] !== 0x4e ||
    uint8[3] !== 0x47 ||
    uint8[4] !== 0x0d ||
    uint8[5] !== 0x0a ||
    uint8[6] !== 0x1a ||
    uint8[7] !== 0x0a
  ) {
    return blob;
  }

  // Convert DPI to pixels per meter (1 inch = 0.0254 meters)
  const ppm = Math.round(dpi / 0.0254);

  // pHYs data: 4 bytes X ppm, 4 bytes Y ppm, 1 byte unit (1 = meter)
  const physChunkData = new Uint8Array(9);
  physChunkData[0] = (ppm >>> 24) & 0xff;
  physChunkData[1] = (ppm >>> 16) & 0xff;
  physChunkData[2] = (ppm >>> 8) & 0xff;
  physChunkData[3] = ppm & 0xff;

  physChunkData[4] = (ppm >>> 24) & 0xff;
  physChunkData[5] = (ppm >>> 16) & 0xff;
  physChunkData[6] = (ppm >>> 8) & 0xff;
  physChunkData[7] = ppm & 0xff;

  physChunkData[8] = 0x01; // Unit specifier: 1 = meter

  // Chunk Type: "pHYs"
  const typeAndData = new Uint8Array(4 + 9);
  typeAndData[0] = 0x70; // 'p'
  typeAndData[1] = 0x48; // 'H'
  typeAndData[2] = 0x59; // 'Y'
  typeAndData[3] = 0x73; // 's'
  typeAndData.set(physChunkData, 4);

  const crc = crc32(typeAndData);

  // Complete chunk: 4 bytes length (9) + 4 bytes type + 9 bytes data + 4 bytes CRC = 21 bytes
  const physChunk = new Uint8Array(4 + 4 + 9 + 4);
  physChunk[0] = 0x00;
  physChunk[1] = 0x00;
  physChunk[2] = 0x00;
  physChunk[3] = 0x09; // length = 9

  physChunk.set(typeAndData, 4);

  physChunk[17] = (crc >>> 24) & 0xff;
  physChunk[18] = (crc >>> 16) & 0xff;
  physChunk[19] = (crc >>> 8) & 0xff;
  physChunk[20] = crc & 0xff;

  // Insert right after IHDR chunk
  // PNG signature is 8 bytes.
  // IHDR length is at 8..11 (usually 13 bytes).
  // IHDR ends at 8 + 4 (length) + 4 (IHDR) + 13 + 4 (crc) = 33 bytes.
  const ihdrLen = (uint8[8] << 24) | (uint8[9] << 16) | (uint8[10] << 8) | uint8[11];
  const afterIhdrPos = 8 + 4 + 4 + ihdrLen + 4;

  const result = new Uint8Array(uint8.length + physChunk.length);
  result.set(uint8.subarray(0, afterIhdrPos), 0);
  result.set(physChunk, afterIhdrPos);
  result.set(uint8.subarray(afterIhdrPos), afterIhdrPos + physChunk.length);

  return new Blob([result], { type: 'image/png' });
}

export async function injectDpiMetadata(blob: Blob, format: string, dpi: number): Promise<Blob> {
  if (!dpi || dpi <= 0) return blob;

  try {
    if (format === 'image/jpeg' || format === 'image/jpg') {
      return await setJpegDpi(blob, dpi);
    }
    if (format === 'image/png') {
      return await setPngDpi(blob, dpi);
    }
  } catch (err) {
    console.warn('Failed to embed DPI metadata:', err);
  }

  return blob;
}
