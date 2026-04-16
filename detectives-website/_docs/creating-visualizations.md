# Creating Visualizations (Views)

This guide covers how to add new comparative visualizations to the Views section of the site.

## Overview

Each visualization appears as a card on the Views list page (`/visualizations/`) and has its own single page that renders the same chart type once per investigation, enabling comparison across cases.

## File Structure

```
content/visualizations/
├── _index.md                # Views list page
├── dashboard.md             # Surveillance Activity Dashboard (hidden from list, in nav)
├── activity-types.md        # Activity Types comparison
├── daily-activity.md        # Daily Activity timeline comparison
├── location-types.md        # Location Types comparison
├── workload.md              # Operative Workload comparison
└── top-subjects.md          # Top Subjects comparison

static/images/viz-thumbnails/
└── placeholder.svg          # Default thumbnail
```

## Adding a New Visualization

### Step 1: Create the Content Page

Create a new markdown file in `content/visualizations/`:

```yaml
---
title: "Your Visualization Title"
description: "A one-sentence description shown on the Views list page"
vizType: "your-viz-type"
thumbnail: "/images/viz-thumbnails/placeholder.svg"
weight: 6
---

Optional prose content shown below the charts on the single page.
```

**Frontmatter fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Display title on list and single pages |
| `description` | Yes | Summary shown on the list card |
| `vizType` | Yes | Key that maps to a chart renderer in `single.html` |
| `thumbnail` | No | Path to thumbnail image (defaults to placeholder) |
| `weight` | Yes | Sort order on the list page (lower = first) |
| `hidden` | No | Set to `true` to hide from the list page (used by dashboard) |

### Step 2: Add the Chart Renderer

Open `themes/pinkertons/layouts/visualizations/single.html` and add a new entry to the `renderers` object. Each renderer is a function that receives an array of activity objects (already filtered to one investigation) and returns an Observable Plot element.

```javascript
const renderers = {
  // ... existing renderers ...

  'your-viz-type': (data) => {
    // Process data
    const processed = /* ... */;
    if (processed.length === 0) return null;

    // Return an Observable Plot
    return Plot.plot({
      marginLeft: 140,
      marginBottom: 40,
      width: chartWidth(),
      height: 300,
      x: { grid: true, label: "X Axis Label" },
      y: { label: null },
      marks: [
        Plot.barX(processed, { x: "count", y: "value", fill: ACCENT, sort: { y: "-x" }, tip: true }),
        Plot.ruleX([0]),
      ],
    });
  },
};
```

The `vizType` value in the frontmatter must exactly match the key in the `renderers` object.

### Step 3: Add a Thumbnail (Optional)

Place a thumbnail image at `static/images/viz-thumbnails/your-viz-type.png` (or `.svg`). Update the frontmatter:

```yaml
thumbnail: "/images/viz-thumbnails/your-viz-type.png"
```

Thumbnails display at a 2:1 aspect ratio on the list page. Recommended size: 400x200px.

## How the Single Page Works

The `single.html` template:

1. Fetches all activities from the API
2. Iterates over the `INVESTIGATIONS` object (defined in the template)
3. Filters activities by `d.investigation === key` for each investigation
4. Calls the matching renderer function with the filtered data
5. Wraps each chart in a card with the investigation name and activity count

To add a new investigation, add it to the `INVESTIGATIONS` object at the top of the script block:

```javascript
const INVESTIGATIONS = {
  'el-paso':  'El Paso Labor Disputes',
  'nyc':      'Robbery of the Corn Exchange Bank',
  'hobart':   'Murder of William Hobart',
  'atlanta':  'Atlanta Laundry Thefts',
  'new-key':  'New Investigation Name',
};
```

## Available Helper Functions

These are defined in the `single.html` script block and available to all renderers:

| Function | Description |
|----------|-------------|
| `countBy(data, field)` | Groups and counts by a field, returns `[{value, count}]` sorted descending |
| `chartWidth()` | Returns responsive chart width (max 800px) |

## API Data Shape

Each activity object from the API:

```json
{
  "id": 1,
  "investigation": "el-paso",
  "operative": "#43",
  "date": "1939-07-27T00:00:00Z",
  "time": "12:00:00.000000",
  "activity": "Search",
  "activity_notes": "...",
  "subject": "Pancho Martinez",
  "locations": [{
    "id": 3,
    "locality": "Smeltertown_Upper",
    "location_type": "Neighborhood",
    "location_name": "El Ato",
    "street_address": null,
    "latitude": 31.78052,
    "longitude": -106.52065,
    "visits": 5
  }]
}
```

## Observable Plot Reference

Charts use [Observable Plot](https://observablehq.com/plot/) v0.6, imported as an ES module. Common mark types:

- `Plot.barX()` — horizontal bars (good for ranked lists)
- `Plot.barY()` — vertical bars
- `Plot.rectY()` with `Plot.binX()` — histograms / timelines
- `Plot.dot()` — scatter plots
- `Plot.line()` — line charts
- `Plot.ruleX([0])` / `Plot.ruleY([0])` — axis baseline

Full docs: https://observablehq.com/plot/marks

## Dashboard vs Views

The **Dashboard** (`/visualizations/dashboard/`) is a single-investigation deep-dive with interactive filters, KPIs, and a data table. It's accessed via the "Surveillance Activity" nav link.

The **Views** page (`/visualizations/`) is for comparative analysis — the same chart type shown side by side for each investigation, with no interactive filtering.
