// Surveillance Activity Dashboard
// Interactive multi-chart dashboard with filter bar and KPI cards

import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";

// ─── Color Palette ────────────────────────────────────────────────────────────

const ACCENT = "#b5381e"; // grit-accent rust/brick
const GOLD   = "#c8a04a"; // grit-gold amber
const STEEL  = "#5d7a6b"; // grit-steel sage
const GREEN  = "#15803d"; // green-700
const GRAY   = "#6b7280"; // gray-500

const PALETTE = [
  ACCENT,
  GOLD,
  STEEL,
  GRAY,
  GREEN,
  "#7c3aed", // violet-700
  "#c2410c", // orange-700
  "#0369a1", // sky-700
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countBy(data, field) {
  const counts = {};
  data.forEach(d => {
    const val = d[field];
    if (val != null && val !== "") {
      counts[val] = (counts[val] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

function fullW() {
  return Math.min(1000, window.innerWidth - 130);
}

function halfW() {
  return Math.min(480, Math.floor((window.innerWidth - 180) / 2));
}

function normalizeInfo(val) {
  if (!val || val.trim() === "") return "Not recorded";
  const v = val.trim().toLowerCase();
  if (v === "yes") return "Yes";
  if (v === "no")  return "No";
  return "Not recorded";
}

// Creates a white rounded card with a heading; returns { card, body }.
// Render functions clear and populate `body`.
function section(title) {
  const card = document.createElement("div");
  card.className = "bg-white border border-gray-200 rounded-lg p-5 shadow-sm";
  const h = document.createElement("h3");
  h.className = "text-base font-heading font-semibold text-grit-text-dark mb-4";
  h.textContent = title;
  card.appendChild(h);
  const body = document.createElement("div");
  card.appendChild(body);
  return { card, body };
}

function makeOpt(value, label) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  return o;
}

// ─── Date Slider Helpers ───────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function fmtDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Compact "Mar 15" format used in the inline slider display
function fmtShort(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayToDate(idx, base) {
  return new Date(base.getTime() + idx * DAY_MS);
}

function updateSliderFill(fill, minSlider, maxSlider) {
  const total = +minSlider.max;
  const lo = +minSlider.value / total * 100;
  const hi = +maxSlider.value / total * 100;
  fill.style.left  = `${lo}%`;
  fill.style.width = `${hi - lo}%`;
}

// Injects thumb/track CSS that can't be expressed as Tailwind utilities.
// Idempotent — safe to call multiple times.
function injectSliderStyles() {
  if (document.getElementById("db-slider-styles")) return;
  const s = document.createElement("style");
  s.id = "db-slider-styles";
  s.textContent = `
    .db-range {
      -webkit-appearance: none; appearance: none;
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      background: transparent; margin: 0; padding: 0;
      pointer-events: none;
    }
    .db-range:focus { outline: none; }
    .db-range::-webkit-slider-runnable-track { background: transparent; }
    .db-range::-moz-range-track { background: transparent; height: 0; }
    .db-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px; height: 18px; border-radius: 50%;
      background: ${ACCENT}; border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.28);
      pointer-events: all; cursor: grab;
    }
    .db-range:active::-webkit-slider-thumb { cursor: grabbing; }
    .db-range::-moz-range-thumb {
      width: 14px; height: 14px; border-radius: 50%;
      background: ${ACCENT}; border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.28);
      pointer-events: all; cursor: grab;
    }
    .db-help summary {
      list-style: none; cursor: pointer;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .db-help summary::-webkit-details-marker { display: none; }
    .db-help summary .db-chevron {
      display: inline-block; transition: transform 0.2s;
    }
    .db-help[open] summary .db-chevron { transform: rotate(90deg); }
  `;
  document.head.appendChild(s);
}

// Horizontal bar with a square left edge and rounded right cap, slim band.
// Uses Plot's render callback to replace <rect> elements with <path> elements
// that have rx only on the right side.
function pillBarX(data, options) {
  const RX = 7; // right-cap radius
  return Plot.barX(data, {
    insetTop: 6,
    insetBottom: 6,
    ...options,
    render(index, scales, channels, dimensions, context, next) {
      const g = next(index, scales, channels, dimensions, context);
      for (const rect of g.querySelectorAll("rect")) {
        const x = parseFloat(rect.getAttribute("x"));
        const w = parseFloat(rect.getAttribute("width"));
        const y = parseFloat(rect.getAttribute("y"));
        const h = parseFloat(rect.getAttribute("height"));
        if (!isFinite(x + w + y + h) || w <= 0 || h <= 0) continue;
        const r = Math.min(RX, h / 2, w / 2);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        for (const { name, value } of rect.attributes) {
          if (!["x", "y", "width", "height", "rx", "ry"].includes(name)) {
            path.setAttribute(name, value);
          }
        }
        // Square top-left → round top-right → round bottom-right → square bottom-left
        path.setAttribute("d",
          `M${x},${y}` +
          `H${x + w - r}` +
          `A${r},${r} 0 0 1 ${x + w},${y + r}` +
          `V${y + h - r}` +
          `A${r},${r} 0 0 1 ${x + w - r},${y + h}` +
          `H${x}Z`
        );
        rect.replaceWith(path);
      }
      return g;
    },
  });
}

// ─── Pre-process ──────────────────────────────────────────────────────────────

function preprocess(raw) {
  return raw.map(d => {
    const dateObj = d.date ? new Date(d.date.split("T")[0]) : null;
    let hour = null;
    if (d.time) {
      const m = d.time.match(/(\d{2}):\d{2}/);
      if (m) hour = parseInt(m[1], 10);
    }
    const locationType =
      d.locations && d.locations.length > 0
        ? d.locations[0].location_type || null
        : null;
    return {
      ...d,
      dateObj,
      hour,
      locationType,
      infoNorm: normalizeInfo(d.information),
    };
  });
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

// Returns { bar, minSlider, maxSlider, sliderFill, rangeDisplay }
function buildFilterBar(allData, minDate, totalDays) {
  const operatives = [...new Set(allData.map(d => d.operative).filter(Boolean))].sort();
  const activityTypes = [...new Set(allData.map(d => d.activity).filter(Boolean))].sort();

  const bar = document.createElement("div");
  bar.className =
    "bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-md sticky top-0 z-40";

  // ── Row 1: dropdowns + toggles + reset + count
  const row1 = document.createElement("div");
  row1.className = "flex flex-wrap items-center gap-4";

  // — Operative dropdown
  const opWrap = document.createElement("div");
  opWrap.className = "flex items-center gap-2";
  const opLbl = document.createElement("label");
  opLbl.htmlFor = "filter-operative";
  opLbl.className = "text-sm font-medium text-grit-text-dark whitespace-nowrap";
  opLbl.textContent = "Operative";
  const opSel = document.createElement("select");
  opSel.id = "filter-operative";
  opSel.className =
    "text-sm border border-gray-300 rounded px-2 py-1 text-grit-text-dark bg-white";
  opSel.appendChild(makeOpt("all", "All operatives"));
  operatives.forEach(op => opSel.appendChild(makeOpt(op, op)));
  opWrap.appendChild(opLbl);
  opWrap.appendChild(opSel);
  row1.appendChild(opWrap);

  // — Activity type dropdown
  const actWrap = document.createElement("div");
  actWrap.className = "flex items-center gap-2";
  const actLbl = document.createElement("label");
  actLbl.htmlFor = "filter-activity";
  actLbl.className = "text-sm font-medium text-grit-text-dark whitespace-nowrap";
  actLbl.textContent = "Activity type";
  const actSel = document.createElement("select");
  actSel.id = "filter-activity";
  actSel.className =
    "text-sm border border-gray-300 rounded px-2 py-1 text-grit-text-dark bg-white";
  actSel.appendChild(makeOpt("all", "All types"));
  activityTypes.forEach(at => actSel.appendChild(makeOpt(at, at)));
  actWrap.appendChild(actLbl);
  actWrap.appendChild(actSel);
  row1.appendChild(actWrap);

  // — Info gathered toggle buttons
  const infoWrap = document.createElement("div");
  infoWrap.className = "flex items-center gap-1";
  const infoLbl = document.createElement("span");
  infoLbl.className = "text-sm font-medium text-grit-text-dark mr-1 whitespace-nowrap";
  infoLbl.textContent = "Info gathered:";
  infoWrap.appendChild(infoLbl);

  ["All", "Yes", "No"].forEach((label, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.infoVal = label.toLowerCase();
    btn.textContent = label;
    btn.className = "text-xs px-2 py-1 rounded border transition-colors cursor-pointer";
    btn.style.backgroundColor = i === 0 ? ACCENT : "white";
    btn.style.color           = i === 0 ? "white" : "#2a1a0e";
    btn.style.borderColor     = i === 0 ? ACCENT  : "#d1d5db";
    infoWrap.appendChild(btn);
  });
  row1.appendChild(infoWrap);

  // — Thin vertical divider
  const divider = document.createElement("div");
  divider.style.cssText =
    "width: 1px; height: 22px; background: #e5e7eb; flex-shrink: 0; align-self: center;";
  row1.appendChild(divider);

  // — Date range (compact inline slider)
  const dateWrap = document.createElement("div");
  dateWrap.className = "flex items-center gap-2";

  const dateLbl = document.createElement("span");
  dateLbl.className = "text-sm font-medium text-grit-text-dark whitespace-nowrap";
  dateLbl.textContent = "Date range";
  dateWrap.appendChild(dateLbl);

  // Track container — fixed 180px wide
  const trackWrap = document.createElement("div");
  trackWrap.style.cssText =
    "position: relative; width: 180px; height: 28px; flex-shrink: 0;";

  const track = document.createElement("div");
  track.style.cssText =
    "position: absolute; top: 50%; left: 0; right: 0; height: 4px;" +
    "transform: translateY(-50%); background: #e5e7eb; border-radius: 2px;";

  const sliderFill = document.createElement("div");
  sliderFill.style.cssText =
    `position: absolute; top: 0; height: 100%; border-radius: 2px;` +
    `background: ${ACCENT}; left: 0%; width: 100%;`;
  track.appendChild(sliderFill);
  trackWrap.appendChild(track);

  const minSlider = document.createElement("input");
  minSlider.type = "range";
  minSlider.className = "db-range";
  minSlider.min = 0;
  minSlider.max = totalDays;
  minSlider.value = 0;
  minSlider.style.zIndex = 2;

  const maxSlider = document.createElement("input");
  maxSlider.type = "range";
  maxSlider.className = "db-range";
  maxSlider.min = 0;
  maxSlider.max = totalDays;
  maxSlider.value = totalDays;
  maxSlider.style.zIndex = 3;

  trackWrap.appendChild(minSlider);
  trackWrap.appendChild(maxSlider);
  dateWrap.appendChild(trackWrap);

  // Compact date display: "Mar 15 – Aug 12"
  const rangeDisplay = document.createElement("span");
  rangeDisplay.style.cssText =
    `font-size: 0.72rem; font-family: monospace; color: ${ACCENT}; white-space: nowrap;`;
  rangeDisplay.textContent =
    `${fmtShort(minDate)} – ${fmtShort(dayToDate(totalDays, minDate))}`;
  dateWrap.appendChild(rangeDisplay);

  row1.appendChild(dateWrap);

  // — Reset button
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.id = "filter-reset";
  resetBtn.textContent = "Reset";
  resetBtn.className =
    "text-xs px-3 py-1.5 rounded border border-gray-300 text-grit-text-dark bg-white hover:border-grit-accent hover:text-grit-accent transition-colors cursor-pointer";
  row1.appendChild(resetBtn);

  // — Live record count
  const countBadge = document.createElement("span");
  countBadge.id = "filter-count";
  countBadge.className = "ml-auto text-sm text-grit-text-dark/70 font-mono tabular-nums";
  row1.appendChild(countBadge);

  bar.appendChild(row1);

  // ── Row 3: collapsible usage instructions
  const row3 = document.createElement("div");
  row3.style.cssText = "margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6;";

  const help = document.createElement("details");
  help.className = "db-help";

  const summary = document.createElement("summary");
  summary.innerHTML =
    `<span class="db-chevron" style="font-size:0.65rem; color:${ACCENT};">&#9658;</span>` +
    `<span style="font-size:0.75rem; color:${ACCENT}; font-weight:500;">How to use this dashboard</span>`;
  help.appendChild(summary);

  const helpBody = document.createElement("ul");
  helpBody.style.cssText =
    "margin: 8px 0 0 16px; padding: 0; font-size: 0.78rem;" +
    "color: #6b7280; line-height: 1.6; list-style: disc;";
  [
    "Use the <strong>Operative</strong> and <strong>Activity type</strong> dropdowns to narrow to a specific person or action.",
    "Click an <strong>Info gathered</strong> button to filter by whether intelligence was collected during a surveillance event.",
    "Drag the <strong>Date range</strong> handles to zoom into a specific span of days.",
    "All charts and KPI figures update simultaneously with every filter change.",
    "Click <strong>Reset</strong> to restore the full dataset.",
  ].forEach(text => {
    const li = document.createElement("li");
    li.innerHTML = text;
    helpBody.appendChild(li);
  });
  help.appendChild(helpBody);
  row3.appendChild(help);
  bar.appendChild(row3);

  return { bar, minSlider, maxSlider, sliderFill, rangeDisplay };
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function renderKPIs(container, data) {
  container.innerHTML = "";

  const count = data.length;

  const dates = data.map(d => d.dateObj).filter(Boolean).sort((a, b) => a - b);
  let dateRange = "—";
  if (dates.length > 0) {
    const fmt = d =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    dateRange =
      dates[0].getTime() === dates[dates.length - 1].getTime()
        ? fmt(dates[0])
        : `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`;
  }

  const uniqueOps      = new Set(data.map(d => d.operative).filter(Boolean)).size;
  const uniqueSubjects = new Set(data.map(d => d.subject).filter(Boolean)).size;

  [
    { label: "Activities",       value: count.toLocaleString(),         color: ACCENT },
    { label: "Date range",       value: dateRange,                      color: STEEL  },
    { label: "Operatives",       value: uniqueOps.toLocaleString(),     color: GOLD   },
    { label: "Subjects watched", value: uniqueSubjects.toLocaleString(), color: STEEL  },
  ].forEach(({ label, value, color }) => {
    const card = document.createElement("div");
    card.className = "bg-white border border-gray-200 rounded-lg p-5 shadow-sm";
    card.innerHTML = `
      <div class="text-xs font-medium uppercase tracking-wide text-grit-text-dark/60 mb-1">${label}</div>
      <div class="text-2xl font-heading font-bold break-words" style="color:${color}">${value}</div>
    `;
    container.appendChild(card);
  });
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function renderTimeline(container, data) {
  container.innerHTML = "";
  const withDates = data.filter(d => d.dateObj);
  if (withDates.length === 0) {
    container.textContent = "No dated records match the current filters.";
    return;
  }
  container.appendChild(
    Plot.plot({
      marginLeft: 50,
      marginBottom: 70,
      width: fullW(),
      height: 280,
      x: { type: "time", label: "Date", tickFormat: "%b %Y", tickRotate: -30 },
      y: { grid: true, label: "Activities" },
      marks: [
        Plot.rectY(
          withDates,
          Plot.binX({ y: "count" }, { x: "dateObj", interval: "day", fill: ACCENT, tip: true })
        ),
        Plot.ruleY([0]),
      ],
    })
  );
}

// ─── Activity Type Breakdown ──────────────────────────────────────────────────

function renderActivityTypes(container, data, colorMap) {
  container.innerHTML = "";
  const counts = countBy(data, "activity").slice(0, 12);
  if (counts.length === 0) {
    container.textContent = "No data for current filters.";
    return;
  }
  container.appendChild(
    Plot.plot({
      marginLeft: 160,
      marginBottom: 40,
      width: halfW(),
      height: Math.max(180, counts.length * 30 + 60),
      x: { grid: true, label: "Activities" },
      y: { label: null },
      marks: [
        pillBarX(counts, {
          x: "count",
          y: "value",
          fill: d => colorMap.get(d.value) || ACCENT,
          sort: { y: "-x" },
          tip: true,
        }),
        Plot.ruleX([0]),
      ],
    })
  );
}

// ─── Time of Day ──────────────────────────────────────────────────────────────

function renderTimeOfDay(container, data) {
  container.innerHTML = "";
  const withHours = data.filter(d => d.hour !== null);
  if (withHours.length === 0) {
    container.textContent = "No timed records match the current filters.";
    return;
  }
  container.appendChild(
    Plot.plot({
      marginLeft: 40,
      marginBottom: 40,
      width: halfW(),
      height: 220,
      x: { label: "Hour of day", domain: [0, 23], ticks: [0, 6, 12, 18, 23] },
      y: { grid: true, label: "Activities" },
      marks: [
        Plot.rectY(
          withHours,
          Plot.binX({ y: "count" }, { x: "hour", interval: 1, fill: STEEL, tip: true })
        ),
        Plot.ruleY([0]),
      ],
    })
  );
}

// ─── Operative Workload ───────────────────────────────────────────────────────

function renderOperatives(container, data) {
  container.innerHTML = "";
  const counts = countBy(data, "operative").slice(0, 10);
  if (counts.length === 0) {
    container.textContent = "No data for current filters.";
    return;
  }
  container.appendChild(
    Plot.plot({
      marginLeft: 140,
      marginBottom: 40,
      width: halfW(),
      height: Math.max(180, counts.length * 30 + 60),
      x: { grid: true, label: "Activities" },
      y: { label: null },
      marks: [
        pillBarX(counts, {
          x: "count",
          y: "value",
          fill: STEEL,
          sort: { y: "-x" },
          tip: true,
        }),
        Plot.ruleX([0]),
      ],
    })
  );
}

// ─── Location Types Surveilled ────────────────────────────────────────────────

function renderLocationTypes(container, data) {
  container.innerHTML = "";
  const counts = countBy(data, "locationType").slice(0, 10);
  if (counts.length === 0) {
    container.textContent = "No location type data for current filters.";
    return;
  }
  container.appendChild(
    Plot.plot({
      marginLeft: 140,
      marginBottom: 40,
      width: halfW(),
      height: Math.max(180, counts.length * 30 + 60),
      x: { grid: true, label: "Activities" },
      y: { label: null },
      marks: [
        pillBarX(counts, {
          x: "count",
          y: "value",
          fill: GOLD,
          sort: { y: "-x" },
          tip: true,
        }),
        Plot.ruleX([0]),
      ],
    })
  );
}

// ─── Top Subjects Watched ─────────────────────────────────────────────────────

function renderSubjects(container, data) {
  container.innerHTML = "";
  const counts = countBy(data, "subject").slice(0, 15);
  if (counts.length === 0) {
    container.textContent = "No subject data for current filters.";
    return;
  }
  container.appendChild(
    Plot.plot({
      marginLeft: 180,
      marginBottom: 40,
      width: fullW(),
      height: Math.max(260, counts.length * 30 + 60),
      x: { grid: true, label: "Activities" },
      y: { label: null },
      marks: [
        pillBarX(counts, {
          x: "count",
          y: "value",
          fill: ACCENT,
          sort: { y: "-x" },
          tip: true,
        }),
        Plot.ruleX([0]),
      ],
    })
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function createVisualization(rawData) {
  injectSliderStyles();

  const activities = preprocess(rawData);

  // Build a consistent color map for activity types (stable across filter changes)
  const allTypes = [...new Set(activities.map(d => d.activity).filter(Boolean))].sort();
  const colorMap = new Map(allTypes.map((t, i) => [t, PALETTE[i % PALETTE.length]]));

  // ── Date bounds (for the range slider)
  const datedActivities = activities.filter(d => d.dateObj);
  const allDates = datedActivities.map(d => d.dateObj.getTime());
  const minDate  = new Date(Math.min(...allDates));
  const maxDate  = new Date(Math.max(...allDates));
  const totalDays = Math.round((maxDate - minDate) / DAY_MS);

  // ── Filter state
  let state = {
    operative:    "all",
    activityType: "all",
    infoGathered: "all",
    dateMin: 0,
    dateMax: totalDays,
  };

  function filtered() {
    return activities.filter(d => {
      if (state.operative    !== "all" && d.operative !== state.operative)    return false;
      if (state.activityType !== "all" && d.activity  !== state.activityType) return false;
      if (state.infoGathered !== "all" && d.infoNorm  !== state.infoGathered) return false;
      if (d.dateObj) {
        const idx = Math.round((d.dateObj.getTime() - minDate.getTime()) / DAY_MS);
        if (idx < state.dateMin || idx > state.dateMax) return false;
      }
      return true;
    });
  }

  // ── Root element
  const root = document.createElement("div");
  root.id = "dashboard-root";

  // ── Filter bar
  const { bar: filterBar, minSlider, maxSlider, sliderFill, rangeDisplay } =
    buildFilterBar(activities, minDate, totalDays);
  root.appendChild(filterBar);
  const countBadge  = filterBar.querySelector("#filter-count");
  const opSel       = filterBar.querySelector("#filter-operative");
  const actSel      = filterBar.querySelector("#filter-activity");
  const infoButtons = filterBar.querySelectorAll("[data-info-val]");
  const resetBtn    = filterBar.querySelector("#filter-reset");

  // ── KPI row
  const kpiRow = document.createElement("div");
  kpiRow.className = "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6";
  root.appendChild(kpiRow);

  // ── Charts (space-y-6 wrapper)
  const chartsWrapper = document.createElement("div");
  chartsWrapper.className = "space-y-6";
  root.appendChild(chartsWrapper);

  // Timeline — full width
  const { card: timelineCard, body: timelineBody } = section("Daily Activity Timeline");
  chartsWrapper.appendChild(timelineCard);

  // Mid row: activity types + time of day
  const midRow = document.createElement("div");
  midRow.className = "grid grid-cols-1 md:grid-cols-2 gap-6";
  chartsWrapper.appendChild(midRow);

  const { card: actTypeCard, body: actTypeBody } = section("Activity Type Breakdown");
  midRow.appendChild(actTypeCard);

  const { card: todCard, body: todBody } = section("Time of Day");
  midRow.appendChild(todCard);

  // Bottom row: operatives + location types
  const botRow = document.createElement("div");
  botRow.className = "grid grid-cols-1 md:grid-cols-2 gap-6";
  chartsWrapper.appendChild(botRow);

  const { card: opCard,  body: opBody  } = section("Operative Workload");
  botRow.appendChild(opCard);

  const { card: locCard, body: locBody } = section("Location Types Surveilled");
  botRow.appendChild(locCard);

  // Subjects — full width
  const { card: subjectsCard, body: subjectsBody } = section("Top Subjects Watched");
  chartsWrapper.appendChild(subjectsCard);

  // ── Render all panels from current filter state
  function renderAll() {
    const data = filtered();
    if (countBadge) countBadge.textContent = `${data.length.toLocaleString()} records`;
    renderKPIs(kpiRow, data);
    renderTimeline(timelineBody, data);
    renderActivityTypes(actTypeBody, data, colorMap);
    renderTimeOfDay(todBody, data);
    renderOperatives(opBody, data);
    renderLocationTypes(locBody, data);
    renderSubjects(subjectsBody, data);
  }

  // ── Helper: update info-toggle button styles
  function setInfoActive(activeVal) {
    infoButtons.forEach(btn => {
      const active = btn.dataset.infoVal === activeVal;
      btn.style.backgroundColor = active ? ACCENT  : "white";
      btn.style.color           = active ? "white" : "#2a1a0e";
      btn.style.borderColor     = active ? ACCENT  : "#d1d5db";
    });
  }

  // ── Wire up operative dropdown
  opSel.addEventListener("change", () => {
    state.operative = opSel.value;
    renderAll();
  });

  // ── Wire up activity-type dropdown
  actSel.addEventListener("change", () => {
    state.activityType = actSel.value;
    renderAll();
  });

  // ── Wire up info-gathered toggles
  infoButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const raw = btn.dataset.infoVal;
      state.infoGathered =
        raw === "all" ? "all" : raw.charAt(0).toUpperCase() + raw.slice(1);
      setInfoActive(raw);
      renderAll();
    });
  });

  // ── Wire up date range slider
  // Swap z-index so whichever thumb is "stuck at the edge" stays reachable
  function syncSliderZ() {
    const atMax = +minSlider.value >= +maxSlider.value;
    minSlider.style.zIndex = atMax ? 4 : 2;
    maxSlider.style.zIndex = atMax ? 2 : 3;
  }

  function onSliderChange() {
    // Enforce min ≤ max
    if (+minSlider.value > +maxSlider.value) minSlider.value = maxSlider.value;
    if (+maxSlider.value < +minSlider.value) maxSlider.value = minSlider.value;
    syncSliderZ();
    updateSliderFill(sliderFill, minSlider, maxSlider);
    rangeDisplay.textContent =
      `${fmtShort(dayToDate(+minSlider.value, minDate))} – ` +
      `${fmtShort(dayToDate(+maxSlider.value, minDate))}`;
    state.dateMin = +minSlider.value;
    state.dateMax = +maxSlider.value;
    renderAll();
  }

  minSlider.addEventListener("input", onSliderChange);
  maxSlider.addEventListener("input", onSliderChange);

  // ── Wire up reset
  resetBtn.addEventListener("click", () => {
    state = {
      operative: "all", activityType: "all", infoGathered: "all",
      dateMin: 0, dateMax: totalDays,
    };
    opSel.value  = "all";
    actSel.value = "all";
    setInfoActive("all");
    minSlider.value = 0;
    maxSlider.value = totalDays;
    syncSliderZ();
    updateSliderFill(sliderFill, minSlider, maxSlider);
    rangeDisplay.textContent =
      `${fmtShort(minDate)} – ${fmtShort(dayToDate(totalDays, minDate))}`;
    renderAll();
  });

  // Initial render
  renderAll();

  return root;
}
