import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public', 'phoenix-icon.svg');
const destination = path.join(root, 'public');
const background = '#000000';

async function createIcon(size, filename, inset) {
  const imageSize = Math.round(size * (1 - inset * 2));
  const foreground = await sharp(source)
    .resize(imageSize, imageSize, { fit: 'contain', background: '#00000000' })
    .png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: foreground, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(destination, filename));
}
await createIcon(192, 'pwa-phoenix-192.png', 0.08);
await createIcon(512, 'pwa-phoenix-512.png', 0.08);
await createIcon(512, 'pwa-phoenix-maskable-512.png', 0.17);
await createIcon(180, 'pwa-apple-touch-180.png', 0.08);
// Android status-bar notification badges must be monochrome with transparency.
// A full black-backed PWA icon renders as an opaque white square in the status bar.
const badgeSize = 96;
const { data: badgePixels, info: badgeInfo } = await sharp(source)
  .resize(badgeSize, badgeSize, { fit: 'contain', background: '#00000000' })
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < badgePixels.length; i += badgeInfo.channels) {
  const alpha = badgePixels[i + 3];
  const brightness = Math.max(badgePixels[i], badgePixels[i + 1], badgePixels[i + 2]);
  badgePixels[i] = 255;
  badgePixels[i + 1] = 255;
  badgePixels[i + 2] = 255;
  badgePixels[i + 3] = alpha > 12 && brightness > 35 ? alpha : 0;
}
await sharp(badgePixels, { raw: { width: badgeSize, height: badgeSize, channels: badgeInfo.channels } })
  .png().toFile(path.join(destination, 'notification-badge-96.png'));
console.log('Generated black-background NEXORA winged queen/phoenix PWA icons');
