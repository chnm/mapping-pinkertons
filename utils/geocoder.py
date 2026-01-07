#!/usr/bin/env uv run
# /// script
# dependencies = [
#   "requests",
# ]
# ///
"""
Geocoding utilities for location lookup.
Uses OpenStreetMap Nominatim API for geocoding.
"""

import time
import logging
import requests
from typing import Optional, Tuple
from functools import lru_cache

# Nominatim API configuration
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "Pinkerton-Detectives-Project/1.0"
REQUEST_DELAY = 1.0  # Nominatim requires max 1 request per second

# Last request timestamp for rate limiting
_last_request_time = 0


def _rate_limit():
    """
    Enforce rate limiting for Nominatim API (1 request per second).
    """
    global _last_request_time
    current_time = time.time()
    time_since_last = current_time - _last_request_time

    if time_since_last < REQUEST_DELAY:
        sleep_time = REQUEST_DELAY - time_since_last
        logging.debug(f"Rate limiting: sleeping for {sleep_time:.2f}s")
        time.sleep(sleep_time)

    _last_request_time = time.time()


@lru_cache(maxsize=1000)
def _geocode_query(
    query: str, allowed_states: Optional[Tuple[str, ...]] = None
) -> Optional[Tuple[float, float]]:
    """
    Geocode a single query string using Nominatim.
    Results are cached to avoid repeated API calls.

    Args:
        query: Search query string
        allowed_states: Tuple of allowed state codes (e.g., ('TX', 'AZ', 'NM'))

    Returns:
        Tuple of (latitude, longitude) or None if not found
    """
    _rate_limit()

    params = {
        "q": query,
        "format": "json",
        "limit": 5,  # Get more results to filter by state
        "addressdetails": 1,
        "countrycodes": "us",  # Limit to USA
    }

    headers = {"User-Agent": USER_AGENT}

    try:
        logging.debug(f"Geocoding query: '{query}'")
        response = requests.get(
            NOMINATIM_URL, params=params, headers=headers, timeout=10
        )
        response.raise_for_status()

        results = response.json()

        if results and len(results) > 0:
            # If states are specified, filter results by state
            if allowed_states:
                for result in results:
                    address = result.get("address", {})
                    state = address.get("state")

                    # Check if state matches allowed states (case-insensitive)
                    # Handle both abbreviations (TX) and full names (Texas)
                    state_abbrevs = {
                        "texas": "TX",
                        "tx": "TX",
                        "arizona": "AZ",
                        "az": "AZ",
                        "new mexico": "NM",
                        "nm": "NM",
                    }

                    if state:
                        normalized_state = state_abbrevs.get(
                            state.lower(), state.upper()
                        )
                        if normalized_state in allowed_states:
                            lat = float(result["lat"])
                            lon = float(result["lon"])

                            if -90 <= lat <= 90 and -180 <= lon <= 180:
                                logging.info(
                                    f"Geocoded '{query}' -> ({lat}, {lon}) in {state}"
                                )
                                return (lat, lon)

                logging.warning(
                    f"No results in allowed states {allowed_states} for '{query}'"
                )
                return None
            else:
                # No state restriction
                lat = float(results[0]["lat"])
                lon = float(results[0]["lon"])

                # Validate coordinate ranges
                if -90 <= lat <= 90 and -180 <= lon <= 180:
                    logging.info(f"Geocoded '{query}' -> ({lat}, {lon})")
                    return (lat, lon)
                else:
                    logging.warning(
                        f"Invalid coordinates for '{query}': ({lat}, {lon})"
                    )
        else:
            logging.debug(f"No results found for '{query}'")

    except requests.exceptions.RequestException as e:
        logging.error(f"Geocoding request failed for '{query}': {e}")
    except (ValueError, KeyError) as e:
        logging.error(f"Failed to parse geocoding response for '{query}': {e}")

    return None


def geocode_location(
    locality: Optional[str] = None,
    street_address: Optional[str] = None,
    location_name: Optional[str] = None,
    allowed_states: Optional[Tuple[str, ...]] = None,
) -> Optional[Tuple[float, float]]:
    """
    Geocode a location using a hierarchical approach.

    Strategy:
    1. If street address + locality provided: try precise address lookup
    2. If location name + locality provided: try location name lookup
    3. If only locality provided: fall back to locality lookup

    Args:
        locality: City, state, or general area (e.g., "El Paso, TX")
        street_address: Street address (e.g., "606 West Missouri")
        location_name: Name of specific location (e.g., "Suzie Elliott's Apartment House")
        allowed_states: Tuple of allowed state codes (e.g., ('TX', 'AZ', 'NM'))

    Returns:
        Tuple of (latitude, longitude) or None if geocoding fails
    """

    # Strategy 1: Try full address (most precise)
    if street_address and locality:
        query = f"{street_address}, {locality}"
        result = _geocode_query(query, allowed_states)
        if result:
            logging.info(f"Geocoded with full address: {query}")
            return result

    # Strategy 2: Try location name + locality
    if location_name and locality:
        query = f"{location_name}, {locality}"
        result = _geocode_query(query, allowed_states)
        if result:
            logging.info(f"Geocoded with location name: {query}")
            return result

    # Strategy 3: Fall back to just locality
    if locality:
        # Clean up locality string - handle common patterns
        query = locality.strip()
        result = _geocode_query(query, allowed_states)
        if result:
            logging.info(f"Geocoded with locality: {query}")
            return result

    # Strategy 4: Try street address alone if locality lookup failed
    if street_address:
        query = street_address.strip()
        result = _geocode_query(query, allowed_states)
        if result:
            logging.info(f"Geocoded with street address only: {query}")
            return result

    logging.warning(
        f"Could not geocode location: locality={locality}, "
        f"street={street_address}, name={location_name}"
    )
    return None


def clear_geocoding_cache():
    """
    Clear the geocoding cache.
    Useful for testing or if you want to force fresh lookups.
    """
    _geocode_query.cache_clear()
    logging.info("Geocoding cache cleared")


if __name__ == "__main__":
    # Simple test
    logging.basicConfig(level=logging.INFO)

    # Test with a known location constrained to TX, AZ, NM
    result = geocode_location(
        locality="El Paso, TX",
        street_address="606 West Missouri",
        location_name="Suzie Elliott's Apartment House",
        allowed_states=("TX", "AZ", "NM"),
    )

    if result:
        print(f"Success! Coordinates: {result}")
    else:
        print("Failed to geocode")
