import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { query } from '@/lib/db';
import { hash } from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await query(`
      SELECT
        u.id,
        u.email,
        u.name,
        u.job_role as "jobRole",
        u.role,
        u.airport_id as "airportId",
        u.is_active as "isActive",
        u.created_at as "createdAt",
        u.last_login as "lastLogin",
        u.permissions,
        a.name as "airportName"
      FROM users u
      LEFT JOIN airports a ON u.airport_id = a.id
      ORDER BY u.created_at DESC
    `);

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
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
    const { email, name, jobRole, password, role, airportId, permissions } = body;

    // Validate required fields
    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role-specific requirements
    if (role !== 'super_admin' && !airportId) {
      return NextResponse.json(
        { error: 'Airport is required for non-super-admin users' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUsers = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 10);

    // Create user
    const newUsers = await query(
      `INSERT INTO users (email, password_hash, name, job_role, role, airport_id, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, job_role as "jobRole", role, airport_id as "airportId", permissions`,
      [email, passwordHash, name, jobRole || null, role, role === 'super_admin' ? null : airportId, permissions ? JSON.stringify(permissions) : null]
    );

    return NextResponse.json(newUsers[0], { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
