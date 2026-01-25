import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { query } from '@/lib/db';
import { createAuditLog, comparePermissions, formatPermissionChangesMessage } from '@/lib/audit';
import { UserPermissions } from '@/lib/types/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;
    const body = await req.json();
    const { permissions, role, airportId } = body;

    // Get the current user data BEFORE the update (for audit logging)
    const currentUserData = await query<{
      name: string;
      role: string;
      permissions: UserPermissions | null;
      airport_id: string | null;
    }>(
      'SELECT name, role, permissions, airport_id FROM users WHERE id = $1',
      [userId]
    );

    if (currentUserData.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = currentUserData[0];

    // Build dynamic update query based on what fields are provided
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (permissions !== undefined) {
      updates.push(`permissions = $${paramCount}`);
      values.push(permissions ? JSON.stringify(permissions) : null);
      paramCount++;
    }

    if (role !== undefined) {
      updates.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }

    if (airportId !== undefined) {
      updates.push(`airport_id = $${paramCount}`);
      values.push(airportId);
      paramCount++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, email, name, job_role as "jobRole", role, airport_id as "airportId", permissions`,
      values
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log permission changes to audit trail
    if (permissions !== undefined) {
      const oldPermissions = targetUser.permissions;
      const newPermissions = permissions as UserPermissions | null;
      const userRole = role || targetUser.role;

      const customToDefault = oldPermissions !== null && newPermissions === null;
      const { granted, revoked } = comparePermissions(oldPermissions, newPermissions, userRole);

      // Only log if there were actual changes
      if (granted.length > 0 || revoked.length > 0 || customToDefault || (oldPermissions === null && newPermissions !== null)) {
        const message = formatPermissionChangesMessage(
          targetUser.name,
          session.user.name || 'Unknown',
          'Super Admin',
          granted,
          revoked,
          customToDefault
        );

        await createAuditLog({
          type: 'info',
          message,
          significance: 'operational',
          changedBy: session.user.name || undefined,
          changedByRole: 'Super Admin',
          changedByEmail: session.user.email || undefined,
          airportId: targetUser.airport_id || undefined,
        });
      }
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;

    // Prevent deleting yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await query('DELETE FROM users WHERE id = $1', [userId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
