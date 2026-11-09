import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  AdminPasswordRecord
} from '../src/server/adminPassword';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read named database ID from firebase-applet-config.json
function getDatabaseId(): string {
  try {
    const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (parsed.firestoreDatabaseId) return parsed.firestoreDatabaseId;
    }
  } catch {}
  return 'ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b';
}

function getAdminDb() {
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  let appInstance;

  if (getApps().length > 0) {
    appInstance = getApps()[0];
  } else if (saRaw) {
    let sa: any;
    try {
      sa = JSON.parse(saRaw);
    } catch {
      try {
        sa = JSON.parse(Buffer.from(saRaw, 'base64').toString('utf8'));
      } catch (err: any) {
        console.error('Invalid FIREBASE_SERVICE_ACCOUNT JSON/base64 format:', err.message);
        process.exit(1);
      }
    }
    appInstance = initializeApp({
      credential: cert(sa),
      projectId: sa.project_id || 'gen-lang-client-0089073748'
    });
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    appInstance = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0089073748',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
  } else {
    appInstance = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0089073748'
    });
  }

  const dbId = getDatabaseId();
  return getFirestore(appInstance, dbId);
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const stdin = process.stdin;
    process.stdout.write(question);

    let pass = '';
    const onData = (char: any) => {
      char = char.toString('utf8');
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          break;
        default:
          process.stdout.write('*');
          pass += char;
          break;
      }
    };

    stdin.on('data', onData);

    rl.on('line', () => {
      rl.close();
      resolve(pass);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const db = getAdminDb();

  if (args.includes('--clear')) {
    await db.collection('_admin_security').doc('founder').delete();
    console.log('Admin password cleared.');
    process.exit(0);
  }

  if (args.includes('--set')) {
    const p1 = await promptHidden('Enter new Admin Security Password: ');
    const p2 = await promptHidden('\nConfirm new Admin Security Password: ');
    console.log('');

    if (p1 !== p2) {
      console.error('Error: Passwords do not match.');
      process.exit(1);
    }

    // Read previous record to check version and previous password rejection
    const docRef = db.collection('_admin_security').doc('founder');
    const existingSnap = await docRef.get().catch(() => null);
    const existingData = existingSnap?.exists ? (existingSnap.data() as AdminPasswordRecord) : null;

    const policy = validatePasswordPolicy(p1, existingData);
    if (!policy.valid) {
      console.error(`Error: ${policy.reason}`);
      process.exit(1);
    }

    const nextVersion = (existingData?.passwordVersion || 1) + 1;
    const newRecord = hashPassword(p1, { version: nextVersion });

    // Write new password and revoke sessions
    await docRef.set(newRecord);

    // Delete every pending admin OTP, setup and reset challenge
    try {
      const challengesSnap = await db.collection('_otp_challenges').get();
      const batch = db.batch();
      for (const doc of challengesSnap.docs) {
        batch.delete(doc.ref);
      }
      await batch.commit();
    } catch {}

    // Read the document back and verify the new password against it
    const verifySnap = await docRef.get();
    if (!verifySnap.exists) {
      console.error('Error: Verification failed. Document could not be read back.');
      process.exit(1);
    }

    const readBackRecord = verifySnap.data() as AdminPasswordRecord;
    if (!verifyPassword(p1, readBackRecord)) {
      console.error('Error: Verification failed. Stored hash does not match password.');
      process.exit(1);
    }

    console.log('Admin password updated.');
    process.exit(0);
  }

  console.log('Usage: npm run admin:password -- --set OR npm run admin:password -- --clear');
}

main().catch((err) => {
  console.error('Admin CLI failed:', err?.message || err);
  process.exit(1);
});
