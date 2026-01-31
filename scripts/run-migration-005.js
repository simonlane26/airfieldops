// Run migration 005 - Add regulatory profile to airports
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    const migrationPath = path.join(__dirname, '../database/migrations/005_regulatory_profile.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration 005: Add regulatory profile...');
    await client.query(sql);
    console.log('Migration 005 completed successfully!');

    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'airports' AND column_name = 'regulatory_profile'
    `);

    if (result.rows.length > 0) {
      console.log('Verified: regulatory_profile column exists');
      console.log('  Type:', result.rows[0].data_type);
      console.log('  Default:', result.rows[0].column_default);
    }

    // Show current airports with their profiles
    const airports = await client.query('SELECT icao_code, name, regulatory_profile FROM airports');
    console.log('\nAirports with regulatory profiles:');
    airports.rows.forEach(a => {
      console.log(`  ${a.icao_code}: ${a.name} - ${a.regulatory_profile}`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
