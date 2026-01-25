-- Migration 004: Airport Diagrams
-- Stores airport map diagrams with taxiways, runways, and aprons per airport

-- Create airport_diagrams table
CREATE TABLE IF NOT EXISTS airport_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,

  -- Background image
  background_image TEXT,  -- Base64 or URL
  image_width INTEGER DEFAULT 900,
  image_height INTEGER DEFAULT 900,

  -- Surfaces stored as JSON arrays
  taxiways JSONB DEFAULT '[]'::jsonb,
  runways JSONB DEFAULT '[]'::jsonb,
  aprons JSONB DEFAULT '[]'::jsonb,

  -- Label positioning offsets
  label_offsets JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  -- One diagram per airport
  UNIQUE(airport_id)
);

-- Create index for fast lookup by airport
CREATE INDEX IF NOT EXISTS idx_airport_diagrams_airport_id ON airport_diagrams(airport_id);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_airport_diagrams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS airport_diagrams_updated_at ON airport_diagrams;
CREATE TRIGGER airport_diagrams_updated_at
  BEFORE UPDATE ON airport_diagrams
  FOR EACH ROW
  EXECUTE FUNCTION update_airport_diagrams_updated_at();

-- Comments
COMMENT ON TABLE airport_diagrams IS 'Stores airport map diagrams with taxiways, runways, and aprons';
COMMENT ON COLUMN airport_diagrams.taxiways IS 'JSON array of taxiway objects with id, name, status, coordinates, parentId, sectionLabel';
COMMENT ON COLUMN airport_diagrams.runways IS 'JSON array of runway objects with id, name, status, coordinates, parentId, sectionLabel';
COMMENT ON COLUMN airport_diagrams.aprons IS 'JSON array of apron objects with id, name, status, coordinates';
COMMENT ON COLUMN airport_diagrams.label_offsets IS 'JSON object mapping surface IDs to {x, y} label position offsets';
