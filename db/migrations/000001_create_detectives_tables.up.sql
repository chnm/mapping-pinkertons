-- Create schema
CREATE SCHEMA IF NOT EXISTS detectives;

-- Create locations table first (no dependencies)
CREATE TABLE detectives.locations (
    id SERIAL PRIMARY KEY,
    locality TEXT,
    street_address TEXT,
    location_name TEXT,
    location_type TEXT,
    location_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (locality, street_address, location_name)
);

-- Create activities table
CREATE TABLE detectives.activities (
    id INTEGER PRIMARY KEY,
    source TEXT,
    operative TEXT,
    date DATE,
    time TIME,
    duration INTERVAL,
    roping BOOLEAN DEFAULT FALSE,
    mode TEXT,
    activity_notes TEXT,
    subject TEXT,
    information TEXT,
    information_type TEXT,
    edited BOOLEAN DEFAULT FALSE,
    edit_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for activity-location relationship
CREATE TABLE detectives.activity_locations (
    activity_id INTEGER REFERENCES detectives.activities (id) ON DELETE CASCADE,
    location_id INTEGER REFERENCES detectives.locations (id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, location_id)
);

-- Create indexes for common queries
CREATE INDEX idx_activities_date ON detectives.activities (date);
CREATE INDEX idx_activities_operative ON detectives.activities (operative);
CREATE INDEX idx_activities_subject ON detectives.activities (subject);
CREATE INDEX idx_activities_mode ON detectives.activities (mode);
CREATE INDEX idx_locations_locality ON detectives.locations (locality);
CREATE INDEX idx_locations_type ON detectives.locations (location_type);
