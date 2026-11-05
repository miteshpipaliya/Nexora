import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const MASTER_PATH = path.join(rootDir, 'design', 'nexora-logo-master.png');
const PUBLIC_DIR = path.join(rootDir, 'public');
const DOCS_DIR = path.join(rootDir, 'docs');
const DESIGN_DIR = path.join(rootDir, 'design');

/**
 * Extracts a true transparent RGBA alpha channel from the master glowing logo.
 * The master image is rendered additively on a near-pitch-black background (~#000000 - #05010f).
 * By subtracting noise floor, computing continuous alpha from luminance/max-channel,
 * and un-premultiplying color channels, we achieve smooth, glowing edges with ZERO
 * dark halos on light backgrounds and full luminous beauty on dark backgrounds.
 */
async function extractTransparentLogo(sourcePath) {
  const img = sharp(sourcePath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const rgbaBuffer = Buffer.alloc(width * height * 4);
  const NOISE_FLOOR = 7;
  const RANGE = 255 - NOISE_FLOOR;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * channels;
      const dstIdx = (y * width + x) * 4;

      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      const maxVal = Math.max(r, g, b);

      if (maxVal <= NOISE_FLOOR) {
        rgbaBuffer[dstIdx] = 0;
        rgbaBuffer[dstIdx + 1] = 0;
        rgbaBuffer[dstIdx + 2] = 0;
        rgbaBuffer[dstIdx + 3] = 0;
      } else {
        const rawAlpha = (maxVal - NOISE_FLOOR) / RANGE;
        // 0.88 power curve preserves the delicate purple cosmic glow without dark fringe
        const alpha = Math.min(1, Math.pow(rawAlpha, 0.88));

        // Un-premultiply RGB: C_src / alpha to recover true source emission color
        const unmultFactor = 1 / Math.max(rawAlpha, 0.05);
        const unR = Math.min(255, Math.round(r * unmultFactor));
        const unG = Math.min(255, Math.round(g * unmultFactor));
        const unB = Math.min(255, Math.round(b * unmultFactor));

        rgbaBuffer[dstIdx] = unR;
        rgbaBuffer[dstIdx + 1] = unG;
        rgbaBuffer[dstIdx + 2] = unB;
        rgbaBuffer[dstIdx + 3] = Math.min(255, Math.max(0, Math.round(alpha * 255)));
      }
    }
  }

  return sharp(rgbaBuffer, { raw: { width, height, channels: 4 } });
}

async function main() {
  if (!fs.existsSync(MASTER_PATH)) {
    throw new Error(`Master logo not found at ${MASTER_PATH}`);
  }

  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  console.log('[ICONS] Processing transparent master from design/nexora-logo-master.png...');
  const transparentSharp = await extractTransparentLogo(MASTER_PATH);

  // 1. Generate master transparent 1024x1024 PNG
  const master1024Buffer = await transparentSharp
    .clone()
    .resize(1024, 1024, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(DESIGN_DIR, 'nexora-logo-transparent-1024.png'), master1024Buffer);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'logo_transparent.png'), master1024Buffer);
  // Also update public/logo.png with transparent version
  fs.writeFileSync(path.join(PUBLIC_DIR, 'logo.png'), master1024Buffer);
  console.log('Saved 1024x1024 transparent master to design/ and public/');

  // 2. High-resolution icons (96px, 144px, 180px, 192px, 512px)
  await sharp(master1024Buffer)
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .toFile(path.join(PUBLIC_DIR, 'icon-512.png'));
  console.log('Generated public/icon-512.png (512x512 transparent)');

  await sharp(master1024Buffer)
    .resize(192, 192, { kernel: sharp.kernel.lanczos3 })
    .toFile(path.join(PUBLIC_DIR, 'icon-192.png'));
  console.log('Generated public/icon-192.png (192x192 transparent)');

  await sharp(master1024Buffer)
    .resize(180, 180, { kernel: sharp.kernel.lanczos3 })
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Generated public/apple-touch-icon.png (180x180 transparent)');

  await sharp(master1024Buffer)
    .resize(144, 144, { kernel: sharp.kernel.lanczos3 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-144x144.png'));
  console.log('Generated public/favicon-144x144.png (144x144 transparent)');

  await sharp(master1024Buffer)
    .resize(96, 96, { kernel: sharp.kernel.lanczos3 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-96x96.png'));
  console.log('Generated public/favicon-96x96.png (96x96 transparent)');

  // 3. Maskable icon: star inside 80% safe zone with transparent outer padding
  const maskableInner = await sharp(master1024Buffer)
    .resize(410, 410, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 5, g: 1, b: 15, alpha: 1 } // #05010F per PWA spec for maskable
    }
  })
    .composite([{ input: maskableInner, gravity: 'center' }])
    .toFile(path.join(PUBLIC_DIR, 'icon-maskable-512.png'));
  console.log('Generated public/icon-maskable-512.png (512x512 maskable)');

  // 4. Small sizes (48px, 32px, 16px):
  // Trim 6% margins so the four compass star points and orbital arcs maximize presence and remain crisp
  // at 16-48px in browser tabs, address bars, and mobile bookmarks.
  const croppedSmallBuffer = await sharp(master1024Buffer)
    .extract({
      left: Math.round(1024 * 0.05),
      top: Math.round(1024 * 0.05),
      width: Math.round(1024 * 0.90),
      height: Math.round(1024 * 0.90)
    })
    .modulate({ brightness: 1.08, saturation: 1.25 })
    .toBuffer();

  await sharp(croppedSmallBuffer)
    .resize(48, 48, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.7, m1: 0.5, m2: 2 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-48x48.png'));
  console.log('Generated public/favicon-48x48.png (48x48 transparent)');

  await sharp(croppedSmallBuffer)
    .resize(32, 32, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.65, m1: 0.6, m2: 2.2 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));
  console.log('Generated public/favicon-32x32.png (32x32 transparent)');

  await sharp(croppedSmallBuffer)
    .resize(16, 16, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.6, m1: 0.8, m2: 2.5 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'));
  console.log('Generated public/favicon-16x16.png (16x16 transparent)');

  // 5. Generate transparent multi-resolution public/favicon.ico (16, 32, 48)
  try {
    const ico16 = path.join(PUBLIC_DIR, 'favicon-16x16.png');
    const ico32 = path.join(PUBLIC_DIR, 'favicon-32x32.png');
    const ico48 = path.join(PUBLIC_DIR, 'favicon-48x48.png');
    const icoOut = path.join(PUBLIC_DIR, 'favicon.ico');
    execSync(`convert -background none "${ico16}" "${ico32}" "${ico48}" "${icoOut}"`, { stdio: 'inherit' });
    console.log('Generated public/favicon.ico with 16x16, 32x32, 48x48 transparent layers');
  } catch (err) {
    console.warn('ImageMagick convert failed for ICO; writing standard 48px fallback', err);
    fs.copyFileSync(path.join(PUBLIC_DIR, 'favicon-48x48.png'), path.join(PUBLIC_DIR, 'favicon.ico'));
  }

  // Also maintain backward-compatible aliases for legacy android-chrome references
  fs.copyFileSync(path.join(PUBLIC_DIR, 'icon-192.png'), path.join(PUBLIC_DIR, 'android-chrome-192x192.png'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'icon-512.png'), path.join(PUBLIC_DIR, 'android-chrome-512x512.png'));

  // 6. Generate docs/icon-preview.png: visual verification sheet
  await generatePreviewSheet();
  console.log('[ICONS] All brand icons generated successfully.');
}

async function generatePreviewSheet() {
  const previewWidth = 800;
  const previewHeight = 600;

  const canvas = sharp({
    create: {
      width: previewWidth,
      height: previewHeight,
      channels: 3,
      background: '#0D0819'
    }
  });

  const icon48 = await sharp(path.join(PUBLIC_DIR, 'favicon-48x48.png')).toBuffer();
  const icon96 = await sharp(path.join(PUBLIC_DIR, 'favicon-96x96.png')).toBuffer();
  const icon180 = await sharp(path.join(PUBLIC_DIR, 'apple-touch-icon.png')).toBuffer();
  const icon32 = await sharp(path.join(PUBLIC_DIR, 'favicon-32x32.png')).toBuffer();
  const icon16 = await sharp(path.join(PUBLIC_DIR, 'favicon-16x16.png')).toBuffer();

  const circle48 = await sharp(icon48).composite([{
    input: Buffer.from(`<svg><circle cx="24" cy="24" r="24" fill="#000"/></svg>`),
    blend: 'dest-in'
  }]).toBuffer();

  const circle32 = await sharp(icon32).composite([{
    input: Buffer.from(`<svg><circle cx="16" cy="16" r="16" fill="#000"/></svg>`),
    blend: 'dest-in'
  }]).toBuffer();

  const circle16 = await sharp(icon16).composite([{
    input: Buffer.from(`<svg><circle cx="8" cy="8" r="8" fill="#000"/></svg>`),
    blend: 'dest-in'
  }]).toBuffer();

  const composits = [
    { input: icon180, top: 80, left: 50 },
    { input: icon96, top: 120, left: 260 },
    { input: icon48, top: 140, left: 390 },
    { input: circle48, top: 140, left: 470 },
    { input: icon32, top: 150, left: 550 },
    { input: circle32, top: 150, left: 610 },
    { input: icon16, top: 160, left: 670 },
    { input: circle16, top: 160, left: 710 }
  ];

  // Light background panel for Google Search light-mode and light tab simulation
  const whitePanel = await sharp({
    create: { width: 700, height: 260, channels: 3, background: '#F8F9FA' }
  })
    .composite([
      { input: icon180, top: 40, left: 30 },
      { input: icon96, top: 80, left: 240 },
      { input: icon48, top: 100, left: 370 },
      { input: circle48, top: 100, left: 450 },
      { input: icon32, top: 110, left: 530 },
      { input: circle32, top: 110, left: 590 },
      { input: icon16, top: 120, left: 650 },
      { input: circle16, top: 120, left: 680 }
    ])
    .png()
    .toBuffer();

  composits.push({ input: whitePanel, top: 300, left: 50 });

  await canvas.composite(composits).toFile(path.join(DOCS_DIR, 'icon-preview.png'));
  console.log('Generated docs/icon-preview.png');
}

main().catch((err) => {
  console.error('[ICONS ERROR]', err);
  process.exit(1);
});
