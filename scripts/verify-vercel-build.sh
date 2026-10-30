#!/usr/bin/env bash
set -e

TMP_DIR=$(mktemp -d ../.tmp_verify_XXXXXX)
echo "Setting up verification in $TMP_DIR..."

cp -a ./ "$TMP_DIR/"
rm -rf "$TMP_DIR/dist" "$TMP_DIR/.git" "$TMP_DIR/node_modules"
cp -al /app/applet/node_modules "$TMP_DIR/node_modules"

cd "$TMP_DIR"
mkdir -p .vercel
cat << 'EOF' > .vercel/project.json
{
  "projectId": "prj_fake_for_local_verify",
  "orgId": "team_fake_for_local_verify",
  "settings": {}
}
EOF

# Ensure server.js is built
npm run build

echo "Simulating Vercel build function bundle..."
mkdir -p .vercel/output/functions/api/index.func/api
# In Vercel output structure, api/index.ts is compiled to api/index.js
# and server.js is copied or bundled
cp api/index.ts .vercel/output/functions/api/index.func/api/index.js 2>/dev/null || true
# If index.ts has TypeScript syntax, strip or transpile
node -e "
const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');
// remove ts annotations if any
fs.writeFileSync('.vercel/output/functions/api/index.func/api/index.js', code);
" 2>/dev/null || cp api/index.ts .vercel/output/functions/api/index.func/api/index.js
cp server.js .vercel/output/functions/api/index.func/server.js 2>/dev/null || true

echo "Testing built function import..."
export VERCEL=1
export NODE_ENV=production

node --input-type=module << 'EOF'
import http from 'http';
import path from 'path';

async function test() {
  const targetPath = path.resolve('.vercel/output/functions/api/index.func/api/index.js');
  try {
    const handlerModule = await import(targetPath);
    const app = handlerModule.default || handlerModule.app || handlerModule;
    console.log('LOADED OK from ' + targetPath);

    const server = http.createServer((req, res) => {
      app(req, res);
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const status = res.status;
    const body = await res.text();
    console.log(`Health status: ${status}, body: ${body}`);

    server.close();
    if (status === 200) {
      console.log('VERIFICATION SUCCESS: 200 OK');
      process.exit(0);
    } else {
      console.error('VERIFICATION FAILED: expected 200, got ' + status);
      process.exit(1);
    }
  } catch (err) {
    console.error('Import error for ' + targetPath + ':', err.code || err.message);
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message.includes('ERR_MODULE_NOT_FOUND') || err.message.includes('Cannot find module')) {
      console.error('ERR_MODULE_NOT_FOUND caught as expected on un-suffixed import');
    }
    process.exit(1);
  }
}

test();
EOF

RESULT=$?
cd /app/applet
rm -rf "$TMP_DIR"
exit $RESULT
