-- Migration 005: Add regulatory profile to airports
-- This controls terminology, NOTAM phrasing, fire category naming, guidance text, and audit references

-- Add regulatory_profile column to airports table
ALTER TABLE airports
ADD COLUMN IF NOT EXISTS regulatory_profile VARCHAR(20) DEFAULT 'ICAO'
CHECK (regulatory_profile IN ('UK_EASA', 'USA_FAA', 'ICAO'));

-- Update existing airports to have a default profile
UPDATE airports SET regulatory_profile = 'UK_EASA' WHERE regulatory_profile IS NULL AND country = 'United Kingdom';
UPDATE airports SET regulatory_profile = 'USA_FAA' WHERE regulatory_profile IS NULL AND country = 'United States';
UPDATE airports SET regulatory_profile = 'ICAO' WHERE regulatory_profile IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN airports.regulatory_profile IS 'Regulatory framework: UK_EASA, USA_FAA, or ICAO. Controls terminology, NOTAM phrasing, and compliance references.';
