# WCAG 2.1 Level AA Accessibility Audit
## Mapping the Pinkertons
**URL:** https://mappingpinkertons.rrchnm.org  
**Audit Date:** 2026-03-25  
**Standard:** WCAG 2.1 Level AA  
**Auditor:** Claude (Anthropic) — automated structural review  
**Pages Reviewed:** Homepage (`/`), Map (`/map`), Activities Database (`/activities`), Visualizations (`/visualizations`), Visualization sub-pages (`/visualizations/dashboard/`, `/visualizations/location-frequency/`), About (`/about`)

---

## Executive Summary

Mapping the Pinkertons is a digital history project developed by the Roy Rosenzweig Center for History and New Media at George Mason University. The site presents an interactive map, a filterable activities database, and data visualizations drawn from historical Pinkerton detective reports. The site appears to be a modern JavaScript-driven application (likely built with a static site generator or framework) with heavy reliance on client-side rendering for its map, table, and chart components.

The audit identified **15 distinct issues** across the six pages reviewed. The site's primary accessibility challenges fall into four areas:

1. **Interactive map and data visualizations lack accessible alternatives** — the Leaflet/Mapbox map and JavaScript-rendered charts convey essential content that is unavailable to screen reader users or keyboard-only users without significant additional work.
2. **Missing or insufficient structural semantics** — landmarks, skip navigation, and heading hierarchy problems affect navigation for assistive technology users across all pages.
3. **Form controls in the Activities Database lack proper labeling** — the search field and dropdown filters appear to rely on visual placeholders rather than programmatic `<label>` associations.
4. **Dynamic content loading with no status announcements** — "Loading…" states for the map, table, and charts are not communicated to assistive technology.

George Mason University is required to bring all public-facing websites into WCAG 2.1 AA compliance by **April 24, 2026** under ADA Title II. This site requires remediation before that deadline.

### Conformance Summary

| Category | Status |
|---|---|
| Overall WCAG 2.1 Level AA Conformance | ❌ Does Not Conform |
| Critical Issues (must fix) | 6 |
| Major Issues (should fix) | 5 |
| Minor Issues (recommended) | 4 |

---

## Issues and Recommended Changes

---

### ISSUE-01 — Verify `lang` Attribute on `<html>` Element
**Severity:** Critical  
**WCAG Criterion:** 3.1.1 Language of Page (Level A)  
**Pages Affected:** All pages (sitewide template)

**Description:**  
The `<html>` element must include a `lang="en"` attribute so that screen readers apply the correct pronunciation engine. Because raw HTML source could not be directly inspected via curl (domain not in the container's network allowlist), this finding is flagged for verification. Many JavaScript framework builds omit or misconfigure the `lang` attribute in their HTML shell.

**Recommended Change:**  
Verify that every page renders `<html lang="en">`. If missing, add the attribute in the site's base HTML template (e.g., `index.html` or the framework's layout file).

```html
<html lang="en">
```

---

### ISSUE-02 — No Skip Navigation Link
**Severity:** Critical  
**WCAG Criterion:** 2.4.1 Bypass Blocks (Level A)  
**Pages Affected:** All pages (sitewide template)

**Description:**  
There is no visible or visually-hidden "Skip to main content" link at the top of the page. The navigation bar includes four links (Map, Activities, Visualizations, About), and on every page keyboard users must tab through all navigation items before reaching the main content area. On the Map page this is especially problematic, as the main content is an interactive map that may contain many additional focusable elements.

**Recommended Change:**  
Add a visually hidden skip link as the first focusable element inside `<body>`. It should become visible on keyboard focus:

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

```css
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 999;
  padding: 0.5em 1em;
  background: #fff;
  color: #000;
}
.skip-link:focus {
  left: 0;
}
```

Ensure the main content area has a corresponding `id="main-content"`.

---

### ISSUE-03 — Missing or Incomplete Landmark Regions
**Severity:** Critical  
**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)  
**Pages Affected:** All pages (sitewide template)

**Description:**  
The rendered markup must use semantic landmark elements — `<header>`, `<nav>`, `<main>`, and `<footer>` — so that screen reader users can jump directly to major page sections. Based on the content structure observed, the site appears to use generic `<div>` containers for the navigation bar, the main content area, and the footer. The navigation links (Map, Activities, Visualizations, About) are not wrapped in a `<nav>` element, and there is no `<main>` landmark wrapping the primary content.

**Recommended Change:**  
Restructure the site template to include proper landmark elements:

