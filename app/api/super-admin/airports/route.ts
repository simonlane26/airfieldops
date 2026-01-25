import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const airports = await query(`
      SELECT
        id,
        name,
        icao_code as "icaoCode",
        iata_code as "iataCode",
        country,
        timezone,
        is_active as "isActive",
        created_at as "createdAt"
      FROM airports
      ORDER BY name ASC
    `);

    return NextResponse.json(airports);
  } catch (error) {
    console.error('Error fetching airports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, icaoCode, iataCode, country, timezone } = body;

    // Validate required fields
    if (!name || !icaoCode) {
      return NextResponse.json(
        { error: 'Name and ICAO code are required' },
        { status: 400 }
      );
    }

    // Check if ICAO code already exists
    const existingAirports = await query(
      'SELECT id FROM airports WHERE icao_code = $1',
      [icaoCode]
    );

    if (existingAirports.length > 0) {
      return NextResponse.json(
        { error: 'ICAO code already exists' },
        { status: 400 }
      );
    }

    // Create airport
    const newAirports = await query(
      `INSERT INTO airports (name, icao_code, iata_code, country, timezone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, icao_code as "icaoCode", iata_code as "iataCode"`,
      [name, icaoCode, iataCode || null, country || null, timezone || 'UTC']
    );

    return NextResponse.json(newAirports[0], { status: 201 });
  } catch (error) {
    console.error('Error creating airport:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
