import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { query } from '@/lib/db';

// GET /api/diagrams/[airportId] - Get diagram for an airport
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ airportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { airportId } = await params;

    // Super admins can view any airport, others only their assigned airport
    if (session.user.role !== 'super_admin' && session.user.airportId !== airportId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      `SELECT * FROM airport_diagrams WHERE airport_id = $1`,
      [airportId]
    );

    if (diagrams.length === 0) {
      // Return empty diagram structure if none exists
      return NextResponse.json({
        airport_id: airportId,
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
    console.error('Error fetching diagram:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/diagrams/[airportId] - Create or update diagram for an airport
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ airportId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can edit diagrams
    if (session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - Super admin required' }, { status: 403 });
    }

    const { airportId } = await params;
    const body = await req.json();
    const {
      background_image,
      image_width,
      image_height,
      taxiways,
      runways,
      aprons,
      label_offsets,
    } = body;

    // Verify airport exists
    const airports = await query('SELECT id FROM airports WHERE id = $1', [airportId]);
    if (airports.length === 0) {
      return NextResponse.json({ error: 'Airport not found' }, { status: 404 });
    }

    // Upsert diagram
    const result = await query(
      `INSERT INTO airport_diagrams (
        airport_id, background_image, image_width, image_height,
        taxiways, runways, aprons, label_offsets, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      ON CONFLICT (airport_id) DO UPDATE SET
        background_image = EXCLUDED.background_image,
        image_width = EXCLUDED.image_width,
        image_height = EXCLUDED.image_height,
        taxiways = EXCLUDED.taxiways,
        runways = EXCLUDED.runways,
        aprons = EXCLUDED.aprons,
        label_offsets = EXCLUDED.label_offsets,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *`,
      [
        airportId,
        background_image || null,
        image_width || 900,
        image_height || 900,
        JSON.stringify(taxiways || []),
        JSON.stringify(runways || []),
        JSON.stringify(aprons || []),
        JSON.stringify(label_offsets || {}),
        session.user.id,
      ]
    );

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error saving diagram:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
