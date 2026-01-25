require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function verifyDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();

    console.log('Checking database tables...\n');

    // Check tables
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 Tables created:');
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check user count
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log(`\n👥 Users in database: ${userCount.rows[0].count}`);

    // Check super admin
    const superAdmin = await client.query(`
      SELECT email, name, role
      FROM users
      WHERE role = 'super_admin'
    `);

    if (superAdmin.rows.length > 0) {
      console.log('\n🔐 Super Admin Account:');
      superAdmin.rows.forEach(user => {
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Role: ${user.role}`);
      });
    }

    // Check airports
    const airportCount = await client.query('SELECT COUNT(*) FROM airports');
    console.log(`\n✈️  Airports in database: ${airportCount.rows[0].count}`);

    console.log('\n✅ Database verification complete!');

    client.release();
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

verifyDatabase();
