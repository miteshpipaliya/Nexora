/**
 * NEXORA Admin Claim Setup Script (scripts/set-admin-claim.ts)
 * 
 * Usage:
 *   npm run admin:claim -- user@bvm.edu.in
 * 
 * Reads FIREBASE_SERVICE_ACCOUNT (raw or base64 JSON) as the single environment variable.
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

function parseServiceAccount(raw: string): any {
  let trimmed = raw.trim();
  // Check if base64 encoded
  if (!trimmed.startsWith('{') && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    try {
      trimmed = Buffer.from(trimmed, 'base64').toString('utf8');
    } catch {}
  }
  return JSON.parse(trimmed);
}

function initAdmin(): App {
  const apps = getApps();
  if (apps.length > 0 && apps[0]) {
    return apps[0];
  }

  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saEnv && saEnv.trim()) {
    try {
      const sa = parseServiceAccount(saEnv);
      return initializeApp({
        credential: cert(sa),
        projectId: sa.project_id
      });
    } catch (e: any) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e.message);
    }
  }

  // Local service-account.json fallback for development
  const localFile = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(localFile)) {
    const sa = JSON.parse(fs.readFileSync(localFile, 'utf8'));
    return initializeApp({
      credential: cert(sa),
      projectId: sa.project_id
    });
  }

  throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not configured. Please supply raw or base64 service account JSON.');
}

async function main() {
  const target = process.argv[2]?.trim();
  if (!target) {
    console.error('Error: Please provide a user email or Firebase UID.');
    console.error('Usage: npm run admin:claim -- <email-or-uid>');
    process.exit(1);
  }

  try {
    const app = initAdmin();
    const auth = getAuth(app);

    let user: UserRecord;
    if (target.includes('@')) {
      console.log(`Looking up user by email: ${target}...`);
      user = await auth.getUserByEmail(target.toLowerCase());
    } else {
      console.log(`Looking up user by UID: ${target}...`);
      user = await auth.getUser(target);
    }

    console.log(`Found user: ${user.email} (UID: ${user.uid})`);
    console.log('Current custom claims:', user.customClaims || {});

    await auth.setCustomUserClaims(user.uid, {
      ...user.customClaims,
      admin: true
    });

    console.log(`SUCCESS: Custom claim { admin: true } granted to ${user.email} (${user.uid}).`);
    console.log('The user must sign out and sign back in for the new ID token to reflect this claim.');
  } catch (err: any) {
    console.error('Failed to set admin claim:', err.message || err);
    process.exit(1);
  }
}

main();
