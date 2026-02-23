-- Reverse the migration: rename activity back to roping and change to BOOLEAN
DROP INDEX IF EXISTS detectives.idx_activities_activity;

ALTER TABLE detectives.activities
    RENAME COLUMN activity TO roping;

ALTER TABLE detectives.activities
    ALTER COLUMN roping TYPE BOOLEAN USING (roping::boolean),
    ALTER COLUMN roping SET DEFAULT FALSE;
