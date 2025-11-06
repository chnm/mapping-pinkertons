#!/usr/bin/env uv run
"""
Load El Paso surveillance data from CSV into Postgres database.
"""

import csv
import psycopg2
from datetime import datetime, time as dt_time
import re
import sys
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database connection parameters from environment
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "elpaso"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
}


# Setup logging
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


def get_or_create_location(
    cursor, locality, street_address, location_name, location_type, location_notes
):
    """
    Get existing location ID or create new location and return its ID.
    """
    # Check if location exists
    cursor.execute(
        """
        SELECT id FROM locations 
        WHERE locality IS NOT DISTINCT FROM %s 
        AND street_address IS NOT DISTINCT FROM %s 
        AND location_name IS NOT DISTINCT FROM %s
    """,
        (locality or None, street_address or None, location_name or None),
    )

    result = cursor.fetchone()
    if result:
        logging.debug(f"Location found: {locality} / {location_name} (ID: {result[0]})")
        return result[0]

    # Create new location
    cursor.execute(
        """
        INSERT INTO locations (locality, street_address, location_name, location_type, location_notes)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """,
        (
            locality or None,
            street_address or None,
            location_name or None,
            location_type or None,
            location_notes or None,
        ),
    )

    location_id = cursor.fetchone()[0]
    logging.info(
        f"New location created: {locality} / {location_name} (ID: {location_id})"
    )
    return location_id


def load_data(csv_file):
    """
    Load data from CSV file into Postgres database.
    """
    log_path = setup_logging()
    logging.info(f"Starting data import from {csv_file}")
    logging.info(f"Log file: {log_path}")
    logging.info(
        f"Database: {DB_CONFIG['dbname']}@{DB_CONFIG['host']}:{DB_CONFIG['port']}"
    )

    conn = None
    stats = {
        "activities_processed": 0,
        "activities_inserted": 0,
        "locations_created": 0,
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
                        """
                        INSERT INTO activities (
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
                        location_id = get_or_create_location(
                            cursor,
                            row["Locality"],
                            row["Street Address"],
                            row["Location Name"],
                            row["Location Type"],
                            row["Location Notes"],
                        )

                        # Link activity to location
                        cursor.execute(
                            """
                            INSERT INTO activity_locations (activity_id, location_id)
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

        # Get unique locations count
        cursor.execute("SELECT COUNT(DISTINCT id) FROM locations")
        unique_locations = cursor.fetchone()[0]
        logging.info(f"Unique locations in database: {unique_locations}")

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
    if len(sys.argv) != 2:
        print("Usage: python load_data.py <csv_file>")
        sys.exit(1)

    csv_file = sys.argv[1]
    load_data(csv_file)
