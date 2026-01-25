-- Migration 003: Extend notices table for comprehensive audit logging
-- This adds columns needed for tracking who made changes and their context

-- Add significance classification
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notice_significance') THEN
        CREATE TYPE notice_significance AS ENUM ('routine', 'operational', 'safety-significant');
    END IF;
END$$;

-- Add new columns to notices table
ALTER TABLE notices
  ADD COLUMN IF NOT EXISTS significance notice_significance DEFAULT 'operational',
  ADD COLUMN IF NOT EXISTS changed_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS changed_by_role VARCHAR(255),
  ADD COLUMN IF NOT EXISTS changed_by_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS airport_icao VARCHAR(4);

-- Make airport_id nullable for system-wide audit events (like permission changes)
ALTER TABLE notices ALTER COLUMN airport_id DROP NOT NULL;

-- Add index for significance filtering
CREATE INDEX IF NOT EXISTS idx_notices_significance ON notices(significance);

-- Add index for searching by user
CREATE INDEX IF NOT EXISTS idx_notices_changed_by ON notices(changed_by);

COMMENT ON COLUMN notices.significance IS 'Safety significance: routine, operational, or safety-significant';
COMMENT ON COLUMN notices.changed_by IS 'Name of user who made the change';
COMMENT ON COLUMN notices.changed_by_role IS 'Role/job title of user who made the change';
COMMENT ON COLUMN notices.changed_by_email IS 'Email of user who made the change (for audit trail)';
COMMENT ON COLUMN notices.reason IS 'Optional reason/justification for the change';
COMMENT ON COLUMN notices.airport_icao IS 'ICAO code of the airport (denormalized for display)';
