/**
 * NEXORA Admin Claim Setup Script (scripts/set-admin-claim.ts)
 * 
 * Usage:
 *   npx tsx scripts/set-admin-claim.ts <user-email-or-uid>
 * 
 * Sets custom claim { admin: true } on the designated Firebase User.
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

function initAdmin(): App {
  const apps = getApps();
  if (apps.length > 0 && apps[0]) {
    return apps[0];
  }

  // 1. JSON string environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return initializeApp({
        credential: cert(sa)
      });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e);
    }
  }

  // 2. Separate credentials
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
  }

  // 3. Local service-account.json
  const saPath = path.resolve(process.cwd(), 'service-account.json');
  if (fs.existsSync(saPath)) {
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    return initializeApp({
      credential: cert(sa)
    });
  }

  // 4. Fallback to default application credentials
  return initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b'
  });
}

async function main() {
  const target = process.argv[2]?.trim();
  if (!target) {
    console.error('Error: Please provide a user email or Firebase UID.');
    console.error('Usage: npx tsx scripts/set-admin-claim.ts <email-or-uid>');
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
