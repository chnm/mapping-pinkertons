-- Drop tables in reverse order of creation (to handle foreign key dependencies)
DROP TABLE IF EXISTS activity_locations;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS locations;
