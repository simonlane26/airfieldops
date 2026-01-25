# Database Schema - Multi-Tenant Airfield Operations

## Overview
This schema supports multi-tenant architecture where multiple airports can use the system independently with complete data isolation.

## Tables

### airports
Tenant table - each airport is a separate tenant.

```sql
CREATE TABLE airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  icao_code VARCHAR(4) UNIQUE NOT NULL,
  iata_code VARCHAR(3),
  country VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'UTC',
  map_config JSONB, -- Stores SVG coordinates and configuration
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

### users
User accounts with role-based access control.

```sql
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'viewer');

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
```

### sessions
Session management for authentication.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

### taxiways
Airport taxiway definitions.

```sql
CREATE TYPE surface_status AS ENUM ('open', 'closed', 'wip');

CREATE TABLE taxiways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  taxiway_id VARCHAR(10) NOT NULL, -- e.g., 'A', 'B', 'CP'
  name VARCHAR(255) NOT NULL,
  status surface_status DEFAULT 'open',
  reason TEXT,
  coordinates JSONB NOT NULL, -- SVG polygon coordinates
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(airport_id, taxiway_id)
);

CREATE INDEX idx_taxiways_airport_id ON taxiways(airport_id);
```

### runways
Airport runway definitions.

```sql
CREATE TABLE runways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  runway_id VARCHAR(10) NOT NULL, -- e.g., '04/22'
  name VARCHAR(255) NOT NULL,
  status surface_status DEFAULT 'open',
  coordinates JSONB NOT NULL, -- SVG polygon coordinates
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(airport_id, runway_id)
);

CREATE INDEX idx_runways_airport_id ON runways(airport_id);
```

### scheduled_wips
Work in progress schedules.

```sql
CREATE TYPE wip_section AS ENUM ('full', 'section-1', 'section-2', 'section-3');

CREATE TABLE scheduled_wips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
  surface_id VARCHAR(10) NOT NULL, -- taxiway_id or runway_id
  surface_type VARCHAR(20) NOT NULL, -- 'taxiway' or 'runway'
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
```

### notices
Operational notices and audit trail.

```sql
CREATE TYPE notice_type AS ENUM ('info', 'warning', 'alert');

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
```

### runway_inspections
Runway condition inspections.

```sql
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
```

## Role Permissions

### Super Admin
- Create and manage airports (tenants)
- Create and manage users across all airports
- Access all airport data
- System configuration

### Admin (ATC)
- Full access to their airport's operational data
- Create/update taxiways, runways, WIPs, notices, inspections
- Manage viewers for their airport
- View all reports and audit trails

### Viewer
- Read-only access to their airport's data
- View map, WIPs, notices, inspections
- Cannot modify any data
- Cannot access admin controls

## Multi-Tenant Data Isolation

All queries must include `airport_id` filter except for Super Admin operations.

Row-Level Security (RLS) policies can be implemented for additional security:

```sql
-- Enable RLS on all tenant tables
ALTER TABLE taxiways ENABLE ROW LEVEL SECURITY;
ALTER TABLE runways ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_wips ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE runway_inspections ENABLE ROW LEVEL SECURITY;

-- Example policy for taxiways
CREATE POLICY tenant_isolation ON taxiways
  USING (airport_id = current_setting('app.current_airport_id')::UUID);
```

## Initial Seed Data

```sql
-- Create initial super admin user (password: 'changeme123' - MUST be changed)
INSERT INTO users (email, password_hash, name, role, airport_id)
VALUES (
  'simon@airfieldops.com',
  '$2a$10$...',  -- bcrypt hash of 'changeme123'
  'Simon',
  'super_admin',
  NULL  -- Super admin not tied to specific airport
);
```
