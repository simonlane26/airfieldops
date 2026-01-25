import { compare } from 'bcryptjs';
import { query } from './db';
import type { User, Airport } from './types/auth';

export async function validateCredentials(
  email: string,
  password: string
): Promise<User | null> {
  try {
    const users = await query<any>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    const isValid = await compare(password, user.password_hash);

    if (!isValid) {
      return null;
    }

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
      mapConfig: airport.map_config,
      isActive: airport.is_active,
      createdAt: airport.created_at,
    };
  } catch (error) {
    console.error('Error getting airport by ID:', error);
    return null;
  }
}
