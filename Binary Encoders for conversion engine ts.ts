/**
 * Binary Image Encoders for formats not supported natively by HTML5 Canvas (ICO, BMP, GIF).
 */

/**
 * Creates a multi-resolution Windows ICO icon file from an HTML5 Canvas.
 */
export async function canvasToIcoBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const sizes = [16, 32, 48, 64];
  const pngBlobs: { size: number; buffer: ArrayBuffer }[] = [];

  for (const size of sizes) {
    const resized = document.createElement('canvas');
    resized.width = size;
    resized.height = size;
    const ctx = resized.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, size, size);
      
      const blob = await new Promise<Blob | null>((res) => resized.toBlob(res, 'image/png'));
      if (blob) {
        const buffer = await blob.arrayBuffer();
        pngBlobs.push({ size, buffer });
      }
    }
  }

  if (pngBlobs.length === 0) {
    throw new Error('Failed to generate ICO frames');
  }

  // Calculate Header and Directory offsets
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalDirSize = dirEntrySize * pngBlobs.length;
  let offset = headerSize + totalDirSize;

  const totalBytes = offset + pngBlobs.reduce((acc, curr) => acc + curr.buffer.byteLength, 0);
  const outBuffer = new ArrayBuffer(totalBytes);
  const view = new DataView(outBuffer);

  // ICONDIR Header
  view.setUint16(0, 0, true);               // Reserved (0)
  view.setUint16(2, 1, true);               // Type 1 = ICO
  view.setUint16(4, pngBlobs.length, true); // Number of images

  // ICONDIRENTRY & Image Data
  let dirOffset = headerSize;
  const outUint8 = new Uint8Array(outBuffer);

  for (const item of pngBlobs) {
    const s = item.size >= 256 ? 0 : item.size;
    view.setUint8(dirOffset, s);                          // Width
    view.setUint8(dirOffset + 1, s);                      // Height
    view.setUint8(dirOffset + 2, 0);                      // Color palette (0 = no palette)
    view.setUint8(dirOffset + 3, 0);                      // Reserved
    view.setUint16(dirOffset + 4, 1, true);               // Color planes (1)
    view.setUint16(dirOffset + 6, 32, true);              // Bits per pixel (32)
    view.setUint32(dirOffset + 8, item.buffer.byteLength, true); // Image byte size
    view.setUint32(dirOffset + 12, offset, true);         // Offset of PNG data

    // Copy PNG bytes into payload section
    outUint8.set(new Uint8Array(item.buffer), offset);

    offset += item.buffer.byteLength;
    dirOffset += dirEntrySize;
  }

  return new Blob([outBuffer], { type: 'image/x-icon' });
}

/**
 * Creates an uncompressed 32-bit Windows Bitmap (BMP) file.
 */
