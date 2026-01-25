import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { query } from '@/lib/db';

// GET /api/diagrams/current - Get diagram for logged-in user's airport
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const airportId = session.user.airportId;

    if (!airportId) {
      return NextResponse.json({ error: 'No airport assigned to user' }, { status: 400 });
    }

    const diagrams = await query<{
      id: string;
      airport_id: string;
      background_image: string | null;
      image_width: number;
      image_height: number;
      taxiways: object[];
      runways: object[];
      aprons: object[];
      label_offsets: object;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT d.*, a.icao_code, a.name as airport_name
       FROM airport_diagrams d
       JOIN airports a ON a.id = d.airport_id
       WHERE d.airport_id = $1`,
      [airportId]
    );

    if (diagrams.length === 0) {
      // Return empty diagram structure if none exists
      const airport = await query(
        'SELECT id, icao_code, name FROM airports WHERE id = $1',
        [airportId]
      );

      return NextResponse.json({
        airport_id: airportId,
        icao_code: airport[0]?.icao_code,
        airport_name: airport[0]?.name,
        background_image: null,
        image_width: 900,
        image_height: 900,
        taxiways: [],
        runways: [],
        aprons: [],
        label_offsets: {},
      });
    }

    return NextResponse.json(diagrams[0]);
  } catch (error) {
    console.error('Error fetching current diagram:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
