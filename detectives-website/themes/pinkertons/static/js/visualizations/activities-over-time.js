// Activities Over Time Visualization
// Shows temporal distribution of Pinkerton detective activities

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

export async function createVisualization(data) {
  // Parse dates and group by month
  const activitiesWithDates = data
    .filter(d => d.date)
    .map(d => ({
      ...d,
      dateObj: new Date(d.date.split('T')[0])
    }));

  return Plot.plot({
    marginLeft: 60,
    marginBottom: 60,
    width: Math.min(1000, window.innerWidth - 100),
    height: 400,
    x: {
      type: "time",
      label: "Date",
      tickFormat: "%b %Y"
    },
    y: {
      grid: true,
      label: "Number of Activities"
    },
    marks: [
      Plot.rectY(activitiesWithDates,
        Plot.binX(
          {y: "count"},
          {x: "dateObj", interval: "month", fill: "#9c1b1b", tip: true}
        )
      ),
      Plot.ruleY([0])
    ]
  });
}
