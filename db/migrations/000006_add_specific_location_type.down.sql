-- Remove auto-generated identity from activities.id
ALTER TABLE detectives.activities
    ALTER COLUMN id DROP IDENTITY IF EXISTS;

-- Remove specific_location_type column from locations table
ALTER TABLE detectives.locations
DROP COLUMN IF EXISTS specific_location_type;
