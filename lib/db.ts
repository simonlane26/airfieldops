import { Pool } from 'pg';

// Create a connection pool for PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

export default pool;

// Helper function to execute queries with automatic release
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Helper function for transactions
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Set session variables for RLS (Row Level Security)
// Uses set_config() with parameters instead of string interpolation to prevent SQL injection.
// The third argument `true` scopes the setting to the current transaction (equivalent to SET LOCAL).
export async function setSessionContext(
  client: any,
  airportId: string | null,
  userRole: string
) {
  if (airportId) {
    await client.query(
      `SELECT set_config('app.current_airport_id', $1, true)`,
      [airportId]
    );
  }
  await client.query(
    `SELECT set_config('app.user_role', $1, true)`,
    [userRole]
  );
}
