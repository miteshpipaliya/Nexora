import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Official Brand Favicon & Web Manifest Asset Verification', () => {
  const publicDir = path.resolve('public');

  function readPngDimensions(filePath: string): { width: number; height: number } {
    const buf = fs.readFileSync(filePath);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(buf.readUInt32BE(0)).toBe(0x89504e47);
    // Width and height in IHDR chunk
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }

  it('all required favicon and brand assets exist in public/', () => {
    const requiredFiles = [
      'favicon.ico',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'favicon-48x48.png',
      'apple-touch-icon.png',
      'android-chrome-192x192.png',
      'android-chrome-512x512.png',
      'site.webmanifest'
    ];

    for (const file of requiredFiles) {
      const fullPath = path.join(publicDir, file);
      expect(fs.existsSync(fullPath), `Missing required asset: ${file}`).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(0);
    }
  });

  it('verifies exact pixel dimensions of all PNG icons', () => {
    const specs: { file: string; expectedSize: number }[] = [
      { file: 'favicon-16x16.png', expectedSize: 16 },
      { file: 'favicon-32x32.png', expectedSize: 32 },
      { file: 'favicon-48x48.png', expectedSize: 48 },
      { file: 'apple-touch-icon.png', expectedSize: 180 },
      { file: 'android-chrome-192x192.png', expectedSize: 192 },
      { file: 'android-chrome-512x512.png', expectedSize: 512 }
    ];

    for (const spec of specs) {
      const fullPath = path.join(publicDir, spec.file);
      const { width, height } = readPngDimensions(fullPath);
      expect(width, `${spec.file} width`).toBe(spec.expectedSize);
      expect(height, `${spec.file} height`).toBe(spec.expectedSize);
    }
  });

  it('verifies favicon.ico has valid Windows Icon Directory header', () => {
    const icoPath = path.join(publicDir, 'favicon.ico');
    const buf = fs.readFileSync(icoPath);
    // ICO header: reserved 0, type 1 (icon)
    expect(buf.readUInt16LE(0)).toBe(0);
    expect(buf.readUInt16LE(2)).toBe(1);
    const count = buf.readUInt16LE(4);
    expect(count).toBeGreaterThanOrEqual(2); // multiple resolutions
  });

  it('verifies index.html declares standard favicon tags and canonical domain', () => {
    const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');

    expect(indexHtml).toContain('<link rel="icon" type="image/x-icon" href="/favicon.ico"');
    expect(indexHtml).toContain('href="/favicon-16x16.png"');
    expect(indexHtml).toContain('href="/favicon-32x32.png"');
    expect(indexHtml).toContain('href="/favicon-48x48.png"');
    expect(indexHtml).toContain('href="/apple-touch-icon.png"');
    expect(indexHtml).toContain('href="/site.webmanifest"');
    expect(indexHtml).toContain('<link rel="canonical" href="https://www.nexora-bvm.online/" />');
    expect(indexHtml).toContain('<meta name="theme-color" content="#0B0613" />');
  });

  it('verifies site.webmanifest configures brand identity and icon paths', () => {
    const manifestPath = path.join(publicDir, 'site.webmanifest');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    expect(manifest.name).toContain('NEXORA');
    expect(manifest.short_name).toBe('NEXORA');
    expect(manifest.theme_color).toBe('#0B0613');
    expect(manifest.background_color).toBe('#0B0613');

    const iconSrcs = manifest.icons.map((i: any) => i.src);
    expect(iconSrcs).toContain('/android-chrome-192x192.png');
    expect(iconSrcs).toContain('/android-chrome-512x512.png');
  });
});
