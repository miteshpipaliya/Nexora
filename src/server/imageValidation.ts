import sharp from 'sharp';
/**
 * Validate declared image media type AND actual binary signature.
 * Never accept SVG/HTML, arbitrary data URLs, or user-selected file extensions.
 *
 * Signatures provide a first layer of defence; they do not prove an image is
 * well-formed or safe to process by an arbitrary decoder. Keep image decoding
 * isolated from privileged server code.
 */
export type SafeImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

export type InspectedImage =
  | { ok: true; mime: SafeImageMime; extension: '.png' | '.jpg' | '.webp'; bytes: Buffer }
  | { ok: false; error: string };

// Keep the encoded request beneath the 3 MB authenticated route limit.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 64;

export function inspectImageDataUrl(value: unknown): InspectedImage {
  if (typeof value !== 'string' || value.length > MAX_DATA_URL_LENGTH) {
    return { ok: false, error: 'Image data is missing or exceeds the 2 MB limit.' };
  }

  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 === 1) {
    return { ok: false, error: 'Only Base64 PNG, JPEG and WebP images are accepted.' };
  }

  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES ||
      bytes.toString('base64') !== match[2]) {
    return { ok: false, error: 'Invalid or oversized image payload.' };
  }

  const png = bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString('ascii', 12, 16) === 'IHDR' &&
    bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0;

  const jpeg = bytes.length >= 6 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff &&
    bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;

  const webp = bytes.length >= 16 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP' &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16)) &&
    bytes.readUInt32LE(4) + 8 === bytes.length;

  const types: Record<SafeImageMime, boolean> = {
    'image/png': png, 'image/jpeg': jpeg, 'image/webp': webp
  };
  const mime = match[1] as SafeImageMime;
  if (!types[mime]) return { ok: false, error: 'File signature does not match the declared image format.' };

  const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  return { ok: true, mime, extension: ext, bytes };
}

export function isSafeImageLibraryUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_DATA_URL_LENGTH) return false;
  const trimmed = value.trim();
  if (trimmed.startsWith('data:')) return inspectImageDataUrl(trimmed).ok;
  // Application-owned public asset paths, not scheme-relative URLs or backslashes.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') &&
      !/[\\\u0000-\u001f]/.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' &&
      !parsed.username && !parsed.password &&
      !/[\\\u0000-\u001f]/.test(trimmed);
  } catch {
    return false;
  }
}

/**
 * Decode and re-encode untrusted raster images before storing or returning
 * them. Signature checks alone cannot detect malformed/truncated images or
 * malicious metadata; re-encoding strips ancillary metadata from uploads.
 */
export async function decodeAndSanitizeImage(
  inspected: Extract<InspectedImage, { ok: true }>
): Promise<Buffer | null> {
  try {
    const decoder = sharp(inspected.bytes, {
      failOn: 'warning',
      limitInputPixels: 16_000_000,
      animated: false,
      sequentialRead: true,
    });
    const metadata = await decoder.metadata();
    if (!metadata.width || !metadata.height ||
        metadata.width * metadata.height > 16_000_000 ||
        metadata.pages && metadata.pages !== 1 ||
        metadata.format !== inspected.mime.slice('image/'.length).replace('jpeg', 'jpeg')) {
      return null;
    }
    // Never preserve EXIF, embedded profiles, ICC metadata or other chunks.
    const sanitized = await decoder.rotate().toFormat(
      inspected.mime === 'image/png' ? 'png'
        : inspected.mime === 'image/webp' ? 'webp' : 'jpeg',
    ).toBuffer();
    return sanitized.length > 0 && sanitized.length <= 2 * 1024 * 1024
      ? sanitized : null;
  } catch {
    return null;
  }
}
