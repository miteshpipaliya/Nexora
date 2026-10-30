#!/usr/bin/env bash
set -euo pipefail

node - << 'EOF'
import fs from 'fs';

const stateFile = 'docs/SPRINT_STATE.md';
if (!fs.existsSync(stateFile)) {
  console.error(`Error: ${stateFile} does not exist.`);
  process.exit(1);
}

const content = fs.readFileSync(stateFile, 'utf8');
const backtickRegex = /`([^`]+)`/g;
let match;
const citedPaths = new Set();

while ((match = backtickRegex.exec(content)) !== null) {
  const item = match[1].trim();
  // Filter for file/directory paths
  const isLikelyPath = /^(src\/|docs\/|scripts\/|tests\/|api\/|public\/|supabase\/|[a-zA-Z0-9_\-\.\/]+\.(ts|tsx|js|mjs|json|md|sh|rules|css|html)$)/.test(item);
  const isExcluded = item.startsWith('http://') || item.startsWith('https://') || item.startsWith('/api/') || item.includes('${') || item.includes('npm ') || item.includes('npx ') || item.includes('curl ') || item.includes('bash ') || item.includes('git ');
  
  if (isLikelyPath && !isExcluded) {
    citedPaths.add(item);
  }
}

let missing = 0;
console.log(`Auditing ${citedPaths.size} cited path(s) in ${stateFile}...`);

for (const p of citedPaths) {
  const cleanPath = p.replace(/^\//, '');
  if (!fs.existsSync(cleanPath)) {
    console.error(`FAIL: Cited path does not exist: ${p} (checked ${cleanPath})`);
    missing++;
  } else {
    console.log(`OK: ${cleanPath}`);
  }
}

if (missing > 0) {
  console.error(`\nAudit failed: ${missing} cited path(s) missing.`);
  process.exit(1);
} else {
  console.log('\naudit-claims passed successfully.');
}
EOF
