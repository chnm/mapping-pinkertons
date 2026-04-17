-- Add source_file column to activities table to track which CSV file each record came from
ALTER TABLE detectives.activities
ADD COLUMN source_file TEXT;

COMMENT ON COLUMN detectives.activities.source_file IS 'Filename of the CSV that originally loaded this record';
