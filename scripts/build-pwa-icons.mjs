import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public', 'logo_transparent.png');
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
console.log('Generated black-background NEXORA phoenix PWA icons');
