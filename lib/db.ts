import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

// Use a *verified* TLS connection whenever we talk to a managed/remote database.
// Triggers on production, or any connection string that asks for SSL (Neon uses
// `sslmode=require`). `rejectUnauthorized: true` makes the driver validate the
// server certificate against the system trust store (Neon chains to a public CA);
// set DATABASE_CA_CERT if your provider needs a custom root. A genuine local
// Postgres without TLS still works because neither condition matches.
const requireSsl =
  process.env.NODE_ENV === 'production' ||
  /[?&]sslmode=(require|verify-ca|verify-full)/.test(connectionString ?? '');

const pool = new Pool({
  connectionString,
  ssl: requireSsl
    ? {
        rejectUnauthorized: true,
        ca: process.env.DATABASE_CA_CERT || undefined,
      }
    : false,
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

/**
 * Run one or more queries inside a transaction that has the RLS session context
 * (`app.current_airport_id`, `app.user_role`) applied first. Use this for every
 * read/write of a tenant-scoped table so Row-Level Security is actually enforced
 * instead of relying only on hand-written `WHERE airport_id = $1` clauses.
 */
export async function withTenantContext<T>(
  ctx: { airportId: string | null; userRole: string },
  callback: (client: any) => Promise<T>
): Promise<T> {
  return transaction(async (client) => {
    await setSessionContext(client, ctx.airportId, ctx.userRole);
    return callback(client);
  });
}

/** Convenience wrapper: a single tenant-scoped query with RLS context set. */
export async function tenantQuery<T = any>(
  ctx: { airportId: string | null; userRole: string },
  text: string,
  params?: any[]
): Promise<T[]> {
  return withTenantContext(ctx, async (client) => {
    const result = await client.query(text, params);
    return result.rows as T[];
  });
}
