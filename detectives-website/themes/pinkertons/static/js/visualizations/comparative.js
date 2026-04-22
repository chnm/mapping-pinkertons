// Comparative Analysis Dashboard — stacked vs small multiples for all chart types
import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

const ACCENT = "#b5381e";
const PALETTE = [
  "#b5381e", // rust
  "#c8a04a", // gold
  "#5d7a6b", // sage
  "#6b7280", // gray
  "#7c3aed", // violet
  "#0369a1", // sky
];

const INVESTIGATIONS = {
  'el-paso':  'El Paso Smelter Fraud',
  'nyc':      'Corn Exchange Bank',
  'hobart':   'William Hobart',
  'atlanta':  'Atlanta Laundries',
};

function fullW() { return Math.min(900, window.innerWidth - 80); }
function smallW() { return Math.min(420, Math.floor((window.innerWidth - 120) / 2)); }

function countByField(data, field) {
  const counts = {};
  data.forEach(d => {
    const val = d[field];
    if (val != null && val !== "") counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

function countByFieldGrouped(data, field) {
  const counts = {};
  data.forEach(d => {
    const val = d[field];
    if (val == null || val === "" || !d.investigation) return;
    const key = `${d.investigation}|${val}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([key, count]) => {
    const [investigation, value] = key.split('|');
    return { investigation, label: INVESTIGATIONS[investigation] || investigation, value, count };
  });
}

function countLocationTypes(data) {
  const rows = [];
  data.forEach(d => {
    if (!d.investigation) return;
    const t = d.locations && d.locations.length > 0 ? d.locations[0].location_type : null;
    if (t) rows.push({ investigation: d.investigation, label: INVESTIGATIONS[d.investigation] || d.investigation, value: t });
  });
  const counts = {};
  rows.forEach(r => {
    const key = `${r.investigation}|${r.value}`;
    counts[key] = counts[key] || { ...r, count: 0 };
    counts[key].count++;
  });
  return Object.values(counts);
}

// ─── Chart definitions ───────────────────────────────────────────────────────

const CHART_TYPES = {
  'activity-types': {
    label: 'Activity Types',
    grouped: (data) => countByFieldGrouped(data, 'activity'),
    flat: (data) => countByField(data, 'activity'),
    stackable: true,
  },
  'daily-activity': {
    label: 'Daily Activity',
    // Special: timeline, not a bar chart
    stackable: false,
    isTimeline: true,
  },
  'location-types': {
    label: 'Location Types',
    grouped: countLocationTypes,
    flat: (data) => {
      const types = [];
      data.forEach(d => {
        if (d.locations && d.locations.length > 0) {
          const t = d.locations[0].location_type;
          if (t) types.push(t);
        }
      });
      return countByField(types.map(t => ({ value: t })).length ? data : [], 'dummy');
    },
    stackable: true,
  },
  'workload': {
    label: 'Operative Workload',
    grouped: (data) => countByFieldGrouped(data, 'operative'),
    flat: (data) => countByField(data, 'operative'),
    stackable: false, // operatives don't overlap across investigations
  },
  'top-subjects': {
    label: 'Top Subjects',
    grouped: (data) => countByFieldGrouped(data, 'subject'),
    flat: (data) => countByField(data, 'subject'),
    stackable: false, // subjects don't overlap across investigations
  },
};

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderStacked(container, chartData, invKeys) {
  const allValues = [...new Set(chartData.map(d => d.value))];
  container.appendChild(
    Plot.plot({
      marginLeft: 160, marginBottom: 40,
      width: fullW(),
      height: Math.max(300, allValues.length * 30 + 60),
      x: { grid: true, label: "Activities" },
      y: { label: null },
      color: {
        domain: invKeys.map(k => INVESTIGATIONS[k]),
        range: invKeys.map((_, i) => PALETTE[i % PALETTE.length]),
        legend: false,
      },
      marks: [
        Plot.barX(chartData, Plot.groupY(
          { x: "sum" },
          { y: "value", x: "count", fill: "label", sort: { y: "-x" }, tip: true }
        )),
        Plot.ruleX([0]),
      ],
    })
  );
}

function renderMultiples(container, allData, fieldFn, invKeys) {
  const grid = document.createElement("div");
  grid.className = "grid grid-cols-1 md:grid-cols-2 gap-6";

  invKeys.forEach((invKey, i) => {
    const invData = allData.filter(d => d.investigation === invKey);
    if (invData.length === 0) return;

    const counts = fieldFn(invData).slice(0, 15);
    if (counts.length === 0) return;

    const card = document.createElement("div");
    card.className = "bg-gray-50 border border-gray-200 rounded-lg p-4";

    const heading = document.createElement("h3");
    heading.className = "text-lg font-heading font-semibold text-gray-800 mb-1";
    heading.textContent = INVESTIGATIONS[invKey];
    card.appendChild(heading);

    const sub = document.createElement("p");
    sub.className = "text-xs text-gray-500 mb-3";
    sub.textContent = `${invData.length} activities`;
    card.appendChild(sub);

    card.appendChild(
      Plot.plot({
        marginLeft: 140, marginBottom: 30,
        width: smallW(),
        height: Math.max(150, counts.length * 25 + 40),
        x: { grid: true, label: null },
        y: { label: null },
        marks: [
          Plot.barX(counts, { x: "count", y: "value", fill: PALETTE[i % PALETTE.length], sort: { y: "-x" }, tip: true }),
          Plot.ruleX([0]),
        ],
      })
    );
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

const ACTIVITY_COLORS = {
  "Surveillance": "#b5381e", "Shadowing": "#c8a04a", "Interview": "#5d7a6b",
  "Contact": "#6b7280", "Search": "#7c3aed", "Informant": "#0369a1", "Roping": "#d97706",
};

function renderTimelineMultiples(container, allData, invKeys) {
  const grid = document.createElement("div");
  grid.className = "grid grid-cols-1 md:grid-cols-2 gap-6";

  invKeys.forEach((invKey, i) => {
    const invData = allData.filter(d => d.investigation === invKey && d.date);
    if (invData.length === 0) return;

    const withDates = invData.map(d => ({
      ...d,
      dateObj: new Date(d.date.substring(0, 10)),
      activityType: d.activity_type || d.activity || "Unknown"
    }));
    const activityTypes = [...new Set(withDates.map(d => d.activityType))].sort();

    const card = document.createElement("div");
    card.className = "bg-gray-50 border border-gray-200 rounded-lg p-4";

    const heading = document.createElement("h3");
    heading.className = "text-lg font-heading font-semibold text-gray-800 mb-1";
    heading.textContent = INVESTIGATIONS[invKey];
    card.appendChild(heading);

    const sub = document.createElement("p");
    sub.className = "text-xs text-gray-500 mb-3";
    sub.textContent = `${invData.length} activities`;
    card.appendChild(sub);

    card.appendChild(
      Plot.plot({
        marginLeft: 40, marginBottom: 50,
        width: smallW(),
        height: 200,
        x: { type: "time", label: null, tickFormat: "%b %d", tickRotate: -30 },
        y: { grid: true, label: null },
        color: {
          domain: activityTypes,
          range: activityTypes.map(t => ACTIVITY_COLORS[t] || "#999"),
          legend: true
        },
        marks: [
          Plot.rectY(withDates, Plot.binX({ y: "count" }, { x: "dateObj", interval: "day", fill: "activityType", tip: true })),
          Plot.ruleY([0]),
        ],
      })
    );
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function createVisualization(data) {
  const root = document.createElement("div");

  const invKeys = Object.keys(INVESTIGATIONS).filter(k =>
    data.some(d => d.investigation === k)
  );

  // ── State
  let chartType = 'activity-types';
  let viewMode = 'stacked';

  // ── Controls bar
  const controls = document.createElement("div");
  controls.className = "bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm sticky top-0 z-[1000]";

  const row = document.createElement("div");
  row.className = "flex flex-wrap items-center gap-4";
  controls.appendChild(row);

  // Chart type dropdown
  const typeWrap = document.createElement("div");
  typeWrap.className = "flex items-center gap-2";
  const typeLbl = document.createElement("label");
  typeLbl.className = "text-sm font-medium text-gray-700";
  typeLbl.textContent = "Chart";
  typeLbl.htmlFor = "comp-chart-type";
  const typeSel = document.createElement("select");
  typeSel.id = "comp-chart-type";
  typeSel.className = "text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-700";
  Object.entries(CHART_TYPES).forEach(([key, def]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = def.label;
    typeSel.appendChild(opt);
  });
  typeWrap.appendChild(typeLbl);
  typeWrap.appendChild(typeSel);
  row.appendChild(typeWrap);

  // View mode toggles
  const modeWrap = document.createElement("div");
  modeWrap.className = "flex items-center gap-1";
  const modeLbl = document.createElement("span");
  modeLbl.className = "text-sm font-medium text-gray-700 mr-1";
  modeLbl.textContent = "View:";
  modeWrap.appendChild(modeLbl);

  const stackedBtn = document.createElement("button");
  stackedBtn.type = "button";
  stackedBtn.textContent = "Stacked";
  stackedBtn.className = "px-3 py-1 text-sm rounded border cursor-pointer transition-colors";

  const multiplesBtn = document.createElement("button");
  multiplesBtn.type = "button";
  multiplesBtn.textContent = "Small Multiples";
  multiplesBtn.className = "px-3 py-1 text-sm rounded border cursor-pointer transition-colors";

  modeWrap.appendChild(stackedBtn);
  modeWrap.appendChild(multiplesBtn);
  row.appendChild(modeWrap);

  root.appendChild(controls);

  // Legend card
  const legendCard = document.createElement("div");
  legendCard.className = "bg-white border border-gray-200 rounded-lg px-4 py-3 mb-6 shadow-sm flex flex-wrap gap-4 items-center";
  const legendLabel = document.createElement("span");
  legendLabel.className = "text-xs font-medium text-gray-500 uppercase tracking-wide";
  legendLabel.textContent = "Investigations";
  legendCard.appendChild(legendLabel);
  invKeys.forEach((k, i) => {
    const item = document.createElement("div");
    item.className = "flex items-center gap-1.5 text-sm";
    const dot = document.createElement("div");
    dot.className = "w-3 h-3 rounded-full flex-shrink-0";
    dot.style.backgroundColor = PALETTE[i % PALETTE.length];
    const txt = document.createElement("span");
    txt.className = "text-gray-600";
    txt.textContent = INVESTIGATIONS[k];
    item.appendChild(dot);
    item.appendChild(txt);
    legendCard.appendChild(item);
  });
  root.appendChild(legendCard);

  // ── Chart area
  const chartArea = document.createElement("div");
  root.appendChild(chartArea);

  // ── Update toggle styles
  function updateStyles() {
    const def = CHART_TYPES[chartType];
    const canStack = def && def.stackable && !def.isTimeline;

    // Disable stacked button if not stackable
    stackedBtn.disabled = !canStack;
    stackedBtn.style.opacity = canStack ? "1" : "0.4";
    stackedBtn.style.cursor = canStack ? "pointer" : "not-allowed";

    // If currently on stacked but can't, switch to multiples
    if (!canStack && viewMode === 'stacked') {
      viewMode = 'multiples';
    }

    [stackedBtn, multiplesBtn].forEach(btn => {
      const val = btn === stackedBtn ? 'stacked' : 'multiples';
      const active = val === viewMode;
      btn.style.backgroundColor = active ? ACCENT : "white";
      btn.style.color = active ? "white" : "#374151";
      btn.style.borderColor = active ? ACCENT : "#d1d5db";
    });
  }

  // ── Render
  function render() {
    chartArea.innerHTML = "";
    const def = CHART_TYPES[chartType];
    if (!def) return;

    if (def.isTimeline) {
      renderTimelineMultiples(chartArea, data, invKeys);
    } else if (viewMode === 'stacked' && def.stackable) {
      // For location-types, we need special grouped data
      let grouped;
      if (chartType === 'location-types') {
        grouped = countLocationTypes(data);
      } else {
        grouped = def.grouped(data);
      }
      renderStacked(chartArea, grouped, invKeys);
    } else {
      // Small multiples
      let fieldFn;
      if (chartType === 'location-types') {
        fieldFn = (invData) => {
          const types = [];
          invData.forEach(d => {
            if (d.locations && d.locations.length > 0) {
              const t = d.locations[0].location_type;
              if (t) types.push(t);
            }
          });
          const counts = {};
          types.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
          return Object.entries(counts).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count).slice(0, 15);
        };
      } else {
        const field = chartType === 'activity-types' ? 'activity'
          : chartType === 'workload' ? 'operative'
          : chartType === 'top-subjects' ? 'subject'
          : 'activity';
        fieldFn = (invData) => countByField(invData, field).slice(0, 15);
      }
      renderMultiples(chartArea, data, fieldFn, invKeys);
    }
  }

  // ── Wire events
  typeSel.addEventListener("change", () => {
    chartType = typeSel.value;
    updateStyles();
    render();
  });

  stackedBtn.addEventListener("click", () => {
    if (stackedBtn.disabled) return;
    viewMode = 'stacked';
    updateStyles();
    render();
  });

  multiplesBtn.addEventListener("click", () => {
    viewMode = 'multiples';
    updateStyles();
    render();
  });

  // ── Initial
  updateStyles();
  render();

  return root;
}
