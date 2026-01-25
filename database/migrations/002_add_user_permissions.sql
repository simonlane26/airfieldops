-- Migration: Add granular permissions to users
-- This allows per-user feature access control beyond basic roles

-- Add permissions column as JSONB (stores UserPermissions object)
-- NULL means use role defaults
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN users.permissions IS 'Custom feature permissions (JSONB). NULL = use role defaults. Keys: manageRunwayStatus, manageTaxiwayStatus, manageSnowAreas, manageLvpFull, manageLvpLimited, manageWipSchedule, manageRcam, viewNotamDrafts, viewAuditLog';

-- Create index for querying users with specific permissions
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN (permissions);
