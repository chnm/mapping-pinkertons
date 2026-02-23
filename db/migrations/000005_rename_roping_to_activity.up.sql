-- Rename the roping column to activity and change from BOOLEAN to TEXT
-- since it actually contains activity type values like 'Surveillance', 'Shadowing', etc.
ALTER TABLE detectives.activities
    ALTER COLUMN roping TYPE TEXT,
    ALTER COLUMN roping DROP DEFAULT;

ALTER TABLE detectives.activities
    RENAME COLUMN roping TO activity;

-- Add an index for the new activity column for better query performance
CREATE INDEX idx_activities_activity ON detectives.activities (activity);
