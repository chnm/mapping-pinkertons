# SPEC.md

> For technical implementation details, architecture, and developer documentation, see [AGENTS.md](./AGENTS.md).

---

## Table of Contents

- [Overview](#overview)
- [Users & Roles](#users--roles)
- [Business Rules](#business-rules)
- [Features](#features)
- [User Flows](#user-flows)
- [Out of Scope](#out-of-scope)
- [Open Questions](#open-questions)

---

## Overview

**Mapping the Pinkertons** is a digital scholarly research project that documents and visualizes the surveillance activities of the Pinkerton Detective Agency in El Paso, Texas and surrounding regions during the late 1930s labor disputes.

The project transforms historical records from Pinkerton agency reports into a structured, searchable, and mappable dataset. It makes visible the geography, patterns, and scale of private surveillance directed at labor organizers, workers, and their communities — information that was previously inaccessible outside archival research.

**Primary goals:**
- Publish a browsable and searchable database of all recorded Pinkerton surveillance activities
- Provide an interactive map showing where surveillance occurred geographically
- Surface patterns in the data through curated statistical visualizations (who was watched, when, how often, where)
- Present the research in a publicly accessible, scholarly-quality website

**Target audiences:**
- Historians and academic researchers in labor history, surveillance studies, and Southwest regional history
- General public with interest in labor history or the history of surveillance
- Project team (RRCHNM): Stephen Robertson (PI) and Jason A. Heppler (Senior Developer-Scholar)

**Production URL**: `https://mappingpinkertons.rrchnm.org`

---

## Users & Roles

This is a read-only public website — there are no accounts, logins, or user-generated content. All users have identical access to all public content.

### Public Visitor
- Any person who visits the website
- Can: browse all activities, use the map, view visualizations, read about the project
- Cannot: modify data, submit content, or access administrative functions

### Project Team (RRCHNM)
- Manages the data pipeline and website content outside the browser (Git, CLI tools)
- Responsible for: loading new data, writing content, deploying the site, maintaining the database
- All data changes go through the Python pipeline and Git workflow — not through any web UI

---

## Business Rules

### Data Integrity Rules

- Every activity record must have a unique integer ID sourced from the original CSV data. IDs are not auto-generated.
- An activity can be linked to zero or more locations (many-to-many via `activity_locations`).
- A location is identified by the combination of `(locality, street_address, location_name)`. Any field may be null. Duplicate detection uses null-safe equality (`IS NOT DISTINCT FROM`).
- The data loader is idempotent: running it multiple times on the same source CSV must not create duplicate records.

### Parsing Rules

| Field | Rule |
|---|---|
| Date | Must be `YYYY-MM-DD` format; invalid dates stored as NULL with a warning logged |
| Time | Must be `HH:MM` format; text values like "Evening" are ignored (stored as NULL) |
| Duration | Parsed from formats like `5h45m`, `10h`, `[10h total]` into PostgreSQL `INTERVAL`; unparseable values stored as NULL |
| Activity (formerly Roping) | Free text (e.g., "Surveillance", "Shadowing"); not boolean |
| Edited / Booleans | `"Yes"` → `true`, `"No"` → `false`, empty/other → `NULL` |
| Names (Operative, Subject) | Split on comma or ampersand into first/last name components |
| Coordinates in Notes | If "Location Notes" contains `lat, lon` format, coordinates are extracted automatically |

### Geocoding Rules

- Geocoding is **disabled by default** and must be explicitly enabled with `--geocode`
- Uses OpenStreetMap Nominatim API; rate limit: 1 request/second
- Tries hierarchical fallback: full address → location name + locality → locality only
- Geocoding is restricted to states in `ALLOWED_STATES` env var (default: TX, AZ, NM)
- If a location already has coordinates (from the crosswalk or a prior run), those are not overwritten

### Location Crosswalk Rules

- A crosswalk CSV can provide pre-geocoded coordinates and visit counts
- Matched on `(location_name, locality)` pair, or `location_name` alone if no locality match
- Coordinates from the crosswalk are only applied if the location does not already have coordinates

---

## Features

### Feature: Interactive Map

**Description:**
A full-screen interactive map showing the geographic distribution of Pinkerton surveillance activities.

**Functionality:**
- Renders location markers for all geocoded surveillance locations
- Clicking a marker shows details about activities at that location
- Supports filtering by activity type, location type, or time period (see filter UI)
- Map occupies the full browser viewport (no footer)

**Layout notes:**
- Uses a dedicated `map` layout in Hugo; the base template omits the footer and sets `overflow-hidden` on body
- Map data is fetched from the external API service at runtime

---

### Feature: Activities Database

**Description:**
A browsable, searchable table of all recorded Pinkerton surveillance activities.

**Functionality:**
- Displays all activities with date, operative, subject, location, mode, and activity type
- Supports free-text search across operative, subject, and location fields
- Supports filtering by activity type and location
- Paginated display (10 items per page per Hugo pagination config)

---

### Feature: Statistical Visualizations

**Description:**
A section of curated Observable Plot charts that surface patterns in the surveillance data.

**Current visualizations:**

| vizType | Chart Type | What It Shows |
|---|---|---|
| `activities-over-time` | Time series bar chart | Number of activities per month |
| `location-frequency` | Horizontal bar chart | Top 15 most surveilled locations |
| `operative-activity` | Horizontal bar chart | Top 10 operatives by activity count |
| `time-of-day` | Histogram | Activities distributed by hour of day |

**Functionality:**
- Each visualization has its own page with the chart and accompanying scholarly analysis text
- The visualizations index page groups charts by geographic location
- Charts are responsive (scale to window width) and include hover tooltips
- Data is fetched from the external API at page load

**Adding visualizations:**
See `detectives-website/ADDING-VISUALIZATIONS.md`. Requires: a content `.md` file with `vizType` frontmatter, and a matching JS module exporting `createVisualization(data)`.

---

### Feature: About Page

**Description:**
Scholarly context page describing the project, its research questions, source materials, methodology, and project team.

**Current team:**
- Stephen Robertson, Principal Investigator (2025–)
- Jason A. Heppler, Senior Developer-Scholar (2025–)

---

## User Flows

### Flow 1: Exploring the Map

**Goal:** Understand the geographic distribution of Pinkerton surveillance

**Steps:**
1. Visitor navigates to `/map`
2. Full-screen map loads with location markers for all geocoded activities
3. Visitor can pan/zoom to areas of interest
4. Visitor clicks a marker → popup shows activity details for that location
5. Visitor can apply filters (activity type, location type) to narrow the displayed markers

**Error paths:**
- API unavailable: Map loads but no markers appear; browser console logs the fetch error
- Location not geocoded: Activity exists in database but has no marker on map

---

### Flow 2: Searching the Activities Database

**Goal:** Find specific surveillance activities by operative, subject, or location

**Steps:**
1. Visitor navigates to `/activities`
2. Full activity table loads (paginated, 10 per page)
3. Visitor types in the search box → table filters to matching rows
4. Visitor can additionally filter by activity type or location using filter controls
5. Visitor clicks an activity row to see full details

---

### Flow 3: Viewing a Visualization

**Goal:** Understand a pattern in the surveillance data

**Steps:**
1. Visitor navigates to `/visualizations`
2. Index page shows cards for each visualization, grouped by location
3. Visitor clicks a card → individual visualization page loads
4. Observable Plot chart renders using data fetched from the API
5. Visitor hovers over chart elements to see tooltips with values
6. Below the chart, scholarly analysis text explains the patterns shown

**Error paths:**
- JS module fails to load: Chart area is empty; browser console shows module import error
- API returns no data: Chart renders with empty/zero state

---

## Out of Scope

### Not in V1 (Potential Future Enhancements)
- User accounts or saved searches
- Ability for the public to submit corrections or additions to the data
- Coverage beyond El Paso / the current dataset (other cities, other agencies, other time periods)
- Mobile native apps
- Data export / download functionality for end users
- Full-text search of the `information` and `activity_notes` fields

### Explicitly Excluded
- Server-side rendering or a dynamic web application — the site is and will remain a static Hugo build
- A web-based data entry UI — all data changes go through the Python pipeline and CSV source files
- User authentication or access control — all content is public
- Real-time collaboration features

---

## Open Questions

### Data
- **Q:** Should the `people` table be linked to `activities.subject` via a foreign key?
  - **Context:** Currently subjects are free text in `activities.subject`. The `people` table exists but is unlinked. Linking would enable richer person-centric queries.
  - **Options:** Parse subject names into `people` records and add `activity_subject` junction table; keep as free text; hybrid approach
  - **Owner:** PI + Developer
  - **Status:** Open

- **Q:** What is the canonical list of valid `location_type` values?
  - **Context:** Currently free text; standardizing would enable better filtering
  - **Owner:** PI
  - **Status:** Open

### Website
- **Q:** Should the map support filtering by date range (not just activity type)?
  - **Context:** A date slider would allow users to see how surveillance activity evolved over time geographically
  - **Owner:** PI + Developer
  - **Status:** Not yet prioritized

- **Q:** What API service provides data to the website at `localhost:8090`?
  - **Context:** The visualizations and map fetch from this endpoint, but the service is not in this repository. Documentation of the API contract (endpoints, response shapes) would help development.
  - **Owner:** Developer
  - **Status:** Needs documentation

---

*Last Updated: 2026-02-23*
*This document is maintained for AI agent context and onboarding.*
