import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { inspectImageDataUrl, isSafeImageLibraryUrl, decodeAndSanitizeImage } from '../src/server/imageValidation';

const asDataUrl = (mime: string, bytes: Buffer) => `data:${mime};base64,${bytes.toString('base64')}`;

const png = Buffer.alloc(25);
Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
png.writeUInt32BE(13, 8);
png.write('IHDR', 12, 'ascii');
png.writeUInt32BE(1, 16);
png.writeUInt32BE(1, 20);

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0xff, 0xd9]);

const webp = Buffer.alloc(20);
webp.write('RIFF', 0, 'ascii');
webp.writeUInt32LE(12, 4);
webp.write('WEBP', 8, 'ascii');
webp.write('VP8 ', 12, 'ascii');

describe('Image upload signature validation', () => {
  it('accepts correctly labeled supported headers', () => {
    expect(inspectImageDataUrl(asDataUrl('image/png', png))).toMatchObject({ ok: true, mime: 'image/png', extension: '.png' });
    expect(inspectImageDataUrl(asDataUrl('image/jpeg', jpeg))).toMatchObject({ ok: true, mime: 'image/jpeg', extension: '.jpg' });
    expect(inspectImageDataUrl(asDataUrl('image/webp', webp))).toMatchObject({ ok: true, mime: 'image/webp', extension: '.webp' });
  });

  it('rejects spoofed MIME and arbitrary executable payloads', () => {
    expect(inspectImageDataUrl(asDataUrl('image/png', jpeg)).ok).toBe(false);
    expect(inspectImageDataUrl(asDataUrl('image/jpeg', Buffer.from('<script>alert(1)</script>'))).ok).toBe(false);
    expect(inspectImageDataUrl('data:image/svg+xml;base64,PHN2Zz4=') .ok).toBe(false);
    expect(inspectImageDataUrl('data:text/html;base64,PGgxPkJvb208L2gxPg==').ok).toBe(false);
  });

  it('rejects malformed and oversized payloads', () => {
    expect(inspectImageDataUrl('data:image/png;base64,++++invalid')).toMatchObject({ ok: false });
    expect(inspectImageDataUrl(asDataUrl('image/png', Buffer.alloc(5 * 1024 * 1024 + 1))).ok).toBe(false);
    expect(inspectImageDataUrl({ mime: 'image/png' }).ok).toBe(false);
  });

  it('only permits safe public-image URL formats', () => {
    expect(isSafeImageLibraryUrl('/images/competitions/coderush.jpg')).toBe(true);
    expect(isSafeImageLibraryUrl('https://images.unsplash.com/photo.jpg')).toBe(true);
    expect(isSafeImageLibraryUrl(asDataUrl('image/png', png))).toBe(true);
    for (const unsafe of [
      'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      'http://insecure.example/photo.jpg', '//evil.example/photo.jpg', 'file:///etc/passwd',
      '/\\evil.example/image.png', 'https://user:pass@example.com/image.jpg'
    ]) expect(isSafeImageLibraryUrl(unsafe)).toBe(false);
  });
  it('rejects signature-correct but truncated fake PNG files during real decoding', async () => {
    const inspected = inspectImageDataUrl(asDataUrl('image/png', png));
    expect(inspected.ok).toBe(true);
    if (inspected.ok) expect(await decodeAndSanitizeImage(inspected)).toBeNull();
  });

  it('decodes a real image, strips metadata, and re-encodes safely', async () => {
    const source = await sharp({
      create: { width: 12, height: 8, channels: 4, background: '#8050d9' }
    }).png().withMetadata({ density: 300 }).toBuffer();
    const inspected = inspectImageDataUrl(asDataUrl('image/png', source));
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const sanitized = await decodeAndSanitizeImage(inspected);
    expect(sanitized).toBeTruthy();
    const result = await sharp(sanitized!).metadata();
    expect(result).toMatchObject({ format: 'png', width: 12, height: 8 });
    expect(result.exif).toBeUndefined();
    expect(result.icc).toBeUndefined();
    expect(result.xmp).toBeUndefined();
  });

  it('rejects an image whose decoded pixel count exceeds the limit', async () => {
    const source = await sharp({
      create: { width: 4096, height: 4096, channels: 3, background: '#9861dd' }
    }).png().toBuffer();
    const inspected = inspectImageDataUrl(asDataUrl('image/png', source));
    expect(inspected.ok).toBe(true);
    if (inspected.ok) expect(await decodeAndSanitizeImage(inspected)).toBeNull();
  });

});
