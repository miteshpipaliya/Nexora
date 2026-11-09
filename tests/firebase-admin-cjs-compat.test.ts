import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('Firebase Admin on the Vercel Node runtime', () => {
  it('loads Firebase Admin Auth when Node require(ESM) is disabled', () => {
    expect(() => execFileSync(
      process.execPath,
      ['--no-experimental-require-module', '-e', "require('firebase-admin/auth')"],
      { cwd: process.cwd(), stdio: 'pipe' }
    )).not.toThrow();
  }, 20_000);
});
