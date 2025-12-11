-- Remove latitude and longitude columns from locations table
ALTER TABLE detectives.locations
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude;
