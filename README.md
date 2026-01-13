# Pinkertons Surveillance Database

![Pinkerton Detective Agency](https://cdn.britannica.com/86/178186-004-5FC5A55E.jpg)

Website, database schema, and data loading scripts for Mapping the Pinkertons.

## Database Schema Overview

- **activities**: Main table containing surveillance activities/events
- **locations**: Normalized location data (bars, neighborhoods, streets, etc.)
- **activity_locations**: Junction table linking activities to locations

## Setup

### Prerequisites

- PostgreSQL 12+
- Python 3.13+ (specified in `.python-version`)
- golang-migrate (for migrations)
- `uv` - Python package manager

### Install uv and Dependencies

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh

# After installing uv:
uv install
```

### Database Creation

```bash
# Create database (if using dedicated database)
createdb detectives

# OR if using shared database (e.g., apiary)
# Just set DB_NAME in .env to the shared database name
# The migrations will create the 'detectives' schema within that database
```

**Note**: This project can work in a shared database (e.g., `apiary`) alongside other projects. It uses:
- A dedicated PostgreSQL schema: `detectives`
- A dedicated migration tracking table: `detectives_schema_migrations`

This prevents conflicts with other projects in the same database.

### Environment Configuration

```bash
cp .env.example .env
```

## Running Migrations

Migrations require the use of [golang-migrate](https://github.com/golang-migrate/migrate). You can use the Makefile targets which automatically use your `.env` configuration:

```bash
# Run migrations
make migrate-up

# Check migration version
make migrate-version

# Rollback if needed
make migrate-down
```

**Migration Isolation**: This project uses a custom migration tracking table (`detectives_schema_migrations`) to allow multiple projects to coexist in the same PostgreSQL database. The Makefile automatically includes `x-migrations-table=detectives_schema_migrations` in the database URL.

**Troubleshooting Migrations**:
- If you get "relation already exists" errors on a database where tables exist but migration tracking is missing, force the migration version: 
  ```bash
  migrate -path db/migrations -database "$(DB_URL)&x-migrations-table=detectives_schema_migrations" force 4
  ```
- If migrations fail mid-way (dirty state), use `migrate force <last_good_version>` to reset

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

Database credentials are loaded from the `.env` file. The script uses these environment variables:

- `DB_NAME` - Database name (default: `detectives`)
- `DB_USER` - Database user (default: `postgres`)
- `DB_PASSWORD` - Database password (default: `postgres`)
- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432`)
- `DB_SCHEMA` - Database schema name (default: `detectives`)

The `.env.example` file includes commented sections for production, development, and local environments. Simply uncomment the block you want to use.

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

**Note**: All queries must use the `detectives` schema prefix (e.g., `detectives.activities`).

```sql
-- Find all surveillance activities in Smeltertown
SELECT a.*, l.locality, l.location_name
FROM detectives.activities a
JOIN detectives.activity_locations al ON a.id = al.activity_id
JOIN detectives.locations l ON al.location_id = l.id
WHERE l.locality LIKE 'Smeltertown%';

-- Count activities by operative
SELECT operative, COUNT(*) as activity_count
FROM detectives.activities
WHERE operative IS NOT NULL
GROUP BY operative
ORDER BY activity_count DESC;

-- Find all activities at bars
SELECT a.date, a.mode, a.subject, l.location_name, l.locality
FROM detectives.activities a
JOIN detectives.activity_locations al ON a.id = al.activity_id
JOIN detectives.locations l ON al.location_id = l.id
WHERE l.location_type = 'Bar'
ORDER BY a.date;

-- Activities by date range
SELECT date, COUNT(*) as activity_count
FROM detectives.activities
WHERE date BETWEEN '1939-07-27' AND '1939-08-15'
GROUP BY date
ORDER BY date;
```

