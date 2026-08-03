// Activity Types Comparison — stacked vs small multiples
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

function chartWidth() {
  return Math.min(900, window.innerWidth - 80);
}

function smallWidth() {
  return Math.min(420, Math.floor((window.innerWidth - 120) / 2));
}

// Builds a collapsible <table> as a non-visual equivalent to a chart.
function dataTable(rows, columns) {
  const details = document.createElement("details");
  details.className = "mt-3";

  const summary = document.createElement("summary");
  summary.className = "text-sm text-gray-600 cursor-pointer hover:underline";
  summary.textContent = "View data as table";
  details.appendChild(summary);

  const wrap = document.createElement("div");
  wrap.className = "overflow-x-auto mt-2";
  const table = document.createElement("table");
  table.className = "w-full text-left text-sm";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  columns.forEach(col => {
    const th = document.createElement("th");
    th.className = "px-3 py-2 font-semibold text-gray-600 border-b-2 border-gray-300 bg-gray-50";
    th.textContent = col.label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-gray-200";
    columns.forEach(col => {
      const td = document.createElement("td");
      td.className = "px-3 py-2";
      td.textContent = row[col.key];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  wrap.appendChild(table);
  details.appendChild(wrap);
  return details;
}

function chartWithTable(chart, ariaLabel, tableRows, tableColumns) {
  const wrapper = document.createElement("div");
  chart.setAttribute("role", "img");
  chart.setAttribute("aria-label", ariaLabel);
  wrapper.appendChild(chart);
  wrapper.appendChild(dataTable(tableRows, tableColumns));
  return wrapper;
}

export async function createVisualization(data) {
  const root = document.createElement("div");

  // Preprocess: count activity types per investigation
  const rows = [];
  data.forEach(d => {
    if (!d.investigation || !d.activity) return;
    rows.push({ investigation: d.investigation, activity: d.activity });
  });

  // Aggregate
  const counts = {};
  rows.forEach(r => {
    const key = `${r.investigation}|${r.activity}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  const chartData = Object.entries(counts).map(([key, count]) => {
    const [investigation, activity] = key.split('|');
    return {
      investigation,
      label: INVESTIGATIONS[investigation] || investigation,
      activity,
      count,
    };
  });

  // Unique investigations in order
  const invKeys = Object.keys(INVESTIGATIONS).filter(k =>
    chartData.some(d => d.investigation === k)
  );
  const invColors = new Map(invKeys.map((k, i) => [INVESTIGATIONS[k], PALETTE[i % PALETTE.length]]));

  // State
  let mode = 'stacked'; // 'stacked' or 'multiples'

  // Toggle bar
  const toggleBar = document.createElement("div");
  toggleBar.className = "flex items-center gap-2 mb-6";

  const label = document.createElement("span");
  label.className = "text-sm font-medium text-gray-600";
  label.textContent = "View:";
  toggleBar.appendChild(label);

  function makeToggle(value, text) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.mode = value;
    btn.textContent = text;
    btn.className = "px-3 py-1 text-sm rounded border transition-colors cursor-pointer";
    btn.addEventListener("click", () => {
      mode = value;
      updateToggleStyles();
      render();
    });
    return btn;
  }

  const stackedBtn = makeToggle('stacked', 'Stacked');
  const multiplesBtn = makeToggle('multiples', 'Small Multiples');
  toggleBar.appendChild(stackedBtn);
  toggleBar.appendChild(multiplesBtn);

  // Legend
  const legend = document.createElement("div");
  legend.className = "flex flex-wrap gap-3 ml-auto";
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
    legend.appendChild(item);
  });
  toggleBar.appendChild(legend);
  root.appendChild(toggleBar);

  function updateToggleStyles() {
    [stackedBtn, multiplesBtn].forEach(btn => {
      const active = btn.dataset.mode === mode;
      btn.setAttribute("aria-pressed", String(active));
      btn.style.backgroundColor = active ? ACCENT : "white";
      btn.style.color = active ? "white" : "#374151";
      btn.style.borderColor = active ? ACCENT : "#d1d5db";
    });
  }

  // Chart container
  const chartContainer = document.createElement("div");
  root.appendChild(chartContainer);

  function render() {
    chartContainer.innerHTML = "";

    if (mode === 'stacked') {
      renderStacked();
    } else {
      renderMultiples();
    }
  }

  function renderStacked() {
    // Group by activity type, stacked by investigation
    const allTypes = [...new Set(chartData.map(d => d.activity))];

    const plot = Plot.plot({
      marginLeft: 140,
      marginBottom: 40,
      width: chartWidth(),
      height: Math.max(300, allTypes.length * 35 + 60),
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
          {
            y: "activity",
            x: "count",
            fill: "label",
            sort: { y: "-x" },
            tip: true,
          }
        )),
        Plot.ruleX([0]),
      ],
    });

    const rows = [...chartData]
      .sort((a, b) => a.activity.localeCompare(b.activity) || (INVESTIGATIONS[a.investigation] || "").localeCompare(INVESTIGATIONS[b.investigation] || ""))
      .map(d => ({ 'Activity type': d.activity, Investigation: d.label, Count: d.count }));

    chartContainer.appendChild(
      chartWithTable(
        plot,
        `Stacked bar chart of activity type counts across investigations (${allTypes.length} types)`,
        rows,
        [{ key: 'Activity type', label: 'Activity type' }, { key: 'Investigation', label: 'Investigation' }, { key: 'Count', label: 'Count' }]
      )
    );
  }

  function renderMultiples() {
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 md:grid-cols-2 gap-6";

    invKeys.forEach((invKey, i) => {
      const invData = chartData.filter(d => d.investigation === invKey);
      if (invData.length === 0) return;

      const card = document.createElement("div");
      card.className = "bg-gray-50 border border-gray-200 rounded-lg p-4";

      const heading = document.createElement("h3");
      heading.className = "text-lg font-heading font-semibold text-gray-800 mb-1";
      heading.textContent = INVESTIGATIONS[invKey];
      card.appendChild(heading);

      const count = invData.reduce((s, d) => s + d.count, 0);
      const sub = document.createElement("p");
      sub.className = "text-xs text-gray-500 mb-3";
      sub.textContent = `${count} activities`;
      card.appendChild(sub);

      const color = PALETTE[i % PALETTE.length];

      const plot = Plot.plot({
        marginLeft: 120,
        marginBottom: 30,
        width: smallWidth(),
        height: Math.max(150, invData.length * 25 + 40),
        x: { grid: true, label: null },
        y: { label: null },
        marks: [
          Plot.barX(invData, {
            x: "count",
            y: "activity",
            fill: color,
            sort: { y: "-x" },
            tip: true,
          }),
          Plot.ruleX([0]),
        ],
      });

      card.appendChild(
        chartWithTable(
          plot,
          `Bar chart of activity type counts for ${INVESTIGATIONS[invKey]} (${invData.length} types)`,
          invData.map(d => ({ 'Activity type': d.activity, Count: d.count })),
          [{ key: 'Activity type', label: 'Activity type' }, { key: 'Count', label: 'Count' }]
        )
      );
      grid.appendChild(card);
    });

    chartContainer.appendChild(grid);
  }

  // Initial render
  updateToggleStyles();
  render();

  return root;
}