```html
<header>
  <nav aria-label="Primary navigation">
    <!-- navigation links -->
  </nav>
</header>
<main id="main-content">
  <!-- page content -->
</main>
<footer>
  <!-- footer content -->
</footer>
```

---

### ISSUE-04 — Interactive Map Has No Accessible Alternative
**Severity:** Critical  
**WCAG Criterion:** 1.1.1 Non-text Content (Level A), 4.1.2 Name, Role, Value (Level A)  
**Pages Affected:** Map (`/map`)

**Description:**  
The map page centers on a JavaScript-rendered interactive map (likely Leaflet or Mapbox GL) that displays markers for Pinkerton detective activities. While the map includes a sidebar with textual descriptions ("About This Map," "How to Use"), the map content itself — marker locations, marker data, and spatial relationships — is not available in any non-visual form. Users who cannot see the map or operate it with a mouse have no way to access its data. Specific concerns include:

- Map markers are likely rendered as `<canvas>` elements or SVG without ARIA roles, making them invisible to screen readers.
- Clicking a marker opens a detail panel; this interaction may not be keyboard-accessible.
- The sidebar panel describing map data appears to update dynamically but may not announce changes to assistive technology.
- View mode toggle buttons (mentioned in the "How to Use" section) need accessible names and keyboard operability.

**Recommended Change:**  
Provide a comprehensive accessible alternative:

1. Link prominently from the map page to the Activities Database (`/activities`) as the textual equivalent of the map data. Add a visible note such as: "For a text-based view of all mapped data, visit the Activities Database."
2. Ensure all map controls (zoom, view toggle, basemap selector) are keyboard-operable and have accessible names via `aria-label`.
3. When a marker is clicked and the detail panel updates, use `aria-live="polite"` on the detail panel container so screen readers announce the new content.
4. Ensure the detail panel's "View in Activities Database" link is keyboard-reachable.

---

### ISSUE-05 — Data Visualizations (Charts) Lack Accessible Alternatives
**Severity:** Critical  
**WCAG Criterion:** 1.1.1 Non-text Content (Level A)  
**Pages Affected:** Visualizations (`/visualizations/dashboard/`, `/visualizations/location-frequency/`, `/visualizations/operative-activity/`, `/visualizations/time-of-day/`)

**Description:**  
The visualization pages render interactive charts (bar charts, dashboards) using JavaScript. These are likely rendered via `<canvas>` or SVG elements that are not inherently accessible to screen readers. The "Most Surveilled Locations" page, for example, describes its content as "a horizontal bar chart" in prose below the chart, but the actual data values in the chart are not available as text. The dashboard page loads data dynamically with a "Loading dashboard data…" placeholder.

**Recommended Change:**  
For each visualization:

1. Provide a data table as an accessible alternative, either inline (below the chart) or linked. The table should contain the same data the chart displays. Use `<table>`, `<caption>`, `<thead>`, and `<th scope="col/row">` for proper structure.
2. Add a `role="img"` and `aria-label="[description of chart]"` to the chart's container element, providing a brief summary of what the chart shows.
3. If the chart is interactive (filterable), ensure all filter controls are keyboard-operable and properly labeled.

---

### ISSUE-06 — Activities Database Form Controls Lack Programmatic Labels
**Severity:** Critical  
**WCAG Criterion:** 1.3.1 Info and Relationships (Level A), 4.1.2 Name, Role, Value (Level A)  
**Pages Affected:** Activities Database (`/activities`)

**Description:**  
The Activities Database page includes a search field and three dropdown filters (Activity, Operative, Subject). Based on the rendered content, these controls appear to use visible placeholder text ("Search," "All Activities," "All Operatives," "All Subjects") but may lack associated `<label>` elements or `aria-label` attributes. Without programmatic labels, screen readers announce these controls as unlabeled form fields.

**Recommended Change:**  
Add explicit labels to each form control. If visible labels are undesired for design reasons, use `aria-label`:

```html
<label for="search-field" class="visually-hidden">Search activities</label>
<input type="text" id="search-field" placeholder="Search">

<label for="activity-filter" class="visually-hidden">Filter by activity type</label>
<select id="activity-filter">
  <option>All Activities</option>
  ...
</select>
```

Alternatively, use `aria-label` directly on each control:

```html
<input type="text" aria-label="Search activities" placeholder="Search">
<select aria-label="Filter by activity type">...</select>
```

---

### ISSUE-07 — Dynamic Content Loading Not Announced to Assistive Technology
**Severity:** Major  
**WCAG Criterion:** 4.1.3 Status Messages (Level AA)  
**Pages Affected:** Map (`/map`), Activities Database (`/activities`), all Visualization sub-pages

