.PHONY: help migrate-up migrate-down migrate-reset load-data clean db-create db-drop

# Load environment variables from .env file
include .env
export

# Database URL
DB_URL := postgresql://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

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

load-data: ## Load data from CSV file
	@echo "Loading data from $(CSV)..."
	uv run utils/load_data.py data/el_paso.csv

setup: db-create migrate-up ## Create database and run all migrations
	@echo "Setup complete"

clean: ## Clean up log files
	@echo "Cleaning up log files..."
	@rm -rf logs/
	@echo "Cleanup complete"

psql: ## Connect to database with psql
	@psql -h $(DB_HOST) -p $(DB_PORT) -U $(DB_USER) -d $(DB_NAME)

