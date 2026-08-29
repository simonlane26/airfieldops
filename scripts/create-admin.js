/**
 * Create (or reset) a super-admin account with a caller-supplied password.
 * Replaces the old seeded `changeme123` account (AO-01).
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" \
 *   ADMIN_PASSWORD='<unique high-entropy value>' node scripts/create-admin.js
 *
 * Refuses weak or known-breached passwords. Hashes with bcrypt cost 12.
 * If the email already exists, its password / role are updated (with --force).
 */
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const name = (process.env.ADMIN_NAME || '').trim();
const password = process.env.ADMIN_PASSWORD || '';
const force = process.argv.includes('--force');

const BANNED = new Set([
  'changeme123', 'password', 'password123', 'admin123', 'letmein',
  'airfield123', 'changeme', 'change-this-in-production',
]);

function fail(msg) {
  console.error('✖ ' + msg);
  process.exit(1);
}

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('ADMIN_EMAIL missing or invalid.');
if (!name) fail('ADMIN_NAME is required.');
if (password.length < 12) fail('ADMIN_PASSWORD must be at least 12 characters.');
if (BANNED.has(password.toLowerCase())) fail('ADMIN_PASSWORD is a known weak value.');
if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
  fail('ADMIN_PASSWORD needs upper, lower and digit characters.');
}
if (!process.env.DATABASE_URL) fail('DATABASE_URL not set (expected in .env.local).');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT || undefined },
});

(async () => {
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash(password, 12);
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      if (!force) fail(`User ${email} already exists. Re-run with --force to reset it.`);
      await client.query(
        `UPDATE users
           SET password_hash = $1, name = $2, role = 'super_admin',
               is_active = true, updated_at = NOW()
         WHERE email = $3`,
        [hash, name, email]
      );
      console.log(`✔ Reset existing account ${email} to super_admin.`);
    } else {
      await client.query(
        `INSERT INTO users (email, password_hash, name, role, airport_id, is_active)
         VALUES ($1, $2, $3, 'super_admin', NULL, true)`,
        [email, hash, name]
      );
      console.log(`✔ Created super-admin ${email}.`);
    }
  } catch (err) {
    console.error('✖ Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
