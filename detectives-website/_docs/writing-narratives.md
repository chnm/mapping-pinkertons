# Writing Case Narratives

This guide covers how to create and edit investigation narrative pages for the Mapping Private Investigations website.

## File Location

Narrative pages live in `content/narratives/`. Each investigation has its own markdown file:

```
content/narratives/
├── _index.md              # Investigations list page
├── el-paso.md             # El Paso Smelter Fraud
├── nyc.md                 # Robbery of the Corn Exchange Bank
├── hobart.md              # Murder of William Hobart
└── atlanta.md             # Atlanta Laundry Thefts
```

## Frontmatter

Every narrative file requires this frontmatter:

```yaml
---
title: "Investigation Title"
description: "A one-sentence summary of the case."
investigation: "el-paso"       # Must match the investigation key in the database
location: "El Paso, Texas"     # Display location shown under the title
weight: 1                      # Controls sort order on the Investigations page
---
```

The `investigation` field is critical — it connects the narrative to the correct dataset and generates the "View on Map" and "Open Dashboard" links with the proper `?investigation=` parameter.

Valid investigation keys: `el-paso`, `nyc`, `hobart`, `atlanta`

## Writing Content

Write the narrative body in standard Markdown below the frontmatter. Hugo processes the content through the Goldmark renderer with `unsafe: true` enabled, so raw HTML is allowed if needed.

```markdown
---
title: "El Paso Smelter Fraud"
...
---

## Overview

The Pinkerton National Detective Agency was hired to investigate...

## Investigation

Operative #43 arrived in El Paso on July 27, 1939...
```

Standard Markdown features are supported:
- Headings (`##`, `###`, `####`)
- Bold (`**text**`), italic (`*text*`)
- Links (`[text](url)`)
- Block quotes (`> text`)
- Lists (ordered and unordered)
- Code blocks
- Tables
- Footnotes (rendered with littlefoot.js for popup footnotes)

## Figure Shortcode

Use the `figure` shortcode to insert images with captions. Images should be placed in `static/images/` (or a subdirectory like `static/images/narratives/`).

### Basic Usage

```
{{</* figure src="/images/narratives/photo.jpg" alt="Description of the image" title="Caption text shown below the image" */>}}
```

### Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `src`     | Yes      | —       | Path to the image (relative to `static/`) |
| `alt`     | No       | `""`    | Alt text for accessibility |
| `title`   | No       | —       | Caption displayed below the image |
| `align`   | No       | `center`| Alignment: `center`, `left`, or `right` |
| `width`   | No       | —       | Max width as CSS value (e.g., `50%`, `300px`) |

### Alignment and Width Examples

**Centered** (default) — block element, centered:

```
{{</* figure src="/images/example.jpg" alt="A photo" title="Figure 1: Example" */>}}
```

**Centered at 60% width**:

```
{{</* figure src="/images/example.jpg" alt="A photo" title="Figure 1: At 60% width" width="60%" */>}}
```

**Float left at 30% width** — image floats left, text wraps to the right:

```
{{</* figure src="/images/example.jpg" alt="A photo" title="Figure 1: Example" align="left" width="30%" */>}}
```

**Float right at 40% width** — image floats right, text wraps to the left:

```
{{</* figure src="/images/example.jpg" alt="A photo" title="Figure 1: Example" align="right" width="40%" */>}}
```

**Fixed pixel width**:

```
{{</* figure src="/images/example.jpg" alt="A photo" title="Figure 1: Example" width="300px" align="right" */>}}
```

### Notes

- Without `width`, images expand to fill available space.
- The `width` parameter sets `max-width` on the figure, so images won't exceed it but may be smaller on narrow screens.
- Floated images (`left` / `right`) have appropriate margins to separate them from surrounding text.
- Always provide `alt` text for accessibility.
- The `title` parameter is optional — omit it for images that don't need a caption.

## Page Layout

Each narrative page automatically includes:

1. **Breadcrumb** — link back to the Investigations list
2. **Title and metadata** — from the frontmatter
3. **Quick links** — "View on Map" and "Open Dashboard" badges that deep-link to the map and dashboard filtered to this investigation
4. **Content** — the Markdown body rendered as prose

## Adding a New Investigation Narrative

1. Create a new file in `content/narratives/`, e.g., `content/narratives/new-case.md`
2. Add the required frontmatter with a valid `investigation` key
3. The investigation key must exist in:
   - The database (`detectives.activities.investigation` column)
   - The map's `locations` object in `layouts/_default/map.html`
   - The dashboard's `INVESTIGATIONS` object in `static/js/visualizations/dashboard.js`
4. Write the narrative content
5. The page will automatically appear on the Investigations list page, with Map and Dashboard tiles

## Investigations List Page

The list page at `/narratives/` is generated from `content/narratives/_index.md`. It groups each investigation with three tiles:

- **Narrative** — links to the case narrative page
- **Map** — links to `/map/?investigation=<key>`
- **Dashboard** — links to `/visualizations/dashboard/?investigation=<key>`

The sort order is controlled by the `weight` frontmatter field (lower weight = higher position).
