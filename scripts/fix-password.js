require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function fixPassword() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    // Generate new password hash
    const password = 'changeme123';
    const passwordHash = await bcrypt.hash(password, 10);

    console.log('Generated password hash:', passwordHash);

    // Update the super admin user
    const result = await client.query(
      `UPDATE users SET password_hash = $1 WHERE email = 'simon@airfieldops.com'`,
      [passwordHash]
    );

    console.log(`✅ Password updated for simon@airfieldops.com`);
    console.log(`   Rows affected: ${result.rowCount}`);

    // Verify the user exists
    const user = await client.query(
      `SELECT email, name, role FROM users WHERE email = 'simon@airfieldops.com'`
    );

    if (user.rows.length > 0) {
      console.log('\n✅ User verified:');
      console.log(`   Email: ${user.rows[0].email}`);
      console.log(`   Name: ${user.rows[0].name}`);
      console.log(`   Role: ${user.rows[0].role}`);
      console.log('\nYou can now login with:');
      console.log(`   Email: simon@airfieldops.com`);
      console.log(`   Password: changeme123`);
    }

    client.release();
  } catch (error) {
    console.error('❌ Failed to fix password:', error.message);
  } finally {
    await pool.end();
  }
}

fixPassword();
