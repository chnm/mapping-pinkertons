# Adding Visualizations to the Site

This guide explains how to add new data visualizations to the Mapping the Pinkertons website.

## Overview

The visualizations section uses:
- **Hugo** for content management and templating
- **Observable Plot** for creating interactive charts
- **Markdown files** for content and configuration
- **API data** from the Pinkerton activities endpoint

## File Structure

```
content/
  visualizations/
    _index.md                      # Main visualizations page
    activities-over-time.md        # Individual visualization
    location-frequency.md          # Individual visualization
    operative-activity.md          # Individual visualization
    time-of-day.md                 # Individual visualization
    [your-new-viz].md              # Add new ones here

themes/pinkertons/
  layouts/
    visualizations/
      list.html                    # Template for visualizations index
      single.html                  # Template for individual visualizations
  static/
    js/
      visualizations/
        activities-over-time.js    # Visualization plotting code
        location-frequency.js      # Visualization plotting code
        operative-activity.js      # Visualization plotting code
        time-of-day.js             # Visualization plotting code
        [your-new-viz].js          # Add your JS file here
```

## Adding a New Visualization

### Step 1: Create the Content File

Create a new markdown file in `/content/visualizations/` with a descriptive filename (e.g., `location-types.md`).

### Step 2: Add Frontmatter

At the top of your markdown file, add YAML frontmatter with the following fields:

```yaml
---
title: "Your Visualization Title"
description: "A brief description that appears on the visualizations index page"
icon: "chart-bar"
vizType: "your-viz-type"
location: "El Paso, Texas"
dataSource: "Description of where the data comes from"
weight: 5
---
```

#### Frontmatter Fields Explained

- **title** (required): The main heading for your visualization page
- **description** (required): Brief summary shown on the index page (1-2 sentences)
- **icon** (optional): Icon to display on the index card. Options:
  - `chart-bar` - Bar chart icon
  - `clock` - Clock icon (good for time-based visualizations)
  - `calendar` - Calendar icon (good for date-based visualizations)
  - `location` - Map pin icon (good for location-based visualizations)
- **vizType** (required): Unique identifier for your visualization type (lowercase, hyphenated)
- **location** (required): The geographic location for this visualization (e.g., "El Paso, Texas", "Chicago, Illinois"). Visualizations are grouped by location on the index page.
- **dataSource** (optional): Information about the data source, appears at bottom of page
- **weight** (optional): Controls ordering within each location group (lower numbers appear first)

### Step 3: Write Analysis Content

Below the frontmatter, write your analysis in markdown. This content appears below the visualization on the page.

**Example:**

```markdown
---
title: "Location Types Distribution"
description: "Analyze the types of locations most frequently surveilled by Pinkerton detectives"
icon: "chart-bar"
vizType: "location-types"
location: "El Paso, Texas"
dataSource: "Pinkerton detective reports from El Paso operations"
weight: 5
---

This visualization shows the distribution of different location types where Pinkerton detectives conducted surveillance operations.

## Key Observations

The breakdown by location type reveals:

- **Social Spaces**: Bars, cafés, and poolrooms were heavily monitored
- **Transportation**: Train stations and bus stops were key surveillance points
- **Residential**: Specific addresses received targeted surveillance

## Historical Context

Understanding which types of locations were surveilled helps us see:
- Where labor organizers and activists congregated
- The social geography of surveillance operations
- How Pinkertons targeted specific types of urban spaces
```

### Step 4: Create the Visualization JavaScript File

Create a new JavaScript file in `/themes/pinkertons/static/js/visualizations/` with the same name as your `vizType` (e.g., `your-viz-type.js`).

**Template:**

```javascript
// Your Visualization Title
// Brief description of what this visualization shows

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

export async function createVisualization(data) {
  // Process your data
  const processedData = data.map(d => ({
    // Transform data as needed
  }));

  // Create and return the plot
  return Plot.plot({
    marginLeft: 60,
    marginBottom: 60,
    width: Math.min(1000, window.innerWidth - 100),
    height: 400,
    x: {
      label: "X Axis Label"
    },
    y: {
      grid: true,
      label: "Y Axis Label"
    },
    marks: [
      // Add your plot marks here
      Plot.ruleY([0])
    ]
  });
}
```

**Important:**
- The filename must match your `vizType` parameter exactly (e.g., `vizType: "location-types"` → `location-types.js`)
- You must export a function named `createVisualization`
- The function should accept the data as a parameter
- The function should return a Plot object

**Example** (`location-types.js`):