export function canvasToBmpBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2d context for BMP');

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const bytesPerPixel = 4; // 32-bit RGBA
  const imageSize = width * height * bytesPerPixel;
  const fileSize = fileHeaderSize + infoHeaderSize + imageSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BITMAPFILEHEADER
  view.setUint16(0, 0x4D42, false);      // 'BM' identifier
  view.setUint32(2, fileSize, true);      // File size
  view.setUint16(6, 0, true);             // Reserved
  view.setUint16(8, 0, true);             // Reserved
  view.setUint32(10, fileHeaderSize + infoHeaderSize, true); // Offset to pixel data

  // BITMAPINFOHEADER
  view.setUint32(14, infoHeaderSize, true); // Header size
  view.setInt32(18, width, true);           // Width
  view.setInt32(22, -height, true);         // Top-down row order (-height)
  view.setUint16(26, 1, true);              // Color planes (1)
  view.setUint16(28, 32, true);             // 32 bits per pixel
  view.setUint32(30, 0, true);              // BI_RGB (no compression)
  view.setUint32(34, imageSize, true);      // Image size
  view.setInt32(38, 2835, true);            // Horizontal resolution (72 DPI)
  view.setInt32(42, 2835, true);            // Vertical resolution (72 DPI)
  view.setUint32(46, 0, true);              // Colors in color table
  view.setUint32(50, 0, true);              // Important colors

  // Write pixel bytes (BGRA byte order)
  let pixelOffset = fileHeaderSize + infoHeaderSize;
  for (let i = 0; i < data.length; i += 4) {
    view.setUint8(pixelOffset++, data[i + 2]); // Blue
    view.setUint8(pixelOffset++, data[i + 1]); // Green
    view.setUint8(pixelOffset++, data[i]);     // Red
    view.setUint8(pixelOffset++, data[i + 3]); // Alpha
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Creates a standard single-frame GIF89a file with palette quantization & LZW streaming.
 */
export function canvasToGifBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2d context for GIF');

  const width = Math.min(65535, Math.max(1, canvas.width));
  const height = Math.min(65535, Math.max(1, canvas.height));
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Build 256-color palette (6x6x6 RGB cube + grayscale ramp + transparent entry)
  const palette = new Uint8Array(256 * 3);
  let palIdx = 0;
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        palette[palIdx++] = Math.round(r * 51);
        palette[palIdx++] = Math.round(g * 51);
        palette[palIdx++] = Math.round(b * 51);
      }
    }
  }
  for (let i = 0; i < 39; i++) {
    const val = Math.round((i / 38) * 255);
    palette[palIdx++] = val;
    palette[palIdx++] = val;
    palette[palIdx++] = val;
  }
  palette[255 * 3] = 255;
  palette[255 * 3 + 1] = 255;
  palette[255 * 3 + 2] = 255;

  const totalPixels = width * height;
  const indexedPixels = new Uint8Array(totalPixels);
  let hasTransparency = false;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const a = data[offset + 3];
    if (a < 128) {
      indexedPixels[i] = 255;
      hasTransparency = true;
    } else {
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const rIdx = Math.min(5, Math.floor((r + 25) / 51));
      const gIdx = Math.min(5, Math.floor((g + 25) / 51));
      const bIdx = Math.min(5, Math.floor((b + 25) / 51));
      indexedPixels[i] = rIdx * 36 + gIdx * 6 + bIdx;
    }
  }

  // LZW Bit Stream Packaging
  const minCodeSize = 8;
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const outputBytes: number[] = [];
  let curAccum = 0;
  let curBits = 0;

  const emitBits = (code: number, numBits: number) => {
    curAccum |= (code << curBits);
    curBits += numBits;
    while (curBits >= 8) {
      outputBytes.push(curAccum & 0xff);
      curAccum >>= 8;
      curBits -= 8;
    }
  };

  const curCodeSize = minCodeSize + 1;
  emitBits(clearCode, curCodeSize);

  let codesEmitted = 0;
  for (let i = 0; i < totalPixels; i++) {
    emitBits(indexedPixels[i], curCodeSize);
    codesEmitted++;
    if (codesEmitted >= 4000) {
      emitBits(clearCode, curCodeSize);
      codesEmitted = 0;
    }
  }
  emitBits(endCode, curCodeSize);

  if (curBits > 0) outputBytes.push(curAccum & 0xff);

  // Sub-blocks
  const lzwBlocks: number[] = [];
  let byteIndex = 0;
  while (byteIndex < outputBytes.length) {
    const blockSize = Math.min(255, outputBytes.length - byteIndex);
    lzwBlocks.push(blockSize);
    for (let b = 0; b < blockSize; b++) {
      lzwBlocks.push(outputBytes[byteIndex + b]);
    }
    byteIndex += blockSize;
  }
  lzwBlocks.push(0x00);

  // Construct GIF89a Structure
  const outParts: Uint8Array[] = [];
  outParts.push(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])); // "GIF89a"

  const lsd = new Uint8Array(7);
  const lsdView = new DataView(lsd.buffer);
  lsdView.setUint16(0, width, true);
  lsdView.setUint16(2, height, true);
  lsd[4] = 0xf7;
  outParts.push(lsd);
  outParts.push(palette);

  if (hasTransparency) {
    outParts.push(new Uint8Array([0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0xff, 0x00]));
  }

  const id = new Uint8Array(10);
  const idView = new DataView(id.buffer);
  id[0] = 0x2c;
  idView.setUint16(5, width, true);
  idView.setUint16(7, height, true);
  outParts.push(id);

  outParts.push(new Uint8Array([minCodeSize]));
  outParts.push(new Uint8Array(lzwBlocks));
  outParts.push(new Uint8Array([0x3b])); // Terminator

  return new Blob(outParts, { type: 'image/gif' });
}