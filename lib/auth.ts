import { compare } from 'bcryptjs';
import { query } from './db';
import type { User, Airport } from './types/auth';

// Per-account failed-login throttle (AO-02). In-process only: correct for a
// single instance; back this with a shared store / DB column for multi-instance.
const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const loginFailures = new Map<string, { count: number; firstAt: number }>();

// A well-formed bcrypt hash that no password matches. Compared against when the
// account is unknown or locked so response timing does not reveal which emails
// exist (removes the enumeration oracle that makes brute force cheaper).
const DUMMY_HASH = '$2a$12$0000000000000000000000000000000000000000000000000000a';

function isLockedOut(key: string): boolean {
  const rec = loginFailures.get(key);
  if (!rec) return false;
  if (Date.now() - rec.firstAt > FAILURE_WINDOW_MS) {
    loginFailures.delete(key);
    return false;
  }
  return rec.count >= MAX_FAILURES;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const rec = loginFailures.get(key);
  if (!rec || now - rec.firstAt > FAILURE_WINDOW_MS) {
    loginFailures.set(key, { count: 1, firstAt: now });
  } else {
    rec.count += 1;
  }
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<User | null> {
  try {
    const key = email.trim().toLowerCase();

    if (isLockedOut(key)) {
      await compare(password, DUMMY_HASH); // keep timing consistent
      return null;
    }

    const users = await query<any>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (users.length === 0) {
      await compare(password, DUMMY_HASH); // constant-time for unknown accounts
      recordFailure(key);
      return null;
    }

    const user = users[0];
    const isValid = await compare(password, user.password_hash);

    if (!isValid) {
      recordFailure(key);
      return null;
    }

    loginFailures.delete(key); // successful auth clears the counter

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      airportId: user.airport_id,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      permissions: user.permissions || null,
    };
  } catch (error) {
    console.error('Error validating credentials:', error);
    return null;
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const users = await query<any>(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      airportId: user.airport_id,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      permissions: user.permissions || null,
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

export async function getAirportById(airportId: string): Promise<Airport | null> {
  try {
    const airports = await query<any>(
      'SELECT * FROM airports WHERE id = $1 AND is_active = true',
      [airportId]
    );

    if (airports.length === 0) {
      return null;
    }

    const airport = airports[0];
    return {
      id: airport.id,
      name: airport.name,
      icaoCode: airport.icao_code,
      iataCode: airport.iata_code,
      country: airport.country,
      timezone: airport.timezone,
      regulatoryProfile: airport.regulatory_profile || 'ICAO',
      mapConfig: airport.map_config,
      isActive: airport.is_active,
      createdAt: airport.created_at,
    };
  } catch (error) {
    console.error('Error getting airport by ID:', error);
    return null;
  }
}
