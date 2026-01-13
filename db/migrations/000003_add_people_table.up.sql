CREATE TABLE IF NOT EXISTS detectives.people (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    alias VARCHAR(255),
    birth_year INTEGER,
    death_year INTEGER,
    occupation VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
