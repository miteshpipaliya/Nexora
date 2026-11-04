import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import readline from 'readline';
import { hashPasswordScrypt } from '../src/server/adminSecurity';

const dbId = 'ai-studio-nexorastudenttec-75ba3757-5549-44e3-a3ae-2ae34026863b';

function getAdminDb() {
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
  let appInstance;
  if (getApps().length > 0) {
    appInstance = getApps()[0];
  } else if (saRaw) {
    const sa = typeof saRaw === 'string' ? JSON.parse(saRaw) : saRaw;
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
      resolve(pass.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const db = getAdminDb();

  if (args.includes('--clear')) {
    await db.collection('_admin_security').doc('founder').delete();
    console.log('Admin password cleared from Firestore. First-time setup is now available.');
    process.exit(0);
  }

  if (args.includes('--set')) {
    const p1 = await promptHidden('Enter new Admin Security Password: ');
    const p2 = await promptHidden('\nConfirm new Admin Security Password: ');
    console.log('');

    if (!p1 || p1.length < 16) {
      console.error('Password must be at least 16 characters long.');
      process.exit(1);
    }

    if (p1 !== p2) {
      console.error('Passwords do not match.');
      process.exit(1);
    }

    const { passwordHash, salt } = hashPasswordScrypt(p1);
    const now = Date.now();
    await db.collection('_admin_security').doc('founder').set({
      passwordHash,
      salt,
      updatedAt: now,
      passwordVersion: 2,
      sessionsRevokedBefore: now
    });

    console.log('Admin password updated successfully in Firestore.');
    process.exit(0);
  }

  console.log('Usage: npm run admin:password -- --set OR npm run admin:password -- --clear');
}

main().catch((err) => {
  console.error('Admin CLI failed:', err);
  process.exit(1);
});