```javascript
// Location Types Distribution
// Shows the types of locations most frequently surveilled

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

export async function createVisualization(data) {
  // Count activities by location type
  const typeCounts = {};
  data.forEach(d => {
    if (d.locations && d.locations.length > 0) {
      const locType = d.locations[0].location_type || 'Unknown';
      typeCounts[locType] = (typeCounts[locType] || 0) + 1;
    }
  });

  const typeData = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return Plot.plot({
    marginLeft: 150,
    marginBottom: 60,
    width: Math.min(1000, window.innerWidth - 100),
    height: 400,
    x: {
      grid: true,
      label: "Number of Activities"
    },
    y: {
      label: null
    },
    marks: [
      Plot.barX(typeData, {
        x: "count",
        y: "type",
        fill: "#9c1b1b",
        sort: {y: "-x"},
        tip: true
      }),
      Plot.ruleX([0])
    ]
  });
}
```

## Available Visualization Types

The following visualization types are already implemented:

### 1. `activities-over-time`
- **Type**: Time series bar chart
- **Shows**: Number of activities per month
- **Use for**: Temporal patterns, campaign duration, operational intensity

### 2. `location-frequency`
- **Type**: Horizontal bar chart
- **Shows**: Top 15 most surveilled locations
- **Use for**: Geographic focus, surveillance priorities

### 3. `operative-activity`
- **Type**: Horizontal bar chart
- **Shows**: Top 10 operatives by activity count
- **Use for**: Workload distribution, operative specialization

### 4. `time-of-day`
- **Type**: Histogram
- **Shows**: Activities distributed by hour of day
- **Use for**: Daily surveillance patterns, shift analysis

## Observable Plot Resources

Observable Plot is a powerful JavaScript library for creating visualizations. Here are some helpful resources:

- **Documentation**: https://observablehq.com/plot/
- **Getting Started**: https://observablehq.com/plot/getting-started
- **Mark Types**: https://observablehq.com/plot/marks
- **Examples**: https://observablehq.com/plot/gallery

### Common Plot Types

**Bar Chart (Horizontal):**
```javascript
Plot.barX(data, {
  x: "value",
  y: "category",
  fill: "#9c1b1b",
  sort: {y: "-x"},
  tip: true
})
```

**Bar Chart (Vertical):**
```javascript
Plot.barY(data, {
  x: "category",
  y: "value",
  fill: "#9c1b1b",
  tip: true
})
```

**Line Chart:**
```javascript
Plot.line(data, {
  x: "date",
  y: "value",
  stroke: "#9c1b1b",
  tip: true
})
```

**Scatter Plot:**
```javascript
Plot.dot(data, {
  x: "xValue",
  y: "yValue",
  fill: "#9c1b1b",
  r: 3,
  tip: true
})
```

**Histogram:**
```javascript
Plot.rectY(data,
  Plot.binX(
    {y: "count"},
    {x: "value", fill: "#9c1b1b", tip: true}
  )
)
```

## Data Processing Tips

### Filtering Data
```javascript
const filteredData = data.filter(d => d.fieldName);
```

### Mapping/Transforming Data
```javascript
const transformed = data.map(d => ({
  ...d,
  newField: someTransformation(d.existingField)
}));
```

### Grouping and Counting
```javascript
const counts = {};
data.forEach(d => {
  const key = d.someField;
  counts[key] = (counts[key] || 0) + 1;
});

const countArray = Object.entries(counts)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count);
```

### Parsing Dates
```javascript
const withDates = data
  .filter(d => d.date)
  .map(d => ({
    ...d,
    dateObj: new Date(d.date.split('T')[0])
  }));
```

### Extracting Time Components
```javascript
const withTime = data
  .filter(d => d.time)
  .map(d => {
    const timeMatch = d.time.match(/(\d{2}):(\d{2})/);
    return timeMatch ? {
      ...d,
      hour: parseInt(timeMatch[1], 10),
      minute: parseInt(timeMatch[2], 10)
    } : null;
  })
  .filter(d => d !== null);
```

## Styling Guidelines

### Colors
Use the site's color scheme:
- **Primary accent**: `#9c1b1b` (crimson)
- **Gold**: `#d0a85c`
- **Steel**: `#44697d`
- **Text dark**: `#2d3439`

### Dimensions
```javascript
Plot.plot({
  marginLeft: 60,        // Space for y-axis labels
  marginBottom: 60,      // Space for x-axis labels
  width: Math.min(1000, window.innerWidth - 100),  // Responsive width
  height: 400,           // Fixed height
  // ...
})
```

### Labels
- Always include axis labels
- Use clear, descriptive language
- Enable tooltips with `tip: true`

## Testing Your Visualization

1. Start your Hugo development server:
   ```bash
   hugo server -D
   ```

2. Navigate to `/visualizations` to see your new visualization card

3. Click through to the individual page to test the visualization

4. Check that:
   - The visualization renders without errors
   - The JavaScript module loads correctly (check browser console)
   - Data loads from the API correctly
   - The chart is responsive
   - Tooltips work when hovering
   - The analysis text displays properly

5. Debug tips:
   - Open browser developer tools (F12)
   - Check the Console tab for any JavaScript errors
   - Check the Network tab to verify the JS file loads
   - Verify the filename matches your `vizType` exactly

