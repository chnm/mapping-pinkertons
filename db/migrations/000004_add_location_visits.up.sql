-- Add visits column to locations table to track frequency of visits
ALTER TABLE detectives.locations
ADD COLUMN visits INTEGER DEFAULT 0;

-- Add check constraint to ensure visits is non-negative
ALTER TABLE detectives.locations
ADD CONSTRAINT visits_non_negative CHECK (visits >= 0);

-- Add comment for documentation
COMMENT ON COLUMN detectives.locations.visits IS 'Number of times this location was visited (can be multiple per day)';
