# Load environment variables from .env file
set dotenv-load

# Database URL constructed from individual variables
# Use x-migrations-table to isolate this project's migrations from others in the same database
db_url := "postgresql://" + env_var('DB_USER') + ":" + env_var('DB_PASSWORD') + "@" + env_var('DB_HOST') + ":" + env_var('DB_PORT') + "/" + env_var('DB_NAME') + "?sslmode=disable&x-migrations-table=detectives_schema_migrations"

# Show available recipes
default:
    @just --list

# Create the database
db-create:
    @echo "Creating database $DB_NAME..."
    @psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME"
    @echo "Database $DB_NAME ready"

# Drop the database (WARNING: destructive!)
[confirm("This will delete the database. Are you sure?")]
db-drop:
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME"
    @echo "Database $DB_NAME dropped"

# Show current database connection info
db-check:
    @echo "Current database configuration:"
    @echo "  Host:     $DB_HOST"
    @echo "  Port:     $DB_PORT"
    @echo "  User:     $DB_USER"
    @echo "  Database: $DB_NAME"
    @echo "  Schema:   $DB_SCHEMA"
    @echo ""
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\conninfo'

# Run all pending migrations
migrate-up:
    @echo "Running migrations up..."
    migrate -path db/migrations -database "{{ db_url }}" up
    @echo "Migrations complete"

# Rollback the last migration
migrate-down:
    @echo "Rolling back last migration..."
    migrate -path db/migrations -database "{{ db_url }}" down 1
    @echo "Rollback complete"

# Rollback all migrations (WARNING: destructive!)
[confirm("This will rollback all migrations. Are you sure?")]
migrate-down-all:
    migrate -path db/migrations -database "{{ db_url }}" down
    @echo "All migrations rolled back"

# Drop and recreate all migrations
migrate-reset: migrate-down-all migrate-up
    @echo "Database reset complete"

# Show current migration version
migrate-version:
    migrate -path db/migrations -database "{{ db_url }}" version

# Load data from CSV into database
load-data:
    @echo "Loading data from CSV..."
    python utils/load_data.py data/el_paso.csv --crosswalk data/crosswalk.csv
    @echo "Data load complete"