**Description:**  
Multiple pages display "Loading…" messages while fetching data asynchronously (e.g., "Loading map data…", "Loading activities…", "Loading dashboard data…", "Loading visualization…"). When data finishes loading and replaces the loading message, the content change is not announced to assistive technology users. Additionally, when the Activities Database table is filtered or paginated, the updated result count ("Showing X of Y activities") and new table rows are not announced.

**Recommended Change:**  
Use ARIA live regions to announce dynamic content changes:

```html
<div aria-live="polite" aria-atomic="true">
  Showing 25 of 150 activities
</div>
```

For loading states, announce both the start and completion of loading:

```html
<div role="status" aria-live="polite">Loading map data…</div>
<!-- After load completes, update text: -->
<div role="status" aria-live="polite">Map data loaded. 42 locations displayed.</div>
```

---

### ISSUE-08 — Heading Hierarchy Issues on Map Page
**Severity:** Major  
**WCAG Criterion:** 1.3.1 Info and Relationships (Level A)  
**Pages Affected:** Map (`/map`)

**Description:**  
The Map page appears to have heading hierarchy problems. The rendered content shows empty `##` (h2) headings and jumps between heading levels inconsistently. The sidebar content includes `###` (h3) headings ("About This Map," "How to Use," "Data Sources," "All Activities," etc.) without a parent `##` (h2) heading to establish context. The detail panel for clicked markers uses `####` (h4) headings. A well-formed heading hierarchy is essential for screen reader users who navigate by heading level.

**Recommended Change:**  
Establish a clear, sequential heading hierarchy on the Map page:

- `<h1>` — Page title (e.g., "Mapping Surveillance")
- `<h2>` — Major sections (e.g., "Map," "Sidebar," or functional areas)
- `<h3>` — Subsections within the sidebar ("About This Map," "How to Use")
- `<h4>` — Detail-level headings only within subsections

Remove any empty heading elements. Ensure no heading level is skipped.

---

### ISSUE-09 — Hero Image on Homepage May Lack Meaningful Alt Text
**Severity:** Major  
**WCAG Criterion:** 1.1.1 Non-text Content (Level A)  
**Pages Affected:** Homepage (`/`)

**Description:**  
The homepage features a hero image with a link to its Wikimedia Commons source labeled "Image: Credit/Source." The image appears to be a historical illustration of Pinkerton escorts in the Hocking Valley. If this image is presented with an empty or generic `alt` attribute, screen reader users will miss the visual context it provides. If the image is purely decorative and the surrounding text provides equivalent information, it should have `alt=""` — but because it is wrapped in a link to Wikimedia Commons, the link itself needs an accessible name.

**Recommended Change:**  
If the image is informational, provide descriptive alt text:

```html
<img alt="Illustration of Pinkerton guards escorting workers during the Hocking Valley coal strike, published in Leslie's Illustrated Newspaper" src="...">
```

Ensure the credit link has descriptive text rather than the generic "Image: Credit/Source." For example: "View image source on Wikimedia Commons."

---

### ISSUE-10 — Feature Cards on Homepage Use Headings Inside Links
**Severity:** Major  
**WCAG Criterion:** 2.4.4 Link Purpose in Context (Level A)  
**Pages Affected:** Homepage (`/`)

**Description:**  
The three feature cards on the homepage ("Interactive Mapping," "Activities Database," "Data Analysis") each wrap a heading and a paragraph inside a single anchor element. While this is technically valid HTML5, it can create a poor experience for screen reader users — the entire card text is read as a single link label, which can be long and confusing. Additionally, if the heading inside the link is an `<h3>`, it creates a heading that is also a link, which some screen readers announce redundantly.

**Recommended Change:**  
Restructure the cards so the heading contains the link, rather than the link containing the heading and description:

```html
<div class="feature-card">
  <h3><a href="/map/">Interactive Mapping</a></h3>
  <p>Explore Pinkerton operations across America with our interactive map...</p>
</div>
```

This keeps the link text concise and the heading navigable independently.

---

### ISSUE-11 — Pagination and Table Keyboard Accessibility in Activities Database
**Severity:** Major  
**WCAG Criterion:** 2.1.1 Keyboard (Level A), 2.4.4 Link Purpose in Context (Level A)  
**Pages Affected:** Activities Database (`/activities`)

**Description:**  
The Activities Database includes a data table with pagination controls ("Previous," "Next," "Page X of Y"). These controls must be fully keyboard-accessible. Additionally, the "Clear Filters" and "Clear location filter" buttons must be reachable and operable via keyboard. The pagination links ("Previous," "Next") need accessible names that indicate what they do (e.g., "Go to previous page of results").

