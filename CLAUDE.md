# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mapping the Pinkertons** is a digital history project (RRCHNM) that maps Pinkerton Detective Agency surveillance activities in El Paso, Texas. It consists of three parts: a PostgreSQL database, a Python data-loading pipeline, and a Hugo static website.

Comprehensive documentation is in `AGENTS.md`. Refer to it for detailed schema descriptions, data format specs, and troubleshooting.

## Essential Commands

### Database (from root directory)

```bash
make migrate-up          # Run pending migrations
make migrate-down        # Rollback last migration
make migrate-version     # Check migration status
make db-create           # Create the database
make db-check            # Show connection info
```

Alternatively, use `just` (a `justfile` also exists at root with the same targets).

### Data Loading

```bash
uv run utils/load_data.py data/el_paso.csv
uv run utils/load_data.py data/el_paso.csv --crosswalk data/crosswalk.csv
uv run utils/load_data.py data/el_paso.csv --geocode   # enables OSM geocoding (disabled by default)
```

### Website (from `detectives-website/`)

```bash
make tailwind       # Build Tailwind CSS (must run before Hugo builds)
make serve          # Preview locally with live reload
make build          # Build for development
make build-prod     # Build minified for production
```

## Architecture

### Database

PostgreSQL with schema `detectives`. All queries must prefix table names with `detectives.`. Migrations use golang-migrate with a custom tracking table (`detectives_schema_migrations`) so the project can share a database (e.g., `apiary`) with other projects.

Core tables: `activities` (surveillance events) → `activity_locations` (junction) → `locations` (geocoded places). A `people` table exists for subjects.

Migrations live in `db/migrations/` as numbered `up`/`down` SQL file pairs.

### Data Pipeline

`utils/load_data.py` reads CSV → parses/validates → upserts to PostgreSQL. Uses `ON CONFLICT DO NOTHING` for idempotency. `utils/geocoder.py` handles OpenStreetMap Nominatim lookups (1 req/sec rate limit). Python 3.13+ required; use `uv` (not pip).

### Hugo Website

Located in `detectives-website/`. Uses a custom theme `pinkertons` with Tailwind CSS (grit color scheme) and Observable Plot for visualizations.

**Build order matters**: Tailwind must compile before Hugo (`make tailwind` → `make build`).

Theme files are under `themes/pinkertons/` — edit layouts there, not in `detectives-website/layouts/`.

**Visualizations** are Observable Plot modules in `themes/pinkertons/static/js/visualizations/`. Each must export `createVisualization(data)`. The filename must match the `vizType` frontmatter field in the corresponding `content/visualizations/` markdown file. See `detectives-website/ADDING-VISUALIZATIONS.md` for the full guide.

## Key Conventions

- **Python**: Use `uv`, not pip. Scripts use PEP 723 inline deps with `#!/usr/bin/env uv run` shebang.
- **Linting**: Ruff (configured in `utils/.pre-commit-config.yaml`).
- **SQL**: Always use `detectives.tablename` schema prefix. Use `ON CONFLICT` for idempotent inserts. Migrations create schema only — never INSERT data in migrations.
- **CSS**: Tailwind utility classes using the `grit` palette: accent `#9c1b1b`, gold `#d0a85c`, steel `#44697d`. Headings use Oswald (`font-heading`), body uses EB Garamond (`font-body`).
- **Env**: Copy `.env.example` → `.env`. The root Makefile uses `include .env`. Never commit `.env`.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `DB_NAME` | `detectives` | Database name |
| `DB_USER` | `postgres` | DB user |
| `DB_PASSWORD` | `postgres` | DB password |
| `DB_HOST` | `localhost` | DB host |
| `DB_PORT` | `5432` | DB port |
| `DB_SCHEMA` | `detectives` | PostgreSQL schema |
| `ALLOWED_STATES` | `TX,AZ,NM` | Restrict geocoding to these states |

## Deployment

GitHub Actions workflow at `.github/workflows/cicd--detectives-website.yml` triggers on push to `main` when `detectives-website/**` changes. Builds a multi-stage Docker image (Hugo build → Nginx serve) and deploys to `mappingpinkertons.rrchnm.org`.
