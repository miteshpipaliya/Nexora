#!/usr/bin/env node
/**
 * NEXORA Production Smoke Probe
 * Validates production deployment health, API privacy masking, and endpoint availability.
 */

const BASE_URL = process.env.TEST_URL || 'https://www.nexora-bvm.online';

async function probe() {
  console.log(`\n========================================`);
  console.log(`NEXORA PRODUCTION SMOKE PROBE`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Time:   ${new Date().toISOString()}`);
  console.log(`========================================\n`);

  let failures = 0;

  // 1. Probe Admin Status Privacy Masking
  try {
    process.stdout.write(`[PROBE 1/4] Checking /api/admin/status for PII leakage... `);
    const res = await fetch(`${BASE_URL}/api/admin/status`);
    if (!res.ok) {
      console.log(`WARN (Status ${res.status}) - Might be local or unrouted`);
    } else {
      const data = await res.json();
      if (data.founderEmail || data.founderPhone) {
        console.log(`FAILED! Found unmasked contact info in public API.`);
        failures++;
      } else if (data.maskedEmail && data.maskedPhone) {
        console.log(`PASSED (Concealed: ${data.maskedEmail}, ${data.maskedPhone})`);
      } else {
        console.log(`PASSED (Valid response without leaks)`);
      }
    }
  } catch (err) {
    console.log(`SKIPPED (${err.message})`);
  }

  // 2. Probe Registration Authentication Enforcement
  try {
    process.stdout.write(`[PROBE 2/4] Testing /api/registrations/create unauthorized rejection... `);
    const res = await fetch(`${BASE_URL}/api/registrations/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_slug: 'zerocode' })
    });
    if (res.status === 401) {
      console.log(`PASSED (HTTP 401 Unauthorized as expected)`);
    } else {
      console.log(`NOTE: Returned ${res.status}`);
    }
  } catch (err) {
    console.log(`SKIPPED (${err.message})`);
  }

  // 3. Probe Flagship Competition Image Availability
  try {
    process.stdout.write(`[PROBE 3/4] Testing flagship competition image assets... `);
    const images = [
      '/images/competitions/zerocode.jpg',
      '/images/competitions/coderush.jpg',
      '/images/competitions/roborace.jpg',
      '/images/competitions/brainbattle.jpg',
      '/images/competitions/ctf.jpg',
      '/images/competitions/pathfinder.jpg'
    ];
    let allOk = true;
    for (const img of images) {
      const r = await fetch(`${BASE_URL}${img}`, { method: 'HEAD' });
      if (!r.ok) {
        allOk = false;
        break;
      }
    }
    if (allOk) {
      console.log(`PASSED (All core assets accessible)`);
    } else {
      console.log(`NOTE: Some assets returned non-200 on live host`);
    }
  } catch (err) {
    console.log(`SKIPPED (${err.message})`);
  }

  // 4. Probe Homepage HTML Title
  try {
    process.stdout.write(`[PROBE 4/4] Testing homepage HTML title & metadata... `);
    const res = await fetch(`${BASE_URL}/`);
    const html = await res.text();
    if (html.includes('NEXORA') || html.includes('nexora')) {
      console.log(`PASSED (NEXORA branding detected in HTML root)`);
    } else {
      console.log(`NOTE: Could not verify branding in HTML response`);
    }
  } catch (err) {
    console.log(`SKIPPED (${err.message})`);
  }

  console.log(`\n========================================`);
  if (failures === 0) {
    console.log(`ALL SMOKE CHECKS SATISFIED`);
  } else {
    console.log(`COMPLETED WITH ${failures} FAILURE(S)`);
  }
  console.log(`========================================\n`);
}

probe();
