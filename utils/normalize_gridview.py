#!/usr/bin/env python3
"""
Normalize a Tropy Grid View CSV export into the standard Pinkerton activity CSV format
used by load_data.py.

Handles:
- Column name remapping
- Date format conversion (M/D/YY → YYYY-MM-DD)
- Duration format conversion (HH:MM → XhYm)
- Locality + State combination
- Stripping brackets from street addresses
- Cleaning multiline values
"""

import csv
import sys
import re


def parse_date_mdy(date_str):
    """Convert M/D/YY date to YYYY-MM-DD. Assumes 1900s for years > 25."""
    if not date_str or not date_str.strip():
        return ""
    date_str = date_str.strip()
    try:
        parts = date_str.split("/")
        if len(parts) == 3:
            month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
            # Two-digit year: assume 1900s for anything > 25
            if year < 100:
                year = 1900 + year if year > 25 else 2000 + year
            return f"{year:04d}-{month:02d}-{day:02d}"
    except (ValueError, IndexError):
        pass
    return ""


def parse_duration_hhmm(duration_str):
    """Convert HH:MM duration to XhYm format."""
    if not duration_str or not duration_str.strip():
        return ""
    duration_str = duration_str.strip()
    try:
        parts = duration_str.split(":")
        if len(parts) == 2:
            hours, minutes = int(parts[0]), int(parts[1])
            parts_out = []
            if hours > 0:
                parts_out.append(f"{hours}h")
            if minutes > 0:
                parts_out.append(f"{minutes}m")
            return "".join(parts_out) if parts_out else ""
    except (ValueError, IndexError):
        pass
    return ""


def parse_time(time_str):
    """Convert H:MM or HH:MM to HH:MM format."""
    if not time_str or not time_str.strip():
        return ""
    time_str = time_str.strip()
    try:
        parts = time_str.split(":")
        if len(parts) == 2:
            hour, minute = int(parts[0]), int(parts[1])
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return f"{hour:02d}:{minute:02d}"
    except (ValueError, IndexError):
        pass
    return ""


def clean_text(text):
    """Clean up multiline values and extra whitespace."""
    if not text:
        return ""
    # Replace newlines with spaces, collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()
    # Remove wrapping quotes that Tropy sometimes adds
    if text.startswith('"') and text.endswith('"'):
        text = text[1:-1].strip()
    return text


def clean_address(addr):
    """Remove brackets from street addresses like [Corner of X and Y]."""
    if not addr:
        return ""
    addr = addr.strip()
    if addr.startswith("[") and addr.endswith("]"):
        addr = addr[1:-1]
    return addr


def combine_locality(locality, state):
    """Combine locality and state into a single string."""
    locality = (locality or "").strip()
    state = (state or "").strip()
    # Normalize state abbreviations
    state = state.replace("N.J.", "NJ").replace("Nj", "NJ")
    if locality and state:
        # Don't duplicate if locality already contains state
        if f", {state}" in locality:
            return locality
        return f"{locality}, {state}"
    return locality or state or ""


def normalize(input_file, output_file):
    """Read Grid View CSV and write standard format CSV."""
    with open(input_file, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Standard output columns matching el_paso.csv / corn_exchange.csv
    output_fields = [
        "ID",
        "Source",
        "Operative",
        "Date",
        "Time",
        "Duration",
        "Activity",
        "Mode",
        "Activity Notes",
        "Subject",
        "Locality",
        "Street Address",
        "Location Name",
        "Location Type",
        "Location Notes",
        "Information",
        "Information Type",
        "Edited",
        "Edit Type",
    ]

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=output_fields)
        writer.writeheader()

        for row in rows:
            # Combine location notes from both fields
            loc_notes_parts = []
            notes = clean_text(row.get("notes", ""))
            loc_info = clean_text(row.get("location information", ""))
            if notes and notes != "#NAME?":
                loc_notes_parts.append(notes)
            if loc_info:
                loc_notes_parts.append(loc_info)
            location_notes = "; ".join(loc_notes_parts) if loc_notes_parts else ""

            out = {
                # Drop Tropy IDs — they're internal and would collide with existing data
                "ID": "",
                "Source": clean_text(row.get("tropy.title", "")),
                "Operative": clean_text(row.get("operative", "")),
                "Date": parse_date_mdy(row.get("date", "")),
                "Time": parse_time(row.get("Time Start", "")),
                "Duration": parse_duration_hhmm(row.get("Duration (HH:MM)", "")),
                "Activity": clean_text(row.get("Activity", "")),
                "Mode": clean_text(row.get("Mode", "")),
                "Activity Notes": clean_text(row.get("activity notes", "")),
                "Subject": clean_text(row.get("subject", "")),
                "Locality": combine_locality(
                    row.get("locality", ""), row.get("State", "")
                ),
                "Street Address": clean_address(
                    clean_text(row.get("Street Address copy", ""))
                ),
                "Location Name": clean_text(row.get("name", "")),
                "Location Type": clean_text(
                    row.get(
                        "Location Type (from data) copy (from Street Address copy)", ""
                    )
                ),
                "Location Notes": location_notes,
                "Information": clean_text(row.get("Information", "")),
                "Information Type": clean_text(row.get("Information Type", "")),
                "Edited": clean_text(row.get("Edited", "")),
                "Edit Type": clean_text(row.get("Edit Type", "")),
            }
            writer.writerow(out)

    print(f"Normalized {len(rows)} rows → {output_file}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <input.csv> <output.csv>")
        sys.exit(1)
    normalize(sys.argv[1], sys.argv[2])
