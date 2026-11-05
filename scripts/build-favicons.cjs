const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE = path.resolve('public/assets/aistudio/image_a3d44738.png');
const PUBLIC_DIR = path.resolve('public');

if (!fs.existsSync(SOURCE)) {
  console.error('Source logo does not exist:', SOURCE);
  process.exit(1);
}

console.log('Generating high-fidelity official NEXORA brand favicons from:', SOURCE);

// 1. Export raw 1254x1254 RGBA
const rawPath = '/tmp/logo_raw.rgba';
execSync(`convert "${SOURCE}" -depth 8 rgba:"${rawPath}"`);
const rawBuffer = fs.readFileSync(rawPath);

const W = 1254;
const H = 1254;
const outBuffer = Buffer.alloc(rawBuffer.length);

// 2. High-precision color-to-alpha conversion
// Extracts glowing star and curved arcs from black background while preserving vibrant purple-white core
for (let i = 0; i < rawBuffer.length; i += 4) {
  const r = rawBuffer[i];
  const g = rawBuffer[i + 1];
  const b = rawBuffer[i + 2];

  // Perceptual brightness
  const brightness = Math.max(r, g, b);

  if (brightness <= 7) {
    // Pure background
    outBuffer[i] = 0;
    outBuffer[i + 1] = 0;
    outBuffer[i + 2] = 0;
    outBuffer[i + 3] = 0;
  } else {
    // Smooth transition from threshold to fully opaque star
    const norm = Math.min(1, Math.max(0, (brightness - 7) / (255 - 7)));
    // Contrast curve: keeps the star solid and bright, fades the peripheral halo cleanly
    const alphaNorm = Math.pow(norm, 0.65);
    const alpha = Math.min(255, Math.max(1, Math.round(alphaNorm * 255)));

    // Un-premultiply colors so transparency renders cleanly on both dark and light UI
    const unmult = Math.min(2.5, 255 / alpha);
    outBuffer[i] = Math.min(255, Math.round(r * unmult));
    outBuffer[i + 1] = Math.min(255, Math.round(g * unmult));
    outBuffer[i + 2] = Math.min(255, Math.round(b * unmult));
    outBuffer[i + 3] = alpha;
  }
}

const cleanMasterRaw = '/tmp/master_clean.rgba';
fs.writeFileSync(cleanMasterRaw, outBuffer);

const masterPng = '/tmp/nexora_master_transparent.png';
execSync(`convert -size ${W}x${H} -depth 8 rgba:"${cleanMasterRaw}" "${masterPng}"`);
console.log('Created master transparent PNG');

// 3. Generate individual sizes with optimized filter and unsharp masking for small sizes
const sizes = [
  { size: 512, name: 'android-chrome-512x512.png', sharpen: '' },
  { size: 192, name: 'android-chrome-192x192.png', sharpen: '' },
  { size: 180, name: 'apple-touch-icon.png', sharpen: '' },
  { size: 48, name: 'favicon-48x48.png', sharpen: '-unsharp 0x0.75+0.75+0.008' },
  { size: 32, name: 'favicon-32x32.png', sharpen: '-unsharp 0x1.0+1.0+0.01' },
  { size: 16, name: 'favicon-16x16.png', sharpen: '-unsharp 0x1.2+1.2+0.01' },
];

for (const item of sizes) {
  const target = path.join(PUBLIC_DIR, item.name);
  const cmd = `convert "${masterPng}" -filter Lanczos -resize ${item.size}x${item.size} ${item.sharpen} "${target}"`;
  execSync(cmd);
  console.log(`Generated: ${item.name} (${item.size}x${item.size})`);
}

// 4. Generate multi-resolution favicon.ico containing 16x16, 32x32, 48x48
const icoTarget = path.join(PUBLIC_DIR, 'favicon.ico');
const fav16 = path.join(PUBLIC_DIR, 'favicon-16x16.png');
const fav32 = path.join(PUBLIC_DIR, 'favicon-32x32.png');
const fav48 = path.join(PUBLIC_DIR, 'favicon-48x48.png');

execSync(`convert "${fav16}" "${fav32}" "${fav48}" "${icoTarget}"`);
console.log('Generated: favicon.ico (multi-resolution 16x16, 32x32, 48x48)');

// Also generate favicon-192x192.png and favicon-512x512.png for backward compatibility
execSync(`cp "${path.join(PUBLIC_DIR, 'android-chrome-192x192.png')}" "${path.join(PUBLIC_DIR, 'favicon-192x192.png')}"`);
execSync(`cp "${path.join(PUBLIC_DIR, 'android-chrome-512x512.png')}" "${path.join(PUBLIC_DIR, 'favicon-512x512.png')}"`);

console.log('All favicon assets successfully generated.');
