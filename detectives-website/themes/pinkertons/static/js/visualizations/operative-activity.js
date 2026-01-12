// Operative Activity Visualization
// Compares surveillance workload across different Pinkerton operatives

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

export async function createVisualization(data) {
  // Count activities by operative
  const operativeCounts = {};
  data.forEach(d => {
    if (d.operative) {
      operativeCounts[d.operative] = (operativeCounts[d.operative] || 0) + 1;
    }
  });

  const operativeData = Object.entries(operativeCounts)
    .map(([name, count]) => ({ operative: name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 operatives

  return Plot.plot({
    marginLeft: 120,
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
      Plot.barX(operativeData, {
        x: "count",
        y: "operative",
        fill: "#9c1b1b",
        sort: {y: "-x"},
        tip: true
      }),
      Plot.ruleX([0])
    ]
  });
}
