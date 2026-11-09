import { spawn } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

  async function exercisePreviewApi(secret?: string): Promise<{ health: number; auth: number; body?: string }> {
  const script = `
    const { app } = await import('./server.ts');
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const base = 'http://127.0.0.1:' + address.port;
    const health = await fetch(base + '/api/health');
    const auth = await fetch(base + '/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    process.stdout.write(JSON.stringify({ health: health.status, auth: auth.status }));
    server.close();
  `;

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        OTP_HMAC_SECRET: secret,
        FIREBASE_SERVICE_ACCOUNT: undefined,
        FIREBASE_CLIENT_EMAIL: undefined,
        FIREBASE_PRIVATE_KEY: undefined,
        BREVO_API_KEY: undefined,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) return reject(new Error(`Preview API child exited ${code}: ${stderr}`));
      try {
        resolve(JSON.parse(stdout) as { health: number; auth: number });
      } catch {
        reject(new Error(`Could not parse Preview API result: ${stdout} ${stderr}`));
      }
    });
  });
}

describe('Vercel Preview health and auth configuration', () => {
  it('serves health without OTP configuration and fails protected auth closed', async () => {
    await expect(exercisePreviewApi()).resolves.toEqual({ health: 200, auth: 503 });
  }, 20_000);

  it('allows protected route validation when a strong OTP secret is configured', async () => {
    await expect(exercisePreviewApi('test-only-preview-hmac-secret-at-least-32-chars'))
      .resolves.toEqual({ health: 200, auth: 400 });
  }, 20_000);
});
