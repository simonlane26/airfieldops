import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { tenantQuery } from '@/lib/db';

const TYPES = new Set(['info', 'warning', 'alert']);
const SIGNIFICANCE = new Set(['routine', 'operational', 'safety-significant']);

// GET /api/notices — recent operational audit entries for the caller's airport.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const airportId = session.user.airportId;
    if (!airportId) return NextResponse.json({ notices: [] });

    const rows = await tenantQuery(
      { airportId, userRole: session.user.role },
      `SELECT id, type, message, significance, reason,
              changed_by, changed_by_role, changed_by_email, airport_icao,
              created_at
       FROM notices
       WHERE airport_id = $1
       ORDER BY created_at DESC
       LIMIT 500`,
      [airportId]
    );

    return NextResponse.json({
      notices: rows.map((r: Record<string, unknown>) => ({
        id: r.id,
        type: r.type,
        message: r.message,
        significance: r.significance,
        reason: r.reason ?? undefined,
        changedBy: r.changed_by ?? undefined,
        changedByRole: r.changed_by_role ?? undefined,
        changedByEmail: r.changed_by_email ?? undefined,
        airportIcao: r.airport_icao ?? undefined,
        timestamp: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Error listing notices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/notices — append one operational audit entry. Append-only:
// the notices table has no UPDATE/DELETE path (see migration 007).
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const airportId = session.user.airportId;
    if (!airportId) {
      return NextResponse.json({ error: 'No airport assigned to user' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }
    if (body.message.length > 2000) {
      return NextResponse.json({ error: 'message too long' }, { status: 400 });
    }

    const type = TYPES.has(body.type) ? body.type : 'info';
    const significance = SIGNIFICANCE.has(body.significance) ? body.significance : 'operational';
    const reason =
      typeof body.reason === 'string' && body.reason.length <= 2000 ? body.reason : null;

    const rows = await tenantQuery(
      { airportId, userRole: session.user.role },
      `INSERT INTO notices
         (airport_id, type, message, significance, reason,
          changed_by, changed_by_role, changed_by_email, airport_icao, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, created_at`,
      [
        airportId,
        type,
        body.message,
        significance,
        reason,
        session.user.name ?? null,
        (session.user as { jobRole?: string }).jobRole ?? null,
        session.user.email ?? null,
        session.user.airport?.icaoCode ?? null,
        session.user.id ?? null,
      ]
    );

    return NextResponse.json({ id: rows[0]?.id, timestamp: rows[0]?.created_at }, { status: 201 });
  } catch (error) {
    console.error('Error creating notice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
