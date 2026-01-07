#!/usr/bin/env uv run
# /// script
# dependencies = [
#   "psycopg2-binary",
#   "python-dotenv",
#   "requests",
# ]
# ///
"""
Load Pinkerton data from CSV into Postgres database.
Supports optional crosswalk file for enriching location data with coordinates and visits.
"""

import csv
import psycopg2
from datetime import datetime, time as dt_time
import re
import sys
import os
import logging
import argparse
from pathlib import Path
from dotenv import load_dotenv
from geocoder import geocode_location

# Load environment variables from .env file
load_dotenv()

# Database connection parameters from environment
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "detectives"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
}

# Schema name
SCHEMA_NAME = os.getenv("DB_SCHEMA", "detectives")

# Allowed states for geocoding - restricts results to these states
# Can be comma-separated list like "TX,AZ,NM" or empty for no restriction
ALLOWED_STATES_STR = os.getenv("ALLOWED_STATES", "TX,AZ,NM")
ALLOWED_STATES = (
    tuple(s.strip() for s in ALLOWED_STATES_STR.split(",") if s.strip())
    if ALLOWED_STATES_STR
    else None
)


def setup_logging():
    """
    Setup logging to both file and console.
    Log file name includes timestamp.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = f"import_{timestamp}.log"

    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    log_path = log_dir / log_file

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[logging.FileHandler(log_path), logging.StreamHandler(sys.stdout)],
    )

    return log_path


def parse_duration(duration_str, row_id=None):
    """
    Parse duration strings like '5h45m', '10h', '2h', '[10h total]' into PostgreSQL interval format.
    Returns None if empty or cannot parse.
    """
    if not duration_str or duration_str.strip() == "":
        return None

    original = duration_str

    # Remove brackets and 'total' text
    duration_str = re.sub(r"[\[\]]", "", duration_str)
    duration_str = duration_str.replace("total", "").strip()

    # Match patterns like '5h45m', '10h', '45m'
    hours = 0
    minutes = 0

    hour_match = re.search(r"(\d+)h", duration_str)
    if hour_match:
        hours = int(hour_match.group(1))

    minute_match = re.search(r"(\d+)m", duration_str)
    if minute_match:
        minutes = int(minute_match.group(1))

    if hours == 0 and minutes == 0:
        logging.warning(f"Row {row_id}: Could not parse duration '{original}'")
        return None

    result = f"{hours} hours {minutes} minutes"
    logging.debug(f"Row {row_id}: Parsed duration '{original}' -> '{result}'")
    return result


def parse_time(time_str, row_id=None):
    """
    Parse time strings like '12:00', '7:00', 'Evening' into time objects.
    Returns None if empty or cannot parse.
    """
    if not time_str or time_str.strip() == "":
        return None

    time_str = time_str.strip()
    original = time_str

    # Handle special cases
    if time_str.lower() in ["evening", "afternoon", "morning"]:
        logging.debug(f"Row {row_id}: Skipping text time value '{time_str}'")
        return None

    # Parse HH:MM format
    try:
        parts = time_str.split(":")
        if len(parts) == 2:
            hour = int(parts[0])
            minute = int(parts[1])

            if hour > 23 or minute > 59:
                logging.warning(
                    f"Row {row_id}: Invalid time value '{original}' (hour > 23 or minute > 59)"
                )
                return None

            return dt_time(hour, minute)
    except (ValueError, IndexError) as e:
        logging.warning(f"Row {row_id}: Could not parse time '{original}': {e}")

    return None


def parse_date(date_str, row_id=None):
    """
    Parse date strings in YYYY-MM-DD format.
    Returns None if empty or cannot parse.
    """
    if not date_str or date_str.strip() == "":
        return None

    try:
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError as e:
        logging.warning(f"Row {row_id}: Could not parse date '{date_str}': {e}")
        return None


def parse_coordinates(location_notes):
    """
    Extract latitude and longitude from location notes if present.
    Looks for patterns like: "31.75942197504869, -106.49579584576844"
    Returns tuple of (latitude, longitude) or (None, None) if not found.
    """
    if not location_notes or location_notes.strip() == "":
        return None, None

    # Match decimal coordinates pattern (handles negative values)
    # Pattern: optional text, then lat, comma, optional space, lon
    pattern = r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)"
    match = re.search(pattern, location_notes)

    if match:
        try:
            lat = float(match.group(1))
            lon = float(match.group(2))

            # Validate coordinate ranges
            if -90 <= lat <= 90 and -180 <= lon <= 180:
                logging.debug(f"Parsed coordinates: ({lat}, {lon})")
                return lat, lon
            else:
                logging.warning(f"Coordinates out of valid range: ({lat}, {lon})")
        except ValueError as e:
            logging.warning(f"Could not parse coordinates from '{location_notes}': {e}")

    return None, None


def parse_boolean(value):
    """
    Parse Yes/No/Query into boolean.
    'Yes' -> True, 'No' -> False, anything else -> None
    """
    if not value or value.strip() == "":
        return None

    value = value.strip().lower()
    if value == "yes":
        return True
    elif value == "no":
        return False
    return None


def parse_subjects(subjects_str):
    """
    Parse subjects string into a list of names.
    Splits by commas and strips whitespace.
    Returns empty list if input is empty.
    """

    # Subjects are in the "Subject" field, separated by a comma or by an ampersand
    if not subjects_str or subjects_str.strip() == "":
        return []
    return [name.strip() for name in re.split(r",|&", subjects_str) if name.strip()]


def parse_operatives(operative_str):
    """
    Parse operatives string into a list of names.
    Splits by commas and strips whitespace.
    Returns empty list if input is empty.
    """

    # Operatives are in the "Operative" field, separated by a comma or by an ampersand
    if not operative_str or operative_str.strip() == "":
        return []
    return [name.strip() for name in re.split(r",|&", operative_str) if name.strip()]


def load_crosswalk_data(crosswalk_file):
    """
    Load location crosswalk data from CSV file.
    Returns a dictionary keyed by (location_name, locality) with coordinate and visit data.
    """
    crosswalk = {}

    if not crosswalk_file or not os.path.exists(crosswalk_file):
        logging.info("No crosswalk file provided or file not found")
        return crosswalk

    logging.info(f"Loading crosswalk data from {crosswalk_file}")

    with open(crosswalk_file, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)

        for row in reader:
            location_name = row.get("Location Name", "").strip() or None
            locality = row.get("Locality", "").strip() or None
            street_address = row.get("Street Address", "").strip() or None

            # Parse coordinates
            try:
                longitude = (
                    float(row.get("Longitude", ""))
                    if row.get("Longitude", "").strip()
                    else None
                )
                latitude = (
                    float(row.get("Latitude", ""))
                    if row.get("Latitude", "").strip()
                    else None
                )
            except (ValueError, AttributeError):
                longitude = None
                latitude = None

            # Parse visits - look for column with "Visits" in the name
            visits = None
            for col in row.keys():
                if "Visits" in col or "visits" in col:
                    try:
                        visits = int(row[col]) if row[col].strip() else None
                    except (ValueError, AttributeError):
                        visits = None
                    break

            # Store with multiple keys for flexible matching
            if location_name and locality:
                key = (location_name, locality)
                crosswalk[key] = {
                    "latitude": latitude,
                    "longitude": longitude,
                    "visits": visits,
                    "street_address": street_address,
                }
                logging.debug(
                    f"Crosswalk: {location_name}, {locality} -> lat={latitude}, lon={longitude}, visits={visits}"
                )

            # Also store by location name only for fallback matching
            if location_name:
                key = (location_name, None)
                if key not in crosswalk:  # Don't overwrite more specific entries
                    crosswalk[key] = {
                        "latitude": latitude,
                        "longitude": longitude,
                        "visits": visits,
                        "street_address": street_address,
                    }

    logging.info(f"Loaded {len(crosswalk)} location entries from crosswalk file")
    return crosswalk


def get_or_create_location(
    cursor,
    locality,
    street_address,
    location_name,
    location_type,
    location_notes,
    latitude=None,
    longitude=None,
    visits=None,
    enable_geocoding=False,
):
    """
    Get existing location ID or create new location and return its ID.
    If coordinates are not provided and geocoding is enabled, attempts to
    geocode the location using a hierarchical approach.
    Optionally tracks visit count if provided.
    """
    # Check if location exists
    cursor.execute(
        f"""
        SELECT id, latitude, longitude FROM {SCHEMA_NAME}.locations
        WHERE locality IS NOT DISTINCT FROM %s
        AND street_address IS NOT DISTINCT FROM %s
        AND location_name IS NOT DISTINCT FROM %s
    """,
        (locality or None, street_address or None, location_name or None),
    )

    result = cursor.fetchone()
    if result:
        location_id = result[0]
        existing_lat = result[1]
        existing_lon = result[2]

        # Update coordinates if provided and not already set
        updates = []
        params = []
        if latitude is not None and longitude is not None:
            if existing_lat is None and existing_lon is None:
                updates.append("latitude = %s, longitude = %s")
                params.extend([latitude, longitude])

        # Update visits if provided
        if visits is not None:
            updates.append("visits = %s")
            params.append(visits)

        if updates:
            params.append(location_id)
            cursor.execute(
                f"""
                UPDATE {SCHEMA_NAME}.locations
                SET {", ".join(updates)}
                WHERE id = %s
            """,
                params,
            )
            if latitude is not None and longitude is not None and existing_lat is None:
                logging.info(
                    f"Location {location_id}: Added coordinates ({latitude}, {longitude})"
                )
            if visits is not None:
                logging.info(f"Location {location_id}: Set visits to {visits}")
        # If coordinates still missing and geocoding is enabled, try to geocode
        elif existing_lat is None and existing_lon is None and enable_geocoding:
            coords = geocode_location(
                locality=locality,
                street_address=street_address,
                location_name=location_name,
                allowed_states=ALLOWED_STATES,
            )
            if coords:
                latitude, longitude = coords
                cursor.execute(
                    f"""
                    UPDATE {SCHEMA_NAME}.locations
                    SET latitude = %s, longitude = %s
                    WHERE id = %s
                """,
                    (latitude, longitude, location_id),
                )
                logging.info(
                    f"Location {location_id}: Geocoded to ({latitude}, {longitude})"
                )

        logging.debug(
            f"Location found: {locality} / {location_name} (ID: {location_id})"
        )
        return location_id

    # If creating new location and no coordinates provided, try geocoding
    if latitude is None and longitude is None and enable_geocoding:
        coords = geocode_location(
            locality=locality,
            street_address=street_address,
            location_name=location_name,
            allowed_states=ALLOWED_STATES,
        )
        if coords:
            latitude, longitude = coords
            logging.info(
                f"Geocoded new location: {locality} -> ({latitude}, {longitude})"
            )

    # Create new location
    cursor.execute(
        f"""
        INSERT INTO {SCHEMA_NAME}.locations (locality, street_address, location_name, location_type, location_notes, latitude, longitude, visits)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """,
        (
            locality or None,
            street_address or None,
            location_name or None,
            location_type or None,
            location_notes or None,
            latitude,
            longitude,
            visits,
        ),
    )

    location_id = cursor.fetchone()[0]
    coord_str = f" at ({latitude}, {longitude})" if latitude and longitude else ""
    logging.info(
        f"New location created: {locality} / {location_name} (ID: {location_id}){coord_str}"
    )
    return location_id


def get_or_create_subjects(cursor, people_list):
    """
    Get existing people IDs or create new people and return their IDs. Names come as
    First Name Last Name and need to be parsed into first_name and last_name fields.
    """
    people_ids = []

    for full_name in people_list:
        name_parts = full_name.split()
        if len(name_parts) < 2:
            logging.warning(f"Invalid name format: '{full_name}'")
            continue

        first_name = " ".join(name_parts[:-1])
        last_name = name_parts[-1]

        # Check if person exists
        cursor.execute(
            f"""
            SELECT id FROM {SCHEMA_NAME}.people 
            WHERE first_name = %s AND last_name = %s
        """,
            (first_name, last_name),
        )

        result = cursor.fetchone()
        if result:
            person_id = result[0]
            logging.debug(f"Person found: {full_name} (ID: {person_id})")
        else:
            # Create new person
            cursor.execute(
                f"""
                INSERT INTO {SCHEMA_NAME}.people (first_name, last_name)
                VALUES (%s, %s)
                RETURNING id
            """,
                (first_name, last_name),
            )
            person_id = cursor.fetchone()[0]
            logging.info(f"New person created: {full_name} (ID: {person_id})")

        people_ids.append(person_id)

    return people_ids


def get_or_create_operatives(cursor, operative_list):
    """
    Get existing operative IDs or create new operatives and return their IDs. Names come as
    First Name Last Name and need to be parsed into first_name and last_name fields.
    """
    operative_ids = []

    for full_name in operative_list:
        name_parts = full_name.split()
        if len(name_parts) < 2:
            logging.warning(f"Invalid name format: '{full_name}'")
            continue

        first_name = " ".join(name_parts[:-1])
        last_name = name_parts[-1]

        # Check if operative exists
        cursor.execute(
            f"""
            SELECT id FROM {SCHEMA_NAME}.operatives 
            WHERE first_name = %s AND last_name = %s
        """,
            (first_name, last_name),
        )

        result = cursor.fetchone()
        if result:
            operative_id = result[0]
            logging.debug(f"Operative found: {full_name} (ID: {operative_id})")
        else:
            # Create new operative
            cursor.execute(
                f"""
                INSERT INTO {SCHEMA_NAME}.operatives (first_name, last_name)
                VALUES (%s, %s)
                RETURNING id
            """,
                (first_name, last_name),
            )
            operative_id = cursor.fetchone()[0]
            logging.info(f"New operative created: {full_name} (ID: {operative_id})")

        operative_ids.append(operative_id)

    return operative_ids


def load_data(csv_file, crosswalk_file=None, enable_geocoding=False):
    """
    Load data from CSV file into Postgres database.
    Optionally uses a crosswalk file to enrich location data with coordinates and visits.
    Geocoding is disabled by default and can be enabled with enable_geocoding parameter.
    """
    log_path = setup_logging()
    logging.info(f"Starting data import from {csv_file}")
    logging.info(f"Log file: {log_path}")
    logging.info(
        f"Database: {DB_CONFIG['dbname']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}"
    )
    logging.info(f"Geocoding enabled: {enable_geocoding}")
    if enable_geocoding and ALLOWED_STATES:
        logging.info(f"Geocoding restricted to states: {', '.join(ALLOWED_STATES)}")

    # Load crosswalk data if provided
    crosswalk = load_crosswalk_data(crosswalk_file)

    conn = None
    stats = {
        "activities_processed": 0,
        "activities_inserted": 0,
        "locations_created": 0,
        "locations_geocoded": 0,
        "locations_enriched_from_crosswalk": 0,
        "activity_locations_created": 0,
        "rows_skipped": 0,
        "errors": 0,
        "warnings": 0,
    }

    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        logging.info("Connected to database successfully")

        # Read CSV file
        with open(csv_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)

            row_num = 1  # Start at 1 for header
            for row in reader:
                row_num += 1

                # Skip if ID is empty
                if not row["ID"] or row["ID"].strip() == "":
                    logging.debug(f"Row {row_num}: Skipping row with empty ID")
                    stats["rows_skipped"] += 1
                    continue

                try:
                    activity_id = int(row["ID"])
                except ValueError as e:
                    logging.error(f"Row {row_num}: Invalid ID '{row['ID']}': {e}")
                    stats["errors"] += 1
                    continue

                stats["activities_processed"] += 1

                # Parse activity data
                activity_data = {
                    "id": activity_id,
                    "source": row["Source"] or None,
                    "operative": row["Operative"] or None,
                    "date": parse_date(row["Date"], activity_id),
                    "time": parse_time(row["Time"], activity_id),
                    "duration": parse_duration(row["Duration"], activity_id),
                    "roping": parse_boolean(row["Roping"]),
                    "mode": row["Mode"] or None,
                    "activity_notes": row["Activity Notes"] or None,
                    "subject": row["Subject"] or None,
                    "information": row["Information"] or None,
                    "information_type": row["Information Type"] or None,
                    "edited": parse_boolean(row["Edited"]),
                    "edit_type": row["Edit Type"] or None,
                }

                # Validate required fields
                if not activity_data["mode"]:
                    logging.warning(
                        f"Activity {activity_id}: Missing mode (activity type)"
                    )

                try:
                    # Insert activity
                    cursor.execute(
                        f"""
                        INSERT INTO {SCHEMA_NAME}.activities (
                            id, source, operative, date, time, duration, roping, mode,
                            activity_notes, subject, information, information_type, edited, edit_type
                        ) VALUES (
                            %(id)s, %(source)s, %(operative)s, %(date)s, %(time)s, %(duration)s, 
                            %(roping)s, %(mode)s, %(activity_notes)s, %(subject)s, %(information)s, 
                            %(information_type)s, %(edited)s, %(edit_type)s
                        )
                        ON CONFLICT (id) DO NOTHING
                    """,
                        activity_data,
                    )

                    if cursor.rowcount > 0:
                        stats["activities_inserted"] += 1
                        logging.debug(f"Activity {activity_id}: Inserted successfully")
                    else:
                        logging.warning(
                            f"Activity {activity_id}: Skipped (duplicate ID)"
                        )

                except psycopg2.Error as e:
                    logging.error(
                        f"Activity {activity_id}: Database error during insert: {e}"
                    )
                    stats["errors"] += 1
                    conn.rollback()
                    continue

                # Handle location data if present
                if any([row["Locality"], row["Street Address"], row["Location Name"]]):
                    try:
                        # Parse coordinates from location notes if present
                        latitude, longitude = parse_coordinates(row["Location Notes"])
                        visits = None

                        # Check crosswalk for enriched location data
                        if crosswalk:
                            location_name = row["Location Name"] or None
                            locality = row["Locality"] or None

                            # Try exact match first (location_name + locality)
                            crosswalk_key = (location_name, locality)
                            crosswalk_data = crosswalk.get(crosswalk_key)

                            # Fallback to location_name only
                            if not crosswalk_data and location_name:
                                crosswalk_key = (location_name, None)
                                crosswalk_data = crosswalk.get(crosswalk_key)

                            # Use crosswalk data if found
                            if crosswalk_data:
                                enriched = False
                                # Only use crosswalk coordinates if we don't have them from location notes
                                if latitude is None and longitude is None:
                                    latitude = crosswalk_data.get("latitude")
                                    longitude = crosswalk_data.get("longitude")
                                    if latitude and longitude:
                                        enriched = True
                                        logging.debug(
                                            f"Activity {activity_id}: Using crosswalk coordinates "
                                            f"for {location_name}, {locality}"
                                        )

                                visits = crosswalk_data.get("visits")
                                if visits:
                                    enriched = True
                                    logging.debug(
                                        f"Activity {activity_id}: Using crosswalk visits={visits} "
                                        f"for {location_name}, {locality}"
                                    )

                                if enriched:
                                    stats["locations_enriched_from_crosswalk"] += 1

                        # Track if we're creating a new location without coords (will be geocoded)
                        needs_geocoding = (
                            latitude is None and longitude is None and enable_geocoding
                        )

                        location_id = get_or_create_location(
                            cursor,
                            row["Locality"],
                            row["Street Address"],
                            row["Location Name"],
                            row["Location Type"],
                            row["Location Notes"],
                            latitude,
                            longitude,
                            visits,
                            enable_geocoding,
                        )

                        # Track geocoding stats
                        if needs_geocoding:
                            # Check if location was successfully geocoded
                            cursor.execute(
                                f"""
                                SELECT latitude, longitude FROM {SCHEMA_NAME}.locations
                                WHERE id = %s
                            """,
                                (location_id,),
                            )
                            loc_coords = cursor.fetchone()
                            if loc_coords and loc_coords[0] is not None:
                                stats["locations_geocoded"] += 1

                        # Link activity to location
                        cursor.execute(
                            f"""
                            INSERT INTO {SCHEMA_NAME}.activity_locations (activity_id, location_id)
                            VALUES (%s, %s)
                            ON CONFLICT DO NOTHING
                        """,
                            (activity_id, location_id),
                        )

                        if cursor.rowcount > 0:
                            stats["activity_locations_created"] += 1

                    except psycopg2.Error as e:
                        logging.error(
                            f"Activity {activity_id}: Error creating location: {e}"
                        )
                        stats["errors"] += 1
                        conn.rollback()
                        continue

                # Commit every 100 rows
                if stats["activities_processed"] % 100 == 0:
                    conn.commit()
                    logging.info(
                        f"Progress: Processed {stats['activities_processed']} activities..."
                    )

        # Final commit
        conn.commit()

        # Log summary
        logging.info("=" * 60)
        logging.info("Import completed successfully!")
        logging.info("=" * 60)
        logging.info(f"Activities processed: {stats['activities_processed']}")
        logging.info(f"Activities inserted: {stats['activities_inserted']}")
        logging.info(
            f"Activity-location links created: {stats['activity_locations_created']}"
        )
        logging.info(f"Rows skipped (empty ID): {stats['rows_skipped']}")
        logging.info(f"Errors encountered: {stats['errors']}")
        if crosswalk:
            logging.info(
                f"Locations enriched from crosswalk: {stats['locations_enriched_from_crosswalk']}"
            )
        if enable_geocoding:
            logging.info(f"Locations geocoded: {stats['locations_geocoded']}")

        # Get unique locations count
        cursor.execute(f"SELECT COUNT(DISTINCT id) FROM {SCHEMA_NAME}.locations")
        unique_locations = cursor.fetchone()[0]
        logging.info(f"Unique locations in database: {unique_locations}")

        # Get count of locations with coordinates
        cursor.execute(
            f"""
            SELECT COUNT(*) FROM {SCHEMA_NAME}.locations
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """
        )
        locations_with_coords = cursor.fetchone()[0]
        logging.info(f"Locations with coordinates: {locations_with_coords}")

        cursor.close()

        print(f"\nImport complete! See {log_path} for details.")

    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)
    except FileNotFoundError:
        logging.error(f"CSV file not found: {csv_file}")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Unexpected error: {e}", exc_info=True)
        if conn:
            conn.rollback()
        sys.exit(1)
    finally:
        if conn:
            conn.close()
            logging.info("Database connection closed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Load Pinkerton data from CSV into Postgres database.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s data/el_paso.csv
  %(prog)s data/el_paso.csv --crosswalk data/el_paso_update.csv
  %(prog)s data/el_paso.csv --crosswalk data/el_paso_update.csv --geocode
        """,
    )

    parser.add_argument(
        "csv_file", help="Path to the CSV file containing activity data"
    )

    parser.add_argument(
        "--crosswalk",
        dest="crosswalk_file",
        help="Path to crosswalk CSV file with location coordinates and visits data",
    )

    parser.add_argument(
        "--geocode",
        action="store_true",
        default=False,
        help="Enable geocoding for locations without coordinates (default: disabled)",
    )

    args = parser.parse_args()

    load_data(args.csv_file, args.crosswalk_file, args.geocode)
