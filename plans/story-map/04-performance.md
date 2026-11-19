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

| When           | Device  | Slide / action              | draw p50 | draw p95 | fps |
| -------------- | ------- | --------------------------- | -------- | -------- | --- |
| before (main)  | desktop | Section 2 cluster → cluster |          |          |     |
| before (main)  | phone   | Section 2 cluster → cluster |          |          |     |
| after commit 4 | phone   | same                        |          |          |     |
| after commit 5 | phone   | same                        |          |          |     |
| after commit 8 | phone   | UMAP ↔ sky                  |          |          |     |

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
