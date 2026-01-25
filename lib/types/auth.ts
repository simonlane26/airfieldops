export type UserRole = 'super_admin' | 'admin' | 'viewer';

// Granular feature permissions for operational access control
export interface UserPermissions {
  // Runway & Taxiway status management
  manageRunwayStatus: boolean;      // Change runway open/closed/WIP
  manageTaxiwayStatus: boolean;     // Change taxiway open/closed/WIP

  // Snow operations
  manageSnowAreas: boolean;         // Toggle snow-affected areas

  // Low Visibility Procedures
  manageLvpFull: boolean;           // Set any LVP condition (AWS through Cat 3)
  manageLvpLimited: boolean;        // Set LVP to AWS or Condition 4 only (RFFS use)

  // WIP Scheduling
  manageWipSchedule: boolean;       // Schedule/edit/delete WIPs

  // RCAM Assessments
  manageRcam: boolean;              // Submit RCAM assessments

  // NOTAM
  viewNotamDrafts: boolean;         // View NOTAM draft assistant

  // Audit & Logs
  viewAuditLog: boolean;            // View full audit log
}

// Default permissions by role (used when user has no custom permissions set)
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, UserPermissions> = {
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

// Human-readable labels for permissions (for UI)
// Short labels for compact display, full descriptions explain what they're authorised to do
export const PERMISSION_LABELS: Record<keyof UserPermissions, { label: string; description: string; shortLabel: string }> = {
  manageRunwayStatus: {
    label: 'Authorised to change Runway Status',
    shortLabel: 'Runway Status',
    description: 'Change runway open/closed/WIP status'
  },
  manageTaxiwayStatus: {
    label: 'Authorised to change Taxiway Status',
    shortLabel: 'Taxiway Status',
    description: 'Change taxiway open/closed/WIP status'
  },
  manageSnowAreas: {
    label: 'Authorised for Snow Operations',
    shortLabel: 'Snow Operations',
    description: 'Toggle snow-affected areas for clearing'
  },
  manageLvpFull: {
    label: 'Authorised for LVP (Full)',
    shortLabel: 'LVP (Full)',
    description: 'Set any LVP condition (AWS through Cat 3)'
  },
  manageLvpLimited: {
    label: 'Authorised for LVP (Limited)',
    shortLabel: 'LVP (Limited)',
    description: 'Set LVP to AWS or Condition 4 only'
  },
  manageWipSchedule: {
    label: 'Authorised for WIP Scheduling',
    shortLabel: 'WIP Schedule',
    description: 'Schedule, edit, and delete WIP entries'
  },
  manageRcam: {
    label: 'Authorised for RCAM Assessments',
    shortLabel: 'RCAM Assessments',
    description: 'Submit runway condition assessments'
  },
  viewNotamDrafts: {
    label: 'Authorised to view NOTAM Drafts',
    shortLabel: 'NOTAM Drafts',
    description: 'View NOTAM draft assistant'
  },
  viewAuditLog: {
    label: 'Authorised to view Audit Log',
    shortLabel: 'Audit Log',
    description: 'View full operational audit log'
  },
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  airportId: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  permissions?: UserPermissions | null;  // Custom permissions (null = use role defaults)
}

export interface Airport {
  id: string;
  name: string;
  icaoCode: string;
  iataCode: string | null;
  country: string | null;
  timezone: string;
  mapConfig: any;
  isActive: boolean;
  createdAt: string;
}

export interface Session {
  user: User;
  airport: Airport | null;
}

// Role hierarchy and permissions
export const ROLE_PERMISSIONS = {
  super_admin: {
    canManageUsers: true,
    canManageAirports: true,
    canAccessAllAirports: true,
    canModifyData: true,
    canViewData: true,
  },
  admin: {
    canManageUsers: true, // Only for their airport
    canManageAirports: false,
    canAccessAllAirports: false,
    canModifyData: true,
    canViewData: true,
  },
  viewer: {
    canManageUsers: false,
    canManageAirports: false,
    canAccessAllAirports: false,
    canModifyData: false,
    canViewData: true,
  },
} as const;

export function hasPermission(role: UserRole, permission: keyof typeof ROLE_PERMISSIONS.super_admin): boolean {
  return ROLE_PERMISSIONS[role][permission] === true;
}

// Get effective permissions for a user (custom permissions or role defaults)
export function getEffectivePermissions(user: User): UserPermissions {
  if (user.permissions) {
    return user.permissions;
  }
  return DEFAULT_PERMISSIONS_BY_ROLE[user.role];
}

// Check if user has a specific feature permission
export function hasFeaturePermission(user: User, permission: keyof UserPermissions): boolean {
  const effectivePermissions = getEffectivePermissions(user);
  return effectivePermissions[permission] === true;
}

// Check if user can manage LVP (either full or limited)
export function canManageLvp(user: User): boolean {
  const perms = getEffectivePermissions(user);
  return perms.manageLvpFull || perms.manageLvpLimited;
}

// Get allowed LVP conditions for a user
export function getAllowedLvpConditions(user: User): string[] {
  const perms = getEffectivePermissions(user);
  if (perms.manageLvpFull) {
    return ['none', 'AWS', '1A', '1B', '2A', '2B', '2C', '3'];
  }
  if (perms.manageLvpLimited) {
    return ['none', 'AWS', '2C']; // AWS and Condition 4 (2C is closest to "Condition 4")
  }
  return [];
}

export function canAccessAirport(user: User, airportId: string): boolean {
  if (user.role === 'super_admin') return true;
  return user.airportId === airportId;
}
