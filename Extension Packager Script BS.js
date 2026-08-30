import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const distDir = path.resolve('dist');
const publicDir = path.resolve('public');
const outZip = path.resolve('pixelshift-extension.zip');

async function buildExtension() {
  console.log('🚀 Finalizing Chrome Extension Build...');

  // 1. Ensure manifest.json exists in dist
  const manifestSrc = path.join(publicDir, 'manifest.json');
  const manifestDest = path.join(distDir, 'manifest.json');

  if (fs.existsSync(manifestSrc) && !fs.existsSync(manifestDest)) {
    fs.copyFileSync(manifestSrc, manifestDest);
    console.log('✅ Copied manifest.json to dist/');
  }

  // 2. Ensure icons exist
  const iconsSrc = path.join(publicDir, 'icons');
  const iconsDest = path.join(distDir, 'icons');

  if (fs.existsSync(iconsSrc) && !fs.existsSync(iconsDest)) {
    fs.cpSync(iconsSrc, iconsDest, { recursive: true });
    console.log('✅ Copied extension icons to dist/icons/');
  }

  // 3. Package dist directory into a distributable ZIP file
  const output = fs.createWriteStream(outZip);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`📦 Extension packaged successfully: ${outZip} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
    console.log('👉 To load in Chrome: Go to chrome://extensions -> Developer Mode -> Load Unpacked -> select "dist" folder.');
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(distDir, false);
  await archive.finalize();
}

buildExtension().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});