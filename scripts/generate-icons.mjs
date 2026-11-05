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

const BG_COLOR = { r: 5, g: 1, b: 15, alpha: 1 }; // #05010F
const BG_HEX = '#05010F';

async function main() {
  if (!fs.existsSync(MASTER_PATH)) {
    throw new Error(`Master logo not found at ${MASTER_PATH}`);
  }

  const metadata = await sharp(MASTER_PATH).metadata();
  console.log(`[ICONS] Master logo loaded: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

  const { width = 1254, height = 1254 } = metadata;

  // 1. Full logo with ~6% margin for large sizes (96px and above)
  // Master image is 1254x1254. 6% margin is already naturally present around the star tips.
  const fullLogoBuffer = await sharp(MASTER_PATH)
    .flatten({ background: BG_HEX })
    .toBuffer();

  // 2. Tighter crop for small sizes (48px and below)
  // Trim ~8% from each side so the four star points fill the frame and remain bold at 16-48px
  const trimX = Math.round(width * 0.08);
  const trimY = Math.round(height * 0.08);
  const croppedWidth = width - trimX * 2;
  const croppedHeight = height - trimY * 2;

  const smallLogoBuffer = await sharp(MASTER_PATH)
    .extract({ left: trimX, top: trimY, width: croppedWidth, height: croppedHeight })
    .modulate({ brightness: 1.05, saturation: 1.25 })
    .linear(1.1, -10) // slight contrast boost
    .flatten({ background: BG_HEX })
    .toBuffer();

  // Generate public/icon-512.png (512x512)
  await sharp(fullLogoBuffer)
    .resize(512, 512, { kernel: sharp.kernel.lanczos3 })
    .toFile(path.join(PUBLIC_DIR, 'icon-512.png'));
  console.log('Generated public/icon-512.png');

  // Generate public/icon-192.png (192x192)
  await sharp(fullLogoBuffer)
    .resize(192, 192, { kernel: sharp.kernel.lanczos3 })
    .toFile(path.join(PUBLIC_DIR, 'icon-192.png'));
  console.log('Generated public/icon-192.png');

  // Generate public/icon-maskable-512.png (star & arcs within central 80% safe area)
  // 512 * 0.8 = ~410px inner content, placed over 512x512 solid #05010F background
  const maskableInner = await sharp(fullLogoBuffer)
    .resize(410, 410, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 3,
      background: BG_HEX
    }
  })
    .composite([{ input: maskableInner, gravity: 'center' }])
    .toFile(path.join(PUBLIC_DIR, 'icon-maskable-512.png'));
  console.log('Generated public/icon-maskable-512.png');

  // Generate public/apple-touch-icon.png (180x180)
  await sharp(fullLogoBuffer)
    .resize(180, 180, { kernel: sharp.kernel.lanczos3 })
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Generated public/apple-touch-icon.png');

  // Generate public/favicon-144x144.png (144x144)
  await sharp(fullLogoBuffer)
    .resize(144, 144, { kernel: sharp.kernel.lanczos3 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-144x144.png'));
  console.log('Generated public/favicon-144x144.png');

  // Generate public/favicon-96x96.png (96x96)
  await sharp(fullLogoBuffer)
    .resize(96, 96, { kernel: sharp.kernel.lanczos3 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-96x96.png'));
  console.log('Generated public/favicon-96x96.png');

  // Generate small sizes (48x48, 32x32, 16x16) with tighter crop & light sharpen
  await sharp(smallLogoBuffer)
    .resize(48, 48, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 2 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-48x48.png'));
  console.log('Generated public/favicon-48x48.png');

  await sharp(smallLogoBuffer)
    .resize(32, 32, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.7, m1: 0.5, m2: 2 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));
  console.log('Generated public/favicon-32x32.png');

  await sharp(smallLogoBuffer)
    .resize(16, 16, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.6, m1: 0.5, m2: 2 })
    .toFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'));
  console.log('Generated public/favicon-16x16.png');

  // Generate multi-resolution public/favicon.ico containing 16x16, 32x32, and 48x48
  try {
    const ico16 = path.join(PUBLIC_DIR, 'favicon-16x16.png');
    const ico32 = path.join(PUBLIC_DIR, 'favicon-32x32.png');
    const ico48 = path.join(PUBLIC_DIR, 'favicon-48x48.png');
    const icoOut = path.join(PUBLIC_DIR, 'favicon.ico');
    execSync(`convert "${ico16}" "${ico32}" "${ico48}" "${icoOut}"`, { stdio: 'inherit' });
    console.log('Generated public/favicon.ico (16, 32, 48)');
  } catch (err) {
    console.warn('ImageMagick convert failed for ICO; writing standard 48px ICO fallback', err);
    fs.copyFileSync(path.join(PUBLIC_DIR, 'favicon-48x48.png'), path.join(PUBLIC_DIR, 'favicon.ico'));
  }

  // Also maintain backward-compatible aliases for legacy android-chrome references
  fs.copyFileSync(path.join(PUBLIC_DIR, 'icon-192.png'), path.join(PUBLIC_DIR, 'android-chrome-192x192.png'));
  fs.copyFileSync(path.join(PUBLIC_DIR, 'icon-512.png'), path.join(PUBLIC_DIR, 'android-chrome-512x512.png'));

  // 3. Generate docs/icon-preview.png: every size on white and dark background, square and circular
  await generatePreviewSheet();
  console.log('[ICONS] All brand icons generated successfully.');
}

async function generatePreviewSheet() {
  const previewWidth = 800;
  const previewHeight = 600;

  // Render a clean preview canvas showing:
  // - 16, 32, 48, 96, 180 on dark (#0F0A1C) background (square & circular badge)
  // - 16, 32, 48, 96, 180 on light (#FFFFFF) background (square & circular badge)
  const sizes = [16, 32, 48, 96, 180];
  const composits = [];

  // We can generate SVG text overlay and compose icons onto a preview canvas
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

  // Circular masks
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

  composits.push(
    { input: icon180, top: 80, left: 50 },
    { input: icon96, top: 120, left: 260 },
    { input: icon48, top: 140, left: 390 },
    { input: circle48, top: 140, left: 470 },
    { input: icon32, top: 150, left: 550 },
    { input: circle32, top: 150, left: 610 },
    { input: icon16, top: 160, left: 670 },
    { input: circle16, top: 160, left: 710 }
  );

  // White background panel for Google Search light-mode simulation
  const whitePanel = await sharp({
    create: { width: 700, height: 260, channels: 3, background: '#FFFFFF' }
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
