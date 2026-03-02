#!/usr/bin/env node
/**
 * Generates the APPLE_SECRET JWT for Sign In with Apple.
 *
 * Usage:
 *   node scripts/gen-apple-secret.js <path-to-p8> [path-to-env]
 *
 * Examples:
 *   # Print to stdout only
 *   node scripts/gen-apple-secret.js ~/AuthKey_Z7H38KB95Z.p8
 *
 *   # Print and update .env.local automatically
 *   node scripts/gen-apple-secret.js ~/AuthKey_Z7H38KB95Z.p8 .env.local
 *
 * The secret expires in 180 days. Schedule this script via cron to run
 * before expiry and restart the app automatically.
 */

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const TEAM_ID   = 'R5LULCKZT8';
const KEY_ID    = 'Z7H38KB95Z';
const CLIENT_ID = 'com.kevingaasch.trainer.web'; // APPLE_ID env var
// ─────────────────────────────────────────────────────────────────────────────

const p8Path = process.argv[2];
const envPath = process.argv[3] ? path.resolve(process.argv[3]) : null;

if (!p8Path) {
  console.error('Usage: node scripts/gen-apple-secret.js <path-to-p8> [path-to-env]');
  process.exit(1);
}

const resolved = path.resolve(p8Path);
if (!fs.existsSync(resolved)) {
  console.error(`File not found: ${resolved}`);
  process.exit(1);
}

const privateKey = fs.readFileSync(resolved, 'utf8');
const now        = Math.floor(Date.now() / 1000);
const exp        = now + 15552000; // 180 days
const expiresOn  = new Date(exp * 1000).toISOString().slice(0, 10);

const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss: TEAM_ID,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: CLIENT_ID,
})).toString('base64url');

const data = `${header}.${payload}`;
const sign = crypto.createSign('SHA256');
sign.update(data);
const sig = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
const jwt = `${data}.${sig}`;

console.log('\n── Apple Sign In with Apple Secret ──────────────────────────────────────\n');
console.log(`APPLE_ID="${CLIENT_ID}"`);
console.log(`APPLE_SECRET="${jwt}"`);
console.log(`\n⚠  Expires: ${expiresOn}`);

if (envPath) {
  if (!fs.existsSync(envPath)) {
    console.error(`\nEnv file not found: ${envPath}`);
    process.exit(1);
  }

  let env = fs.readFileSync(envPath, 'utf8');

  // Update APPLE_ID
  if (/^APPLE_ID=/m.test(env)) {
    env = env.replace(/^APPLE_ID=.*/m, `APPLE_ID="${CLIENT_ID}"`);
  } else {
    env += `\nAPPLE_ID="${CLIENT_ID}"`;
  }

  // Update APPLE_SECRET
  if (/^APPLE_SECRET=/m.test(env)) {
    env = env.replace(/^APPLE_SECRET=.*/m, `APPLE_SECRET="${jwt}"`);
  } else {
    env += `\nAPPLE_SECRET="${jwt}"`;
  }

  fs.writeFileSync(envPath, env, 'utf8');
  console.log(`\n✓ Updated ${envPath}`);
  console.log('  Restart the app for the new secret to take effect.\n');
} else {
  console.log('  Pass a second argument (path to .env.local) to update it automatically.\n');
}
