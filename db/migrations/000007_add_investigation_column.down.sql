DROP INDEX IF EXISTS detectives.idx_activities_investigation;
ALTER TABLE detectives.activities DROP COLUMN IF EXISTS investigation;
