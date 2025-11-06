# El Paso Surveillance Database

Website, database schema, and data loading scripts for Mapping El Paso.

## Database Schema Overview

- **activities**: Main table containing surveillance activities/events
- **locations**: Normalized location data (bars, neighborhoods, streets, etc.)
- **activity_locations**: Junction table linking activities to locations

## Setup

### Prerequisites

- PostgreSQL 12+
- Python 3.7+ with psycopg2
- golang-migrate (for migrations)
- `uv` - Python package installer

### Install uv and Dependencies

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh

# After installing uv:
uv install
```

### Database Creation

```bash
# Create database
createdb elpaso
```

### Environment Configuration

```bash
cp .env.example .env
```

## Running Migrations

Migrations require the use of [golang-migrate](https://github.com/golang-migrate/migrate). From the `db/migrations/` directory, run one of the following:

```bash
# Run migrations
migrate -path . -database "postgresql://postgres:postgres@localhost:5432/elpaso?sslmode=disable" up

# Rollback if needed
migrate -path . -database "postgresql://postgres:postgres@localhost:5432/elpaso?sslmode=disable" down
```

## Loading Data

### Run the loader

```bash
uv run utils/load_data.py data/el_paso.csv
```

The script will:
- Parse dates, times, and durations
- Convert Yes/No values to booleans
- Normalize and deduplicate locations
- Create activity-location relationships
- Show progress and summary statistics

## Configuration

Database credentials are loaded from the `.env`` file. The script uses these environment variables:

- `DB_NAME` - Database name (default: `elpaso`)
- `DB_USER` - Database user (default: `postgres`)
- `DB_PASSWORD` - Database password (default: `postgres`)
- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432`)

## Data Notes

### Duration Parsing

The script handles various duration formats:
- `5h45m` → 5 hours 45 minutes
- `10h` → 10 hours
- `[10h total]` → 10 hours (brackets and "total" removed)

### Time Parsing

- Converts `HH:MM` format to time objects
- Ignores text values like "Evening", "Afternoon"

### Boolean Fields

- `Yes` → true
- `No` → false
- Empty/other → null

### Location Deduplication

Locations are matched on the combination of:
- locality
- street_address
- location_name

This prevents duplicate location records while allowing for nulls in any field.

## Example Queries

```sql
-- Find all surveillance activities in Smeltertown
SELECT a.*, l.locality, l.location_name
FROM activities a
JOIN activity_locations al ON a.id = al.activity_id
JOIN locations l ON al.location_id = l.id
WHERE l.locality LIKE 'Smeltertown%';

-- Count activities by operative
SELECT operative, COUNT(*) as activity_count
FROM activities
WHERE operative IS NOT NULL
GROUP BY operative
ORDER BY activity_count DESC;

-- Find all activities at bars
SELECT a.date, a.mode, a.subject, l.location_name, l.locality
FROM activities a
JOIN activity_locations al ON a.id = al.activity_id
JOIN locations l ON al.location_id = l.id
WHERE l.location_type = 'Bar'
ORDER BY a.date;

-- Activities by date range
SELECT date, COUNT(*) as activity_count
FROM activities
WHERE date BETWEEN '1939-07-27' AND '1939-08-15'
GROUP BY date
ORDER BY date;
```

