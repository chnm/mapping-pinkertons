// Time of Day Visualization
// Shows when during the day Pinkerton detectives conducted surveillance

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

export async function createVisualization(data) {
  // Extract hour from time field
  const activitiesWithTime = data
    .filter(d => d.time)
    .map(d => {
      const timeMatch = d.time.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        return {
          hour: parseInt(timeMatch[1], 10)
        };
      }
      return null;
    })
    .filter(d => d !== null);

  return Plot.plot({
    marginBottom: 60,
    width: Math.min(1000, window.innerWidth - 100),
    height: 400,
    x: {
      label: "Hour of Day (24-hour format)",
      domain: [0, 23]
    },
    y: {
      grid: true,
      label: "Number of Activities"
    },
    marks: [
      Plot.rectY(activitiesWithTime,
        Plot.binX(
          {y: "count"},
          {x: "hour", fill: "#9c1b1b", tip: true}
        )
      ),
      Plot.ruleY([0])
    ]
  });
}
