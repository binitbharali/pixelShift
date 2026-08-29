// Read raw byte array from canvas for ICO / BMP / GIF encoders
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, width, height);
const pixels = imageData.data; // [r, g, b, a, r, g, b, a, ...]