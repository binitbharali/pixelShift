// Discovers HTML5 <canvas> elements on any scanned website and captures their live snapshot
const canvasElements = doc.querySelectorAll('canvas');
canvasElements.forEach((cvs, idx) => {
  const dataUrl = cvs.toDataURL('image/png');
  // Add canvas drawing to the detected image gallery
});