-- Initial database schema for multi-tenant airfield operations system
-- Run this on your Neon PostgreSQL database

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'viewer');
CREATE TYPE surface_status AS ENUM ('open', 'closed', 'wip');
CREATE TYPE wip_section AS ENUM ('full', 'section-1', 'section-2', 'section-3');
CREATE TYPE notice_type AS ENUM ('info', 'warning', 'alert');

-- Airports table (tenant table)
CREATE TABLE airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  icao_code VARCHAR(4) UNIQUE NOT NULL,
  iata_code VARCHAR(3),
  country VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'UTC',
  map_config JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  airport_id UUID REFERENCES airports(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_airport_id ON users(airport_id);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Taxiways table
CREATE TABLE taxiways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  taxiway_id VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status surface_status DEFAULT 'open',
  reason TEXT,
  coordinates JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(airport_id, taxiway_id)
);

CREATE INDEX idx_taxiways_airport_id ON taxiways(airport_id);

-- Runways table
CREATE TABLE runways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  runway_id VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status surface_status DEFAULT 'open',
  coordinates JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(airport_id, runway_id)
);

CREATE INDEX idx_runways_airport_id ON runways(airport_id);

-- Scheduled WIPs table
CREATE TABLE scheduled_wips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  surface_id VARCHAR(10) NOT NULL,
  surface_type VARCHAR(20) NOT NULL,
  surface_name VARCHAR(255) NOT NULL,
  section wip_section DEFAULT 'full',
  reason TEXT NOT NULL,
  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP NOT NULL,
  crew VARCHAR(255),
  operational_impact TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_wips_airport_id ON scheduled_wips(airport_id);
CREATE INDEX idx_scheduled_wips_dates ON scheduled_wips(start_datetime, end_datetime);

-- Notices table
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  type notice_type NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notices_airport_id ON notices(airport_id);
CREATE INDEX idx_notices_created_at ON notices(created_at DESC);

-- Runway inspections table
CREATE TABLE runway_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  runway_id VARCHAR(10) NOT NULL,
  runway_name VARCHAR(255) NOT NULL,
  inspector_id UUID REFERENCES users(id),
  inspector_name VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  condition_first SMALLINT CHECK (condition_first BETWEEN 0 AND 6),
  condition_second SMALLINT CHECK (condition_second BETWEEN 0 AND 6),
  condition_third SMALLINT CHECK (condition_third BETWEEN 0 AND 6),
  contaminants TEXT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_runway_inspections_airport_id ON runway_inspections(airport_id);
CREATE INDEX idx_runway_inspections_timestamp ON runway_inspections(timestamp DESC);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE taxiways ENABLE ROW LEVEL SECURITY;
ALTER TABLE runways ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_wips ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE runway_inspections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (example for taxiways)
CREATE POLICY tenant_isolation_taxiways ON taxiways
  FOR ALL
  USING (
    airport_id = current_setting('app.current_airport_id', true)::UUID
    OR current_setting('app.user_role', true) = 'super_admin'
  );

CREATE POLICY tenant_isolation_runways ON runways
  FOR ALL
  USING (
    airport_id = current_setting('app.current_airport_id', true)::UUID
    OR current_setting('app.user_role', true) = 'super_admin'
  );

CREATE POLICY tenant_isolation_scheduled_wips ON scheduled_wips
  FOR ALL
  USING (
    airport_id = current_setting('app.current_airport_id', true)::UUID
    OR current_setting('app.user_role', true) = 'super_admin'
  );

CREATE POLICY tenant_isolation_notices ON notices
  FOR ALL
  USING (
    airport_id = current_setting('app.current_airport_id', true)::UUID
    OR current_setting('app.user_role', true) = 'super_admin'
  );

CREATE POLICY tenant_isolation_runway_inspections ON runway_inspections
  FOR ALL
  USING (
    airport_id = current_setting('app.current_airport_id', true)::UUID
    OR current_setting('app.user_role', true) = 'super_admin'
  );

-- Insert default super admin user
-- Password: 'changeme123' (MUST be changed after first login)
-- This is a bcrypt hash of 'changeme123'
INSERT INTO users (email, password_hash, name, role, airport_id, is_active)
VALUES (
  'simon@airfieldops.com',
  '$2a$10$YQ98PkFZUJXnXJrY5xDR2.N3lEUqC5m5zp4hF9bO7qHrqL.HO7EDi',
  'Simon',
  'super_admin',
  NULL,
  true
);

COMMENT ON TABLE airports IS 'Tenant table - each airport is a separate tenant';
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE sessions IS 'Session management for authentication';
COMMENT ON COLUMN users.airport_id IS 'NULL for super_admin, required for admin and viewer roles';
COMMENT ON COLUMN users.role IS 'super_admin: system-wide access, admin: full airport access, viewer: read-only';
