(() => {
  const ACTIVITIES_ENDPOINT = 'https://data.chnm.org/pinkertons/activities';
  const DEFAULT_PAGE_SIZE = 500;

  window.fetchPinkertonActivities = async function fetchPinkertonActivities({
    locationId = null,
    pageSize = DEFAULT_PAGE_SIZE,
    signal,
  } = {}) {
    if (!Number.isInteger(pageSize) || pageSize <= 0) {
      throw new TypeError('pageSize must be a positive integer');
    }

    const activities = [];
    const seenActivityIds = new Set();
    let offset = 0;

    while (true) {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
      });
      if (locationId) {
        params.set('location_id', String(locationId));
      }

      const response = await fetch(`${ACTIVITIES_ENDPOINT}?${params}`, { signal });
      if (!response.ok) {
        throw new Error(`Pinkertons API request failed with HTTP ${response.status}`);
      }

      const page = await response.json();
      if (!Array.isArray(page)) {
        throw new TypeError('Pinkertons API returned a non-array response');
      }
      if (page.length > pageSize) {
        throw new Error('Pinkertons API returned more rows than the requested limit');
      }
      for (const activity of page) {
        if (!activity || activity.id == null) {
          throw new TypeError('Pinkertons API returned an activity without an ID');
        }
        if (seenActivityIds.has(activity.id)) {
          throw new Error('Pinkertons API pagination returned a duplicate activity');
        }
        seenActivityIds.add(activity.id);
      }

      activities.push(...page);
      if (page.length < pageSize) {
        return activities;
      }

      offset += page.length;
    }
  };
})();