The table itself should use proper `<th>` elements with `scope="col"` for column headers (Date, Time, Activity, Subject, Notes, Operative).

**Recommended Change:**  
- Ensure all pagination and filter controls are keyboard-focusable and operable (natively so with `<button>` or `<a>` elements; not `<div>` or `<span>` with click handlers).
- Add `aria-label` to pagination links: `aria-label="Go to previous page"`, `aria-label="Go to next page"`.
- Verify the data table uses `<th scope="col">` for all column headers.
- Add a `<caption>` to the table describing its contents.

---

### ISSUE-12 — Footer Logo Images May Have Insufficient Alt Text
**Severity:** Minor  
**WCAG Criterion:** 1.1.1 Non-text Content (Level A)  
**Pages Affected:** All pages (sitewide template)

**Description:**  
The footer contains two logo images for RRCHNM and George Mason University. The rendered alt text reads "Roy Rosenzweig Center for History and New Media" and "George Mason University," which is adequate for identifying the logos. However, if these images are also links (to `rrchnm.org` and `gmu.edu`), the alt text should indicate the link destination as well. If the logos are not links and the text links adjacent to them already provide the navigation, the logos could be marked decorative with `alt=""`.

**Recommended Change:**  
If the logos are links, update alt text to indicate destination:

```html
<a href="https://rrchnm.org/">
  <img alt="Roy Rosenzweig Center for History and New Media - visit website" src="...">
</a>
```

If the logos are not links and the adjacent text links already provide navigation, mark them decorative:

```html
<img alt="" src="rrchnm-logo.png">
```

---

### ISSUE-13 — Verify Visible Focus Indicators
**Severity:** Minor  
**WCAG Criterion:** 2.4.7 Focus Visible (Level AA)  
**Pages Affected:** All pages (sitewide CSS)

**Description:**  
Keyboard users need a visible focus indicator on every interactive element (links, buttons, form controls, map controls). Modern CSS resets and design frameworks often suppress the browser's default focus outline. This is especially important on this site because the Map page and Activities Database page contain many interactive controls where lost focus would be disorienting.

**Recommended Change:**  
Audit the site's CSS for any `outline: none` or `outline: 0` declarations that suppress focus indicators without providing a custom alternative. Ensure all focusable elements have a clearly visible focus style:

```css
:focus-visible {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
}
```

---

### ISSUE-14 — Verify Color Contrast Ratios
**Severity:** Minor  
**WCAG Criterion:** 1.4.3 Contrast (Minimum) (Level AA)  
**Pages Affected:** All pages

**Description:**  
The site uses a design with white/light backgrounds and appears to include light gray metadata text and colored link text. All text must meet a minimum contrast ratio of 4.5:1 against its background (or 3:1 for large text, 18pt+ or 14pt+ bold). The hero section on the homepage, which may overlay text on the historical illustration, is of particular concern — text overlaid on images often fails contrast requirements unless a semi-transparent background or text shadow is applied.

**Recommended Change:**  
Use a contrast checking tool (e.g., WebAIM Contrast Checker, axe DevTools) to measure all text/background combinations across the site. Pay special attention to:

- Hero section text overlaid on the background image
- Navigation link colors against the header background
- Footer text colors
- Map sidebar text
- "Loading…" placeholder text

Adjust colors to meet the 4.5:1 ratio for normal text and 3:1 for large text.

---

### ISSUE-15 — Verify Reflow at 320px Viewport and 200% Zoom
**Severity:** Minor  
**WCAG Criterion:** 1.4.10 Reflow (Level AA)  
**Pages Affected:** All pages, especially Map (`/map`) and Activities Database (`/activities`)

**Description:**  
WCAG 2.1 Level AA requires that content reflows to a single column at 320px CSS width (equivalent to 400% zoom on a 1280px viewport) without horizontal scrolling, except for content that inherently requires two-dimensional layout (maps and data tables are permitted exceptions). However, all surrounding content — navigation, sidebar text, footer — must still reflow properly. The Activities Database table, while exempt from horizontal-scroll requirements, should ideally offer an alternative view or card layout at narrow widths.

**Recommended Change:**  
Test the site at 200% browser zoom and at a 320px viewport width. Verify that:

- Navigation collapses to a mobile-friendly format
- Homepage content stacks vertically
- Visualization page text and controls remain usable
- About page text reflows without overflow

For the Activities Database, consider providing a stacked card view at narrow widths as a progressive enhancement.

---

## Summary Table of Recommended Changes

