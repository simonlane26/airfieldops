require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables');
    console.error('Make sure .env.local file exists with DATABASE_URL');
    process.exit(1);
  }

  console.log('Using database:', process.env.DATABASE_URL.split('@')[1]?.split('?')[0] || 'hidden');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('\nDefault super admin user created:');
    console.log('  Email: simon@airfieldops.com');
    console.log('  Password: changeme123');
    console.log('\n⚠️  IMPORTANT: Change this password immediately in production!');

    client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
