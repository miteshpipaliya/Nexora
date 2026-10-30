#!/usr/bin/env node
/**
 * Smoke script executing Section 6 HTTP probes and checks.
 * Usage: node scripts/smoke.mjs [BASE_URL]
 */

import { execSync } from 'child_process';

const BASE_URL = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';

console.log(`Running smoke probes against ${BASE_URL}...`);

async function runProbes() {
  let failed = 0;

  // Probe 1: /api/health returns only { status: 'ok' }
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    const keys = Object.keys(data);
    if (res.status === 200 && keys.length === 1 && data.status === 'ok') {
      console.log('✓ Probe 1 PASSED: /api/health returns only { status: "ok" }');
    } else {
      console.error(`✗ Probe 1 FAILED: Expected only { status: "ok" }, got:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`✗ Probe 1 FAILED with error:`, err.message);
    failed++;
  }

  // Probe 2: /api/admin/status contains no email or phone
  try {
    const res = await fetch(`${BASE_URL}/api/admin/status`);
    const raw = await res.text();
    if (raw.includes('@') || raw.includes('+91') || raw.includes('email') || raw.includes('phone')) {
      console.error(`✗ Probe 2 FAILED: /api/admin/status contains email or phone info:`, raw);
      failed++;
    } else {
      console.log('✓ Probe 2 PASSED: /api/admin/status contains no email or phone leaks');
    }
  } catch (err) {
    console.error(`✗ Probe 2 FAILED with error:`, err.message);
    failed++;
  }

  // Probe 3: /api/admin/stats without a session returns 401
  try {
    const res = await fetch(`${BASE_URL}/api/admin/stats`);
    if (res.status === 401) {
      console.log('✓ Probe 3 PASSED: /api/admin/stats without session returned 401');
    } else {
      console.error(`✗ Probe 3 FAILED: Expected 401, got ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error(`✗ Probe 3 FAILED with error:`, err.message);
    failed++;
  }

  // Probe 4: POST /api/registrations/create with no token returns 401
  try {
    const res = await fetch(`${BASE_URL}/api/registrations/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_slug: 'hackathon' })
    });
    if (res.status === 401) {
      console.log('✓ Probe 4 PASSED: POST /api/registrations/create with no token returned 401');
    } else {
      console.error(`✗ Probe 4 FAILED: Expected 401, got ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error(`✗ Probe 4 FAILED with error:`, err.message);
    failed++;
  }

  // Probe 5: A forged x-matched-path header does not reroute the request
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      headers: { 'x-matched-path': '/api/admin/status' }
    });
    const data = await res.json();
    if (data.status === 'ok') {
      console.log('✓ Probe 5 PASSED: x-matched-path header ignored, routed to /api/health');
    } else {
      console.error(`✗ Probe 5 FAILED: x-matched-path rerouted request:`, data);
      failed++;
    }
  } catch (err) {
    console.error(`✗ Probe 5 FAILED with error:`, err.message);
    failed++;
  }

  // Probe 6: A 500 test response never contains err.message text
  try {
    const res = await fetch(`${BASE_URL}/api/test-500`);
    const raw = await res.text();
    if (raw.includes('Error:') || raw.includes('stack') || raw.includes('secret_internal_crash_details')) {
      console.error(`✗ Probe 6 FAILED: 500 test leaked internal error message:`, raw);
      failed++;
    } else {
      console.log('✓ Probe 6 PASSED: 500 test response contains no err.message text');
    }
  } catch (err) {
    console.error(`✗ Probe 6 FAILED with error:`, err.message);
    failed++;
  }

  // Probe 7: A request body over 100 kb is rejected (413 Payload Too Large)
  try {
    const largePayload = JSON.stringify({ dummy: 'a'.repeat(105 * 1024) });
    const res = await fetch(`${BASE_URL}/api/registrations/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: largePayload
    });
    if (res.status === 413) {
      console.log('✓ Probe 7 PASSED: Payload over 100 kb returned 413 Payload Too Large');
    } else {
      console.error(`✗ Probe 7 FAILED: Expected 413 for >100kb payload, got ${res.status}`);
      failed++;
    }
  } catch (err) {
    console.error(`✗ Probe 7 FAILED with error:`, err.message);
    failed++;
  }

  // Probe 8: grep of src and api finds no ADMIN_EMAILS, ADMIN_PHONE or the hardcoded fallback secret
  try {
    const grep1 = execSync('git grep -E "ADMIN_EMAILS|ADMIN_PHONE" src/ api/ || true', { encoding: 'utf-8' }).trim();
    const grep2 = execSync('git grep "nexora_dev_super_secret_otp_hmac_key_2026_xyz" src/ api/ server.ts || true', { encoding: 'utf-8' }).trim();
    if (grep1 || grep2) {
      console.error(`✗ Probe 8 FAILED: Found prohibited strings:\n${grep1}\n${grep2}`);
      failed++;
    } else {
      console.log('✓ Probe 8 PASSED: No ADMIN_EMAILS, ADMIN_PHONE, or hardcoded fallback secrets in code');
    }
  } catch (err) {
    console.error(`✗ Probe 8 FAILED in grep check:`, err.message);
    failed++;
  }

  if (failed > 0) {
    console.error(`\nSmoke test failed: ${failed} probe(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\nAll smoke probes passed successfully!`);
    process.exit(0);
  }
}

runProbes();
