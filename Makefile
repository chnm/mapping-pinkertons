.PHONY: help migrate-up migrate-down migrate-reset load-data clean db-create db-drop db-check

# Load environment variables from .env file
include .env
export

# Database URL constructed from individual variables
# Use x-migrations-table to isolate this project's migrations from others in the same database
DB_URL := postgresql://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable&x-migrations-table=detectives_schema_migrations

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' Makefile | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

db-create: ## Create the database
	@echo "Creating database $(DB_NAME)..."
	@psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -tc "SELECT 1 FROM pg_database WHERE datname = '$(DB_NAME)'" | grep -q 1 || \
		psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -c "CREATE DATABASE $(DB_NAME)"
	@echo "Database $(DB_NAME) ready"

db-drop: ## Drop the database (WARNING: destructive!)
	@echo " WARNING: This will delete the database $(DB_NAME)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -c "DROP DATABASE IF EXISTS $(DB_NAME)"; \
		echo "Database $(DB_NAME) dropped"; \
	else \
		echo "Cancelled"; \
	fi

db-check: ## Show current database connection info
	@echo "Current database configuration:"
	@echo "  Host:     $(DB_HOST)"
	@echo "  Port:     $(DB_PORT)"
	@echo "  User:     $(DB_USER)"
	@echo "  Database: $(DB_NAME)"
	@echo "  Schema:   $(DB_SCHEMA)"
	@echo ""
	@PGPASSWORD=$(DB_PASSWORD) psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -d $(DB_NAME) -c '\conninfo'

migrate-up: ## Run all pending migrations
	@echo "Running migrations up..."
	@migrate -path db/migrations -database "$(DB_URL)" up
	@echo "Migrations complete"

migrate-down: ## Rollback the last migration
	@echo "Rolling back last migration..."
	@migrate -path db/migrations -database "$(DB_URL)" down 1
	@echo "Rollback complete"

migrate-down-all: ## Rollback all migrations (WARNING: destructive!)
	@echo "WARNING: This will rollback all migrations"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		migrate -path db/migrations -database "$(DB_URL)" down; \
		echo "All migrations rolled back"; \
	else \
		echo "Cancelled"; \
	fi

migrate-reset: ## Drop and recreate all migrations
	@echo "Resetting database schema..."
	@make migrate-down-all
	@make migrate-up
	@echo "Database reset complete"

migrate-version: ## Show current migration version
	@migrate -path db/migrations -database "$(DB_URL)" version

load-data: ## Load data from CSV into database
	@echo "Loading data from CSV..."
	@python utils/load_data.py data/el_paso.csv --crosswalk data/crosswalk.csv
	@echo "Data load complete"

