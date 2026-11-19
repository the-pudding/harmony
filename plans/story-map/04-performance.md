# Performance

← [README](README.md)

**Target:** 60fps during every map transition on a recent phone (iPhone 13+
or Pixel 7+ class), with ~7,300 dots. Draw ≤ 6ms p95 per frame on those
phones. That leaves room for d3-zoom, Svelte and the browser in a 16.7ms
frame.

**Approach:** measure first (commit 2's `?perf=1` meter), take the cheap,
low-risk precautions below as part of the refactor, and keep anything bigger
(WebGL, workers) as a documented escape hatch.

## Baseline

_Fill in during commit 2, then after commits 4, 5 and 8._

| When                    | Device  | Slide / action              | draw p50 | draw p95  | fps   |
| ----------------------- | ------- | --------------------------- | -------- | --------- | ----- |
| before (main)           | desktop | Section 2 cluster → cluster | 2.0–2.3  | 3.8–8.2   | 69–85 |
| before (main)           | phone   | Section 2 cluster → cluster |          |           |       |
| before commit 4 (rerun) | desktop | Section 2 cluster → cluster | 1.8–3.6  | 2.3–8.5   | 59–61 |
| before commit 4         | desktop | Explore, dot zoom, dragging | 3.4–4.8  | 17.4–17.7 |       |
| after commit 4          | desktop | Section 2 cluster → cluster | 1.8–3.3  | 2.6–7.4   | 60–61 |
| after commit 4          | desktop | Explore, dot zoom, dragging | 4.0–4.2  | 17.5–18.2 |       |
| after commit 4          | phone   | Section 2 cluster → cluster |          |           |       |
| after commit 5          | desktop | Section 2 cluster → cluster | 1.4–3.2  | 1.3–7.2   | 59–61 |
| after commit 5          | phone   | Section 2 cluster → cluster |          |           |       |
| after commit 8          | phone   | UMAP ↔ sky                  |          |           |       |

Notes on the numbers:

- The desktop row is headless Chrome (1280×800, no throttling) on a dev
  machine, from `?perf=1&slide=8` then stepping `ArrowRight` to slides 10–14
  (Section 2 clusters) with 1.5s between steps; the range is the overlay's
  reading about 1.5s after each step (the last 120 draws). Draw ms is
  `draw()` only (the canvas paint), not d3-zoom, Svelte or compositing.
- "fps" is draws per second, not displayed frames: a prop change can trigger
  both the `$effect(draw)` and a tween frame, so it can read above 60.
- Commit 4 and later desktop rows are also headless Chrome (1280×800), three
  to five runs each, ranges across runs and slides; run-to-run noise on one
  machine is about ±1ms at p50, so treat small differences as equal. Section
  2 never changes layout, so these draws are camera moves (and the first
  layout) only; the transition engine itself is only exercised from commit
  8 on.
- "Explore, dot zoom, dragging": `?perf=1&slide=34`, wheel-zoom just past
  dot zoom (6 × 200px wheel steps at 700,420) over the dense center, then
  drag in circles for ~2s and read the overlay. About 2,000 dots are on
  screen. The drag also hovers songs (tooltips, rings), so its p95 includes
  those frames; its frame intervals and fps are paced by the test's mouse
  events and say nothing about the map.
- "Explore, dot-zoom drag" below is a cleaner probe than the dragging rows
  above: the same view, but the drag is dispatched in the page, one
  mousemove per animation frame for 240 frames, so the last 120 draws are
  all drag frames (~2,000 dots on screen); three runs each, draw p50 / p95
  in ms:

  | Version                  | dot zoom (6 wheel steps) | hex zoom (5 steps) |
  | ------------------------ | ------------------------ | ------------------ |
  | before commit 4          | 4.1 / 4.3–4.4            | 2.8 / 3.1          |
  | after commit 4           | 3.6–3.7 / 3.8–4.4        | 2.8–3.1 / 3.1–3.4  |
  | after commit 5 (batched) | 3.0–3.2 / 3.1–3.5        | 2.9–3.1 / 3.1–3.3  |

  On desktop Chrome, profiles put the native arc/fill time well under
  0.1ms a frame either way; most of commit 5's gain here is caching each
  song's region fill string while the zoom's gradient holds (at dot zoom
  it's constant), instead of interpolating 2,000 Lab colors per frame. The
  batching should matter more on phones, where each fill() costs more;
  that needs the phone rows.

- Commit 8 (timeline sky), desktop, `?perf=1&slide=34`, draw p50 / p95 in ms:
  - Sky at rest, all ~7,100 stars on screen, dragged in the page like the
    probe above (`?layout=timeline`): 2.7 / 2.9, two runs (UMAP's 1× hex
    view is 1.1 / 1.2 on the same probe, since it paints hexes, not dots).
  - UMAP ↔ sky transitions (a temporary toggle, not committed), reading
    the overlay 1.2s after each of four flips: 3.7–4.1 / 5.5–7.7. That's
    the per-song position, alpha and color mix, the 24-step color cache
    and ~7,100 dots in a handful of batches, every frame for 700ms; frames
    stayed at ~16.7ms (one run's first flip read 53 fps with its p95 at 7.7).
    Phone rows still need a real device.
- From commit 4 on, the overlay's "dots" counts the plain dots actually
  painted (on screen, not hidden, not markers) rather than every song.
- A CPU profile of that drag puts the biggest single draw cost in
  `fitClusterEllipse2D` (its `percentile` sorts), which refits every
  cluster outline from screen positions on every dot-zoom frame. Batching
  dots (commit 5) doesn't touch that; caching outlines in base pixels and
  transforming them per frame would, if numbers ever call for it.
- The phone row needs a real device: open the dev server on the phone with
  `?perf=1&slide=<n>` and step through the clusters.

## Where frame time goes today (from reading the code)

| Cost                                                                                                                        | Fix                                                                                         | Commit |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| `positionTween` builds a new `Map` and 7,260 `{nx, ny}` objects **every frame** → GC pauses mid-animation (worst on phones) | Preallocated `Float32Array` buffers, mutated in place                                       | 4      |
| Painters look up every dot with `positions.get(songKey)` (string-keyed hashing ×7,260/frame)                                | Index-based reads                                                                           | 4      |
| `drawDots` sets `globalAlpha` + `fillStyle` and fills one path **per dot**                                                  | Bucket by (color, alpha, radius): a handful of `fill()` calls                               | 5      |
| Hex layout cache is keyed on the positions object, so a tween in hex mode would **re-bin all songs every frame**            | Never draw hexes mid-flight; bin once when settled; cache keyed on a settled version number | 4, 6   |
| Per-dot color strings for color transitions                                                                                 | Quantize lerped colors (24 steps) and cache the strings                                     | 8      |

## Precautions (do as we go)

- **Nothing per-frame in `$state`.** Positions, alphas and colors live in
  typed arrays outside Svelte's graph. The rAF loop calls `draw()` directly
  (as `positionTween` already does). Only things the DOM needs, like
  `settled` and label spots, are `$state`, and they're written only when
  they change.
- **Draw only when something changes.** No idle loop. The canvas is redrawn
  by transitions, camera moves, hovers and prop changes.
- **Cap the pixel ratio** at 2 for the main canvas. A 3× phone canvas is 2.25×
  the pixels of 2× for no visible gain on 3px dots.
- **Cull off-screen dots** (`isOnScreen`, already there). It matters most on
  slide 0, where 7,259 dots are at alpha 0: skip alpha-0 dots before any
  math.
- **Labels stay few.** Canvas text is expensive. Only spotlit and featured
  songs get labels (the video slide labels one song at a time).
- **Layouts are memoized** and only re-run on frame size or param changes,
  never per frame. Anything slow (force simulations) is precomputed at build
  time (see [05-later-sections.md](05-later-sections.md)).
- **Hit-testing** stays a linear scan over visible dots (7,300 squared
  distances per mousemove is ~0.1ms). If the explore slide ever feels laggy, a
  uniform grid index is a small, contained change in `hitTesting.ts`.
- **The inset minimap** (`HexMap`'s second `EmbeddingScatter`) only matters
  on the explore slide. Make sure it's not drawing during intro transitions:
  it's only visible at zoom ≥ 1.5, but it currently redraws whenever its
  props change. Give it `layout` = the UMAP result only, so intro layout
  changes don't touch it.
- **`prefers-reduced-motion`** gets short alpha crossfades instead of flying
  dots (commit 16). That's also the cheapest path.

## Escape hatches (only if the numbers say so)

1. **Sprite dots:** pre-render one dot per (color, radius) bucket to an
   offscreen canvas and `drawImage` it. Often faster than `arc` on mobile
   Safari.
2. **WebGL points** behind the `drawDots` seam: one `gl.drawArrays(POINTS)`
   with position, alpha and color buffers. Hexes, markers, labels and guides
   stay on a 2D canvas layered above. Big change; don't do it speculatively.
3. **OffscreenCanvas in a worker:** not worth it for this dot count.
