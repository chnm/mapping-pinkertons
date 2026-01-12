// Location Frequency Visualization
// Shows which locations received the most attention from Pinkerton detectives

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

export async function createVisualization(data) {
  // Count activities by location
  const locationCounts = {};
  data.forEach(d => {
    if (d.locations && d.locations.length > 0) {
      const locName = d.locations[0].location_name || d.locations[0].locality || 'Unknown';
      locationCounts[locName] = (locationCounts[locName] || 0) + 1;
    }
  });

  const locationData = Object.entries(locationCounts)
    .map(([name, count]) => ({ location: name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15); // Top 15 locations

  return Plot.plot({
    marginLeft: 200,
    marginBottom: 60,
    width: Math.min(1000, window.innerWidth - 100),
    height: 500,
    x: {
      grid: true,
      label: "Number of Activities"
    },
    y: {
      label: null
    },
    marks: [
      Plot.barX(locationData, {
        x: "count",
        y: "location",
        fill: "#9c1b1b",
        sort: {y: "-x"},
        tip: true
      }),
      Plot.ruleX([0])
    ]
  });
}
