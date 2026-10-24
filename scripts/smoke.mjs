/**
 * scripts/smoke.mjs
 * Smoke test suite for NEXORA API and security endpoints
 */

import http from 'http';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log(`[SMOKE TEST] Running smoke tests against ${BASE_URL}...`);

async function testEndpoint(name, path, options = {}) {
  try {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, ok: res.ok, data, contentType };
  } catch (err) {
    return { error: err.message };
  }
}

async function run() {
  let passed = 0;
  let failed = 0;

  // Test 1: Health endpoint returns 200 and sanitized JSON
  console.log('Test 1: GET /api/health');
  const healthRes = await testEndpoint('Health', '/api/health');
  if (healthRes.status === 200 && healthRes.data?.status === 'ok') {
    // Verify no unmasked founder email or raw secrets leaked
    const jsonStr = JSON.stringify(healthRes.data);
    if (jsonStr.includes('miteshpipaliya2202@gmail.com') || jsonStr.includes('8200243606')) {
      console.error('  FAIL: /api/health leaked private founder contact details!');
      failed++;
    } else {
      console.log('  PASS: /api/health returned 200 OK and is properly sanitized.');
      passed++;
    }
  } else {
    console.error('  FAIL: /api/health did not return 200 OK:', healthRes);
    failed++;
  }

  // Test 2: Unauthenticated registration creation returns 401
  console.log('Test 2: POST /api/registrations/create without token');
  const regRes = await testEndpoint('Create Registration', '/api/registrations/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_slug: 'zerocode', full_name: 'Test' })
  });
  if (regRes.status === 401) {
    console.log('  PASS: POST /api/registrations/create rejected unauthenticated request with 401.');
    passed++;
  } else {
    console.error(`  FAIL: Expected 401 Unauthorized, got status ${regRes.status}:`, regRes.data);
    failed++;
  }

  // Test 3: OTP endpoint rejects invalid emails
  console.log('Test 3: POST /api/auth/send-email-otp with invalid payload');
  const otpRes = await testEndpoint('Send OTP Invalid', '/api/auth/send-email-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'notanemail' })
  });
  if (otpRes.status === 400) {
    console.log('  PASS: POST /api/auth/send-email-otp validated input schema and returned 400.');
    passed++;
  } else {
    console.error(`  FAIL: Expected 400 Bad Request, got status ${otpRes.status}:`, otpRes.data);
    failed++;
  }

  // Test 4: Admin status does not leak credentials to unauthenticated requests
  console.log('Test 4: GET /api/admin/status unauthenticated protection');
  const adminRes = await testEndpoint('Admin Status', '/api/admin/status');
  const adminStr = JSON.stringify(adminRes.data || {});
  if (!adminStr.includes('miteshpipaliya2202@gmail.com') && !adminStr.includes('+91 8200243606')) {
    console.log('  PASS: /api/admin/status does not leak sensitive founder email/phone to the public.');
    passed++;
  } else {
    console.error('  FAIL: /api/admin/status leaked credentials in public response:', adminStr);
    failed++;
  }

  console.log(`\n[SMOKE RESULTS] Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
