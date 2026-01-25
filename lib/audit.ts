import { query } from './db';
import { UserPermissions, PERMISSION_LABELS } from './types/auth';

export type AuditEventType = 'info' | 'warning' | 'alert';
export type AuditSignificance = 'routine' | 'operational' | 'safety-significant';

interface AuditLogEntry {
  type: AuditEventType;
  message: string;
  significance: AuditSignificance;
  changedBy?: string;
  changedByRole?: string;
  changedByEmail?: string;
  airportId?: string;
  airportIcao?: string;
}

/**
 * Creates an audit log entry in the notices table
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO notices (airport_id, type, message, significance, changed_by, changed_by_role, changed_by_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.airportId || null,
        entry.type,
        entry.message,
        entry.significance,
        entry.changedBy || null,
        entry.changedByRole || null,
        entry.changedByEmail || null
      ]
    );
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
    // Don't throw - audit logging failure shouldn't block the main operation
  }
}

/**
 * Compares two permission objects and returns the granted and revoked permissions
 */
export function comparePermissions(
  oldPermissions: UserPermissions | null,
  newPermissions: UserPermissions | null,
  userRole: string
): { granted: string[]; revoked: string[] } {
  const granted: string[] = [];
  const revoked: string[] = [];

  // Get default permissions for the role to compare against if no custom permissions
  const defaultPerms = getDefaultPermissionsForRole(userRole);

  const oldPerms = oldPermissions || defaultPerms;
  const newPerms = newPermissions || defaultPerms;

  // Compare each permission
  for (const key of Object.keys(PERMISSION_LABELS) as (keyof UserPermissions)[]) {
    const oldValue = oldPerms[key];
    const newValue = newPerms[key];
    // Use shortLabel for audit log (more concise)
    const label = PERMISSION_LABELS[key].shortLabel;

    if (!oldValue && newValue) {
      granted.push(label);
    } else if (oldValue && !newValue) {
      revoked.push(label);
    }
  }

  return { granted, revoked };
}

/**
 * Get default permissions for a role
 */
function getDefaultPermissionsForRole(role: string): UserPermissions {
  const defaults: Record<string, UserPermissions> = {
    super_admin: {
      manageRunwayStatus: true,
      manageTaxiwayStatus: true,
      manageSnowAreas: true,
      manageLvpFull: true,
      manageLvpLimited: true,
      manageWipSchedule: true,
      manageRcam: true,
      viewNotamDrafts: true,
      viewAuditLog: true,
    },
    admin: {
      manageRunwayStatus: true,
      manageTaxiwayStatus: true,
      manageSnowAreas: true,
      manageLvpFull: true,
      manageLvpLimited: true,
      manageWipSchedule: true,
      manageRcam: true,
      viewNotamDrafts: true,
      viewAuditLog: true,
    },
    viewer: {
      manageRunwayStatus: false,
      manageTaxiwayStatus: false,
      manageSnowAreas: false,
      manageLvpFull: false,
      manageLvpLimited: false,
      manageWipSchedule: false,
      manageRcam: false,
      viewNotamDrafts: false,
      viewAuditLog: false,
    },
  };

  return defaults[role] || defaults.viewer;
}

/**
 * Formats permission changes for audit log message
 */
export function formatPermissionChangesMessage(
  targetUserName: string,
  changedByName: string,
  changedByRole: string,
  granted: string[],
  revoked: string[],
  customToDefault: boolean
): string {
  const parts: string[] = [];

  parts.push(`User operational authority updated`);
  parts.push(`User: ${targetUserName}`);
  parts.push(`Changed by: ${changedByName} (${changedByRole})`);

  if (customToDefault) {
    parts.push(`Action: Reset to role defaults`);
  } else {
    if (granted.length > 0) {
      parts.push(`Granted: ${granted.join(', ')}`);
    }
    if (revoked.length > 0) {
      parts.push(`Revoked: ${revoked.join(', ')}`);
    }
    if (granted.length === 0 && revoked.length === 0) {
      parts.push(`Action: Custom permissions set (no changes from current effective permissions)`);
    }
  }

  return parts.join(' | ');
}
