require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  console.log('Using database:', process.env.DATABASE_URL.split('@')[1]);

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Reading migration file 004_airport_diagrams.sql...');
    const migrationPath = path.join(__dirname, '../database/migrations/004_airport_diagrams.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await client.query(migrationSQL);

    console.log('Migration 004 completed successfully!');
    console.log('Created airport_diagrams table');

    client.release();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
