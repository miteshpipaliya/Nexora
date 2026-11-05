import readline from 'readline';
import { getAdminFirestoreInstance, writeAdminSecurityRecord, readAdminSecurityRecord } from '../src/server/adminSecurity';

async function askHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Mute output for password confidentiality
    const stdin = process.openStdin();
    const onData = (char: Buffer) => {
      const charStr = char.toString('utf8');
      if (charStr === '\n' || charStr === '\r' || charStr === '\u0004') {
        stdin.removeListener('data', onData);
      }
    };
    stdin.on('data', onData);

    rl.question(query, (value) => {
      rl.close();
      resolve(value);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isSet = args.includes('--set');
  const isClear = args.includes('--clear');

  if (!isSet && !isClear) {
    console.error('Usage: npm run admin:password -- --set  OR  npm run admin:password -- --clear');
    process.exit(1);
  }

  try {
    const db = await getAdminFirestoreInstance();
    if (!db) {
      console.error('Error: Could not connect to Firestore database.');
      process.exit(1);
    }

    if (isClear) {
      await db.collection('_admin_security').doc('founder').delete();
      await db.collection('systemConfig').doc('status').set({ initialized: false, updatedAt: new Date().toISOString() }, { merge: true });
      console.log('Admin security document cleared. First-time setup is now available.');
      process.exit(0);
    }

    if (isSet) {
      const pass1 = await askHidden('Enter new Admin Security Password (min 16 chars): ');
      console.log();
      if (!pass1 || pass1.length < 16) {
        console.error('Error: Admin Security Password must be at least 16 characters.');
        process.exit(1);
      }

      const pass2 = await askHidden('Confirm new Admin Security Password: ');
      console.log();
      if (pass1 !== pass2) {
        console.error('Error: Passwords do not match.');
        process.exit(1);
      }

      let currentVersion = 0;
      try {
        const existing = await readAdminSecurityRecord(db);
        if (existing) currentVersion = existing.passwordVersion || 0;
      } catch {}

      await writeAdminSecurityRecord(db, pass1, { previousVersion: currentVersion });
      console.log('Admin password updated');
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Error updating admin password:', err?.message || err);
    process.exit(1);
  }
}

main();
