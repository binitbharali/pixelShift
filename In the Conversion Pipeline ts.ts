// 1. Create off-screen canvas in memory
const canvas = document.createElement('canvas');
canvas.width = finalWidth;
canvas.height = finalHeight;
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// 2. High-quality resampling
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

// 3. Matte background (if converting transparency to JPG/BMP)
if (isOpaqueTarget) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalWidth, finalHeight);
}

// 4. Draw source image onto canvas
ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

// 5. Encode canvas to target format
canvas.toBlob((blob) => {
  // Converted result
}, mimeType, quality);