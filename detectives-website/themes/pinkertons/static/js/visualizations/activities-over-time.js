// Activities Over Time Visualization
// Shows temporal distribution of Pinkerton detective activities, stacked by activity type

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

const ACTIVITY_COLORS = {
  "Surveillance": "#b5381e",
  "Shadowing":    "#c8a04a",
  "Interview":    "#5d7a6b",
  "Contact":      "#6b7280",
  "Search":       "#7c3aed",
  "Informant":    "#0369a1",
  "Roping":       "#d97706",
};

export async function createVisualization(data) {
  const activitiesWithDates = data
    .filter(d => d.date)
    .map(d => ({
      ...d,
      dateObj: new Date(d.date.split('T')[0]),
      activityType: d.activity_type || "Unknown"
    }));

  // Get sorted unique activity types for consistent legend ordering
  const activityTypes = [...new Set(activitiesWithDates.map(d => d.activityType))].sort();

  return Plot.plot({
    marginLeft: 60,
    marginBottom: 60,
    width: Math.min(1000, window.innerWidth - 100),
    height: 400,
    x: {
      type: "time",
      label: "Date",
      tickFormat: "%b %d"
    },
    y: {
      grid: true,
      label: "Number of Activities"
    },
    color: {
      domain: activityTypes,
      range: activityTypes.map(t => ACTIVITY_COLORS[t] || "#999"),
      legend: true
    },
    marks: [
      Plot.rectY(activitiesWithDates,
        Plot.binX(
          {y: "count"},
          {x: "dateObj", interval: "day", fill: "activityType", tip: true}
        )
      ),
      Plot.ruleY([0])
    ]
  });
}