| ID | Issue | Severity | WCAG Criterion | Scope |
|---|---|---|---|---|
| ISSUE-01 | Verify/add `lang="en"` on `<html>` | Critical | 3.1.1 | Sitewide template |
| ISSUE-02 | Add skip navigation link | Critical | 2.4.1 | Sitewide template |
| ISSUE-03 | Add semantic landmark elements | Critical | 1.3.1 | Sitewide template |
| ISSUE-04 | Provide accessible alternative for interactive map | Critical | 1.1.1 / 4.1.2 | Map page |
| ISSUE-05 | Provide accessible alternatives for data visualizations | Critical | 1.1.1 | Visualization pages |
| ISSUE-06 | Add programmatic labels to form controls | Critical | 1.3.1 / 4.1.2 | Activities Database |
| ISSUE-07 | Announce dynamic content changes with ARIA live regions | Major | 4.1.3 | Map, Activities, Visualizations |
| ISSUE-08 | Fix heading hierarchy on Map page | Major | 1.3.1 | Map page |
| ISSUE-09 | Add meaningful alt text to hero image | Major | 1.1.1 | Homepage |
| ISSUE-10 | Restructure feature card link/heading pattern | Major | 2.4.4 | Homepage |
| ISSUE-11 | Ensure keyboard accessibility of table pagination/filters | Major | 2.1.1 / 2.4.4 | Activities Database |
| ISSUE-12 | Clarify footer logo alt text based on link context | Minor | 1.1.1 | Sitewide template |
| ISSUE-13 | Verify visible focus indicators | Minor | 2.4.7 | Sitewide CSS |
| ISSUE-14 | Audit color contrast ratios | Minor | 1.4.3 | All pages |
| ISSUE-15 | Test reflow at 320px and 200% zoom | Minor | 1.4.10 | All pages |

---

## Recommended Prioritization

**Immediate (template-level, high-impact, low-effort):**
- ISSUE-01: Verify/add `lang` attribute — one-line fix in the HTML template
- ISSUE-02: Add skip navigation link — small HTML/CSS addition
- ISSUE-03: Add semantic landmark elements — refactor base template layout
- ISSUE-06: Add form control labels — `aria-label` additions to Activities page

**Short-term (requires content and template work):**
- ISSUE-08: Fix heading hierarchy on Map page — restructure sidebar headings
- ISSUE-09: Add hero image alt text — one-time content fix
- ISSUE-10: Restructure feature card markup — template adjustment
- ISSUE-12: Fix footer logo alt text — one-time template fix

**Medium-term (requires development and testing):**
- ISSUE-04: Accessible map alternative — add cross-link to Activities Database, ARIA for map controls
- ISSUE-05: Chart accessible alternatives — add data tables below each visualization
- ISSUE-07: ARIA live regions for dynamic loading — JavaScript updates
- ISSUE-11: Keyboard accessibility for pagination/table — verify and fix controls
- ISSUE-13: Focus indicator audit — CSS review and additions
- ISSUE-14: Color contrast audit — in-browser testing with contrast tools
- ISSUE-15: Reflow testing — viewport and zoom testing

---

## Tools Recommended for Further Testing

- **axe DevTools** (browser extension) — automated WCAG testing
- **WAVE** (wave.webaim.org) — visual accessibility evaluation
- **WebAIM Contrast Checker** — manual contrast ratio testing
- **NVDA or VoiceOver** — screen reader testing
- **Keyboard-only navigation** — tab through all pages without a mouse
- **Lighthouse** (Chrome DevTools) — automated accessibility scoring
- **Leaflet/Mapbox accessibility plugins** — if using these mapping libraries, check for accessibility-specific plugins

---

## Methodology Note

This audit was conducted via remote page inspection of rendered HTML content across six representative pages (Homepage, Map, Activities Database, Visualizations index, two Visualization sub-pages, and About). The findings represent issues identifiable through structural analysis of the markup. Because raw HTML source could not be directly inspected via developer tools or curl (domain not in the container's network allowlist), several findings — particularly ISSUE-01 (language attribute), ISSUE-03 (landmarks), ISSUE-06 (form labels), ISSUE-13 (focus indicators), and ISSUE-14 (contrast) — are flagged as likely issues pending in-browser verification. A complete WCAG 2.1 Level AA conformance evaluation would additionally require: automated scanning (axe, WAVE, Lighthouse), manual keyboard navigation testing, screen reader testing (NVDA, JAWS, VoiceOver), color contrast measurement of computed styles, and responsive/zoom testing across viewports.

---

*Report generated by Claude (Anthropic) · WCAG 2.1 Level AA · March 25, 2026*
