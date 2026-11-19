# Later: Sections 3 and 4

← [README](README.md)

Rough plans, so the intro's architecture leaves room for them. Each becomes
a new layout file plus copy keys; neither needs renderer changes beyond what
the intro builds, except where noted.

Song counts per decade in the current snapshot:

| 1950s | 1960s | 1970s | 1980s | 1990s | 2000s | 2010s | 2020s |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| 178   | 1,547 | 1,290 | 1,314 | 742   | 736   | 837   | 616   |

Songs per year range from 49 to 174.

---

## Section 3 ("Getting loopier 🔁"): dots become the decade bar chart

Today: `EffectiveDecades.svelte`, a 100% stacked bar per decade, segments by
effective-progression band (`HOMOGENEITY_BANDS`), from
`effective-progressions-by-decade.csv`.

**Idea:** the map's dots fly into a **unit chart**. Each decade is a column,
each song a dot, stacked by band (≈1 progression at the bottom, highlighted),
colored by band.

**Layout: `decadeBars`** (`layouts/decadeBars.ts`)

- Inputs from `SongTable`: `year` → decade; `homogeneity.effectiveProgressionCount`
  → band (same function the CSV build uses; check
  `tasks/build-charts.ts` so the dots and the old chart agree exactly).
- Columns: 8 decades across the frame, a gap between them. Inside a column,
  dots sit on a grid (`cols × rows`) filled bottom-up in band order, then by
  year within a band. Deterministic, O(n), no simulation.
- **The decision to make:** counts vs. shares.
  - _Counts_ (one dot = one song, equal pitch everywhere): honest unit chart,
    but the 1950s column is tiny and the 1960s huge. The story's point is
    shares ("loopier over time"), which counts muddy.
  - _Shares_ (every column the same height, its own dot pitch): matches
    today's chart and the point, but dots in the 1950s column are bigger and
    spaced differently, which is a little dishonest for a unit chart.
  - Possible middle ground: animate counts first, then "normalize" to shares
    as a second step (two scenes, two slides). The layout takes
    `params.normalize: boolean`, and the transition between them is free.
- `pointRadius` from the layout: 7,260 dots in 8 columns on a 390px-wide
  phone frame gives about 40px per column. A 2px pitch is tight. Likely
  radius 1–1.5px on phones, 2px on desktop. **This is why `pointRadius` is in
  `LayoutResult` from day one.**
- `color`: a new `"band"` color mode (dots colored by band). Add it to the
  color lerp in commit 8's machinery.
- `guides`: decade labels under the columns, a band legend, maybe percent
  labels on the "≈1" segment (`columnLabel` guides).
- `aggregate: "none"`.

**Transitions:** UMAP → bars is a big jump; stagger by decade (left to right)
so it reads as "sorting". Possibly go through the timeline first: the sky
already has x = time, so time → decade columns is mostly a short horizontal
snap plus vertical stacking. That's a good argument for a "sky" beat at the
start of Section 3.

**Perf note:** 7,260 dots at 1–2px is fine for Canvas. The cost to watch is
the per-song color lerp from region colors to band colors (quantize, as in
commit 8).

---

## Section 4 ("Era definers 🗓️"): beeswarms over time per progression

Today: `ClusterPercentOverTime.svelte` (a line/area chart of a cluster's
share by year) and `Signatures.svelte`.

**Idea:** x is time (the same x as the sky), and the songs of the
progressions being discussed rise out of the sky into **lanes**, one per
progression. Each lane is a beeswarm (a dot histogram per year), so its
silhouette is the time series. Everything else stays as faint sky behind,
or falls to a gray "all other songs" band.

**Layout: `progressionLanes`** (`layouts/progressionLanes.ts`)

- `params`: `{ progressions: string[]; others: "sky" | "band" | "hidden" }`.
- x: **identical to `timeline`'s x** (share the helper), so moving
  between sky and lanes is purely vertical. That's the continuity that
  makes it read as one map.
- y: lane _k_ occupies a horizontal band. Within it, songs of each year stack
  upward from the lane's baseline (a dot histogram, which is deterministic
  and O(n)). A true force beeswarm isn't needed with year bins, and avoiding
  one avoids a ~1s simulation.
- Raw counts vs. share of that year's songs: the existing chart shows
  percent of songs per year. A dot histogram shows counts; with 49–174 songs
  per year, counts and shares differ a lot across eras. Same decision as
  Section 3; consider a `normalize` param that scales each year's stack by
  `1 / songsThatYear`. Dots then overlap a bit, but the silhouette matches
  the percent chart.
- Membership: from `SongTable.clusterName` (the map's clusters). If the
  section's numbers come from `top-progressions.csv`/`*_by_year.csv`
  (coverage-based, not cluster-based), use the same rule the CSV build uses,
  or the dots won't match the numbers in the text. **Check this first.**
- `color`: `"region"` (each lane its cluster's color) works as-is.
- `guides`: year ticks, lane titles (`columnLabel`), maybe the percent line
  drawn over the stack as a `path` guide (a new guide kind).
- Reuse to look at: `src/components/charts/ClusterYearBeeswarm.svelte` and
  `beeswarmSongs.ts`, which already pack one cluster's songs by year for the
  explore panel and tooltip.

**Interactions:** hovering a lane dot shows the song tooltip; clicking a
featured song plays it (all existing machinery). Playing through a lane's
featured songs in time order, with the camera panning along x, is a natural
"listen through the decades" beat that the Player plus `focusSong` can
already do.

---

## Things the intro must not paint itself out of

Covered by the intro's design, listed so they stay true:

- `pointRadius` and `color` are per-layout, not global constants.
- Layouts get a frame size, so dense layouts can adapt to phones.
- `guides` is an open union, so new kinds (path, legend) are additive.
- Transitions support stagger, so "sort by decade" or "rise by lane" are a
  stagger array, not new animation code.
- The scene parser is the one place new copy keys go, e.g.
  `layout: decadeBars`, `normalize: true`, `progressions: …`.
