-- Migration 007: Make the operational audit log genuinely append-only (AO-05)
--
-- The UI states operational notices are "immutable and append-only ... retained
-- for a minimum of 3 years". This enforces that at the database level so the
-- claim holds even against direct SQL access, and regardless of connecting role.

BEGIN;

CREATE OR REPLACE FUNCTION notices_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'notices is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notices_no_update ON notices;
CREATE TRIGGER notices_no_update
  BEFORE UPDATE OR DELETE ON notices
  FOR EACH ROW EXECUTE FUNCTION notices_block_mutation();

DROP TRIGGER IF EXISTS notices_no_truncate ON notices;
CREATE TRIGGER notices_no_truncate
  BEFORE TRUNCATE ON notices
  FOR EACH STATEMENT EXECUTE FUNCTION notices_block_mutation();

COMMIT;

-- Belt-and-braces at the grant level for the app role from migration 006:
--   REVOKE UPDATE, DELETE, TRUNCATE ON notices FROM airfield_app;
--
-- Retention/erasure (e.g. a GDPR request) must go through a privileged
-- maintenance role that temporarily disables the triggers:
--   ALTER TABLE notices DISABLE TRIGGER notices_no_update;
--   -- perform the minimal, logged change
--   ALTER TABLE notices ENABLE TRIGGER notices_no_update;
