-- Migration 006: Make Row-Level Security actually enforce (AO-04)
--
-- Problems this fixes:
--   1. RLS policies existed but the app connects as the table OWNER, and Postgres
--      exempts owners from RLS unless FORCE ROW LEVEL SECURITY is set.
--   2. Policies had no WITH CHECK clause, so even with RLS on, a permitted role
--      could INSERT/UPDATE rows belonging to another airport.
--   3. airport_diagrams had no RLS at all.
--
-- REQUIRED companion change (not SQL): point DATABASE_URL at a dedicated
-- least-privilege login role, NOT `neondb_owner`. FORCE RLS below also constrains
-- the owner, but running the app as a non-owner is the belt-and-braces posture.
--
--   CREATE ROLE airfield_app LOGIN PASSWORD '<generated>';
--   GRANT USAGE ON SCHEMA public TO airfield_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO airfield_app;
--   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO airfield_app;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO airfield_app;

BEGIN;

-- 1. airport_diagrams: enable RLS + tenant policy (was missing entirely)
ALTER TABLE airport_diagrams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_airport_diagrams ON airport_diagrams;
CREATE POLICY tenant_isolation_airport_diagrams ON airport_diagrams
  FOR ALL
  USING (
    airport_id = current_setting('app.current_airport_id', true)::uuid
    OR current_setting('app.user_role', true) = 'super_admin'
  )
  WITH CHECK (
    airport_id = current_setting('app.current_airport_id', true)::uuid
    OR current_setting('app.user_role', true) = 'super_admin'
  );

-- 2. Re-create the existing five policies WITH CHECK (USING alone only filters reads
--    and the rows visible to UPDATE/DELETE; WITH CHECK stops cross-tenant writes).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['taxiways','runways','scheduled_wips','notices','runway_inspections']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%1$s ON %1$s', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation_%1$s ON %1$s
        FOR ALL
        USING (
          airport_id = current_setting('app.current_airport_id', true)::uuid
          OR current_setting('app.user_role', true) = 'super_admin'
        )
        WITH CHECK (
          airport_id = current_setting('app.current_airport_id', true)::uuid
          OR current_setting('app.user_role', true) = 'super_admin'
        )
    $f$, t);
  END LOOP;
END$$;

-- 3. FORCE RLS on every tenant table so the connecting role cannot bypass it,
--    even if it happens to own the table.
ALTER TABLE taxiways            FORCE ROW LEVEL SECURITY;
ALTER TABLE runways             FORCE ROW LEVEL SECURITY;
ALTER TABLE scheduled_wips      FORCE ROW LEVEL SECURITY;
ALTER TABLE notices             FORCE ROW LEVEL SECURITY;
ALTER TABLE runway_inspections  FORCE ROW LEVEL SECURITY;
ALTER TABLE airport_diagrams    FORCE ROW LEVEL SECURITY;

COMMIT;

-- Verify (expect rowsecurity = t and forcerowsecurity = t for all six):
--   SELECT relname, relrowsecurity, relforcerowsecurity
--   FROM pg_class
--   WHERE relname IN ('taxiways','runways','scheduled_wips','notices',
--                     'runway_inspections','airport_diagrams');
