-- Remove visits column from locations table
ALTER TABLE detectives.locations
DROP COLUMN IF EXISTS visits;
