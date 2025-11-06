-- Add latitude and longitude columns to locations table
ALTER TABLE locations 
ADD COLUMN latitude NUMERIC(10, 8),
ADD COLUMN longitude NUMERIC(11, 8);

-- Add index for spatial queries
CREATE INDEX idx_locations_coordinates ON locations(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN locations.latitude IS 'Latitude in decimal degrees, range -90 to 90';
COMMENT ON COLUMN locations.longitude IS 'Longitude in decimal degrees, range -180 to 180';
