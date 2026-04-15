-- Add investigation column to activities table
ALTER TABLE detectives.activities
ADD COLUMN investigation TEXT;

-- Create index for filtering by investigation
CREATE INDEX idx_activities_investigation ON detectives.activities (investigation);

-- Add documentation comment
COMMENT ON COLUMN detectives.activities.investigation IS 'Investigation case identifier (e.g., el-paso, nyc, hobart, atlanta)';

-- Backfill el-paso (original dataset with explicit IDs 1-654)
UPDATE detectives.activities SET investigation = 'el-paso' WHERE id BETWEEN 1 AND 654;

-- Backfill remaining investigations via locality matching on linked locations
UPDATE detectives.activities a SET investigation = 'nyc'
FROM detectives.activity_locations al
JOIN detectives.locations l ON al.location_id = l.id
WHERE al.activity_id = a.id AND a.investigation IS NULL
  AND l.locality IN ('Manhattan, NYC', 'Brooklyn, NYC', 'Bronx, NYC', 'Queens, NYC',
    'Auburndale, LI', 'Sunnyside, LI', 'Carlton Hill, NJ', 'Newark, NJ', 'Union City', 'White Township');

UPDATE detectives.activities a SET investigation = 'hobart'
FROM detectives.activity_locations al
JOIN detectives.locations l ON al.location_id = l.id
WHERE al.activity_id = a.id AND a.investigation IS NULL
  AND l.locality IN ('Long Branch, NJ', 'Long Branch, Nj', 'Ashbury Park, NJ', 'Ashbury, NJ',
    'Deal, NJ', 'Freehold, NJ', 'Monmouth, NJ', 'NJ', 'Jersey City, NJ', 'Newark, NJ',
    'Union City, NJ', 'West New York, NJ', 'New York City, NY', 'New York City',
    'Brooklyn, NY', 'Boston, MA', 'Newton, MA', 'Watertown, MA', 'Westboro, MA');

UPDATE detectives.activities a SET investigation = 'atlanta'
FROM detectives.activity_locations al
JOIN detectives.locations l ON al.location_id = l.id
WHERE al.activity_id = a.id AND a.investigation IS NULL
  AND l.locality IN ('Atlanta', 'Griffin, GA', 'Marietta, GA', 'Smyrna, GA', 'Hammond, IN');
