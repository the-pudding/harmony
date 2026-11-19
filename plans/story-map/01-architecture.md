# Architecture

← [README](README.md)

## Where we are today

```
Index.svelte ──map props from copy──▶ HexMap.svelte ──▶ EmbeddingScatter.svelte (canvas)
                                      │                  ├─ positionTween   (Map<songKey,{nx,ny}>, 700ms)
                                      │                  ├─ camera          (d3-zoom + scripted focus)
                                      │                  ├─ spotlightTween
                                      │                  └─ paint/*         (hexes, dots, markers, labels)
                                      └─ snapshot → points (UMAP x/y + purity radial layout)
```

Things the new design builds on:

- **Positions already tween by song key** (`scatter/positionTween.svelte.ts`).
  Changing `points` animates every dot from where it is to where it should
  be. The building block is there; it's only ever been used for one layout.
- **Positions are normalized to 0–1** (`normalizePoints`) and mapped onto the
  plot rect (`viewport.ts: toBasePixel`). The camera (d3-zoom) then maps base
  pixels to the screen. Layouts can therefore stay in 0–1 space, and the
  camera, hit-testing and painters don't need to change.
- **Hex vs. dots depends on zoom** (`hexZoomLevel(transform.k)`): hexes below
  4×, dots above. That's right for UMAP and wrong for every other layout,
  where we want dots at 1×.
- **Painting is already split** into small pure painters (`paint/*.ts`) fed a
  `Scene`. That split stays.
- `EmbeddingScatter` is only used through `HexMap`, so we can change its
  props freely. The `/demo` routes don't use it.

Things that won't scale:

- `HexMap` hard-codes one arrangement (`displayPoints`).
- The tween allocates a new `Map` with 7,260 fresh objects every frame.
- Hex binning is cached by the positions object, which is new every tween
  frame. A tween in hex mode would re-bin 7,260 songs on every frame.
- The slide's map settings are about 10 flat, loosely typed props, all
  carried from the copy through `mapPropsFromCopy` and `HexMap`.

## The new model in four nouns

```
            ┌──────────────┐   once per snapshot
snapshot ──▶│  SongTable   │  columnar, index-stable: key, year, umap x/y, cluster, band…
            └──────┬───────┘
                   │
copy.map ──parse──▶ MapScene  ── "what this slide's map should be" (typed, declarative)
                   │   layout: { name, params } · camera · songs (only/highlight/playable/labeled)
                   │   labels · interaction · guides
                   ▼
            ┌──────────────┐   pure, memoized by (layout, params, frame size)
            │   Layout     │──▶ LayoutResult: x[], y[] (0–1 in frame), aggregate, color, radius, guides
            └──────┬───────┘
                   ▼
            ┌──────────────┐   typed arrays; retargets mid-flight; reports settled
            │  Transition  │──▶ current x/y/alpha per song, every frame
            └──────┬───────┘
                   ▼
              painters (canvas) + camera (d3-zoom) + HTML overlays (titles, labels, tooltips)
```

### 1. `SongTable`: every song, once, by index

`src/components/storymap/songTable.ts` (pure, tested)

```ts
export type SongTable = {
	readonly count: number;
	readonly keys: readonly string[]; // index → songKey (snapshot order)
	readonly indexOf: ReadonlyMap<string, number>;
	readonly year: Uint16Array;
	readonly umapX: Float32Array; // raw snapshot x/y, before purity layout
	readonly umapY: Float32Array;
	readonly title: readonly string[];
	readonly artists: readonly string[][];
	// derived once, used by later layouts
	readonly clusterName: readonly (string | null)[];
	readonly homogeneity: readonly (SongHomogeneity | null)[];
};
export const buildSongTable = (snapshot: HexMapSnapshot): SongTable;
```

Why columnar and by index: every per-frame loop then runs over plain arrays
by integer index, with no `Map.get(songKey)` per dot per frame. Song keys only
appear at the edges: copy, clicks, the player.

`HexMap` already builds most of this (`coverageBySongKey`,
`homogeneityBySongKey`, `songSummaryByKey`, `clusterRegionBySongKey`). Those
move here or are derived from here, so they're built once.

### 2. `Layout`: a pure function from songs to positions

`src/components/storymap/layouts/`

```ts
// layouts/types.ts
export type LayoutFrame = { width: number; height: number }; // CSS px of the rect it fills

export type LayoutContext = { songs: SongTable; frame: LayoutFrame };

export type LayoutResult = {
	// 0–1 within the frame, by song index; NaN = this layout doesn't place
	// the song (it fades out where it is).
	x: Float32Array;
	y: Float32Array;
	// "hex": bin into hexes when zoomed out (UMAP only, today). "none": dots.
	aggregate: "hex" | "none";
	// How dots are filled: plain stars, or by region/cluster as the hex map does.
	color: "star" | "region";
	// Dot radius at 1×, in screen px. Dense layouts (decade bars on a phone)
	// shrink it.
	pointRadius: number;
	// Things drawn with the layout: axis labels, ticks, column labels. They
	// fade in and out with it (see guides below).
	guides: readonly Guide[];
	// Optional per-song stagger (0–1) for transitions *into* this layout,
	// e.g. by year so the sky "sweeps" in. Default: none.
	stagger?: Float32Array;
};

export type Layout<Params> = {
	name: string;
	compute: (context: LayoutContext, params: Params) => LayoutResult;
};
```

```ts
// layouts/index.ts: the registry, and the only place names live
export const layouts = {
	umap: umapLayout, // today's map (snapshot x/y + purityRadialLayout)
	timeline: timelineLayout // the "night sky"
	// later: decadeBars, progressionBeeswarm (see 05-later-sections.md)
} satisfies Record<string, Layout<any>>;
export type LayoutName = keyof typeof layouts;
```

Rules for layouts, so they stay simple and swappable:

- **Pure and deterministic.** No `Math.random()`. Use a seeded hash of the
  song key, like today's `jitterFor`, so a reload gives the same sky.
- **Know nothing about the camera, canvas, Svelte or slides.**
- **Cheap, or precomputed.** It runs again when the frame size changes.
  Anything over ~20ms on a phone (e.g. force simulations) is precomputed in a
  build task, the way `npm run hexmap` precomputes UMAP.
- **Memoized** by `(name, params by value, frame width/height)` in one place
  (`layouts/cache.ts`), never inside a layout.

Each layout is one small file with its own unit tests: positions in range,
deterministic, sensible ordering (e.g. timeline: a 1960 song is left of a
2020 song).

### 3. `MapScene`: what a slide wants, in one typed object

`src/components/storymap/mapScene.ts` (pure, tested)

Writers keep editing **flat keys** in the Google Doc's `{.map}` block, which
are friendlier in ArchieML. `parseMapScene(copyMap)` turns them into one typed
object. Index passes that object to the map instead of ~10 loose props.

```ts
export type MapScene = {
	layout: { name: "umap" } | { name: "timeline"; axisLabel: string | null };
	camera:
		| { kind: "home"; centered: boolean } // today's default (+ `centered`)
		| { kind: "cluster"; name: string } // today's focusCluster
		| { kind: "song"; songKey: string }; // new: zoomed in on one dot
	songs: {
		only: readonly string[] | null; // null = all; else everyone else fades out
		highlighted: readonly string[]; // today's highlightSongs (enlarged, inert)
		playable: readonly string[]; // enlarged, 🎧, clickable to play
		dimmed: boolean; // everything not highlighted drawn faint (slide 2)
	};
	media: { followVideo: string | null; litVideoSongs: string | null }; // see below
	labels: { hidden: boolean; only: readonly string[] | null; rotate: boolean };
	interaction: { movable: boolean; hoverable: boolean };
	player: { hidden: boolean };
};
```

Copy keys → scene. Legacy keys keep working, so Sections 2–6 don't change.

| Copy key (`{.map}`)                  | Scene field                | Notes                                                  |
| ------------------------------------ | -------------------------- | ------------------------------------------------------ |
| `visible: true`                      | (scene exists)             | unchanged                                              |
| `layout: timeline`                   | `layout.name`              | **new**, default `umap`                                |
| `axisLabel: time →`                  | `layout.axisLabel`         | **new**, timeline only                                 |
| `focusCluster`                       | `camera: {kind:"cluster"}` | unchanged                                              |
| `focusSong`                          | `camera: {kind:"song"}`    | **new**                                                |
| `centered`                           | `camera.centered`          | unchanged                                              |
| `onlySongs` (list)                   | `songs.only`               | **new**                                                |
| `highlightSongs` (list)              | `songs.highlighted`        | unchanged                                              |
| `playableSongs` (list)               | `songs.playable`           | **new** (featured songs stay playable in Section 2)    |
| `dimmed: true`                       | `songs.dimmed`             | **new**                                                |
| `followVideo: examples`              | `media.followVideo`        | **new**: spotlight and light songs as that video plays |
| `litVideoSongs: examples`            | `media.litVideoSongs`      | **new**: those songs start already lit (slide 4)       |
| `hideLabels/showLabels/rotateLabels` | `labels.*`                 | unchanged                                              |
| `movable/hoverable`                  | `interaction.*`            | unchanged                                              |
| `hidePlayer`                         | `player.hidden`            | unchanged                                              |

`parseMapScene` is where string→boolean, comma lists, trimming and defaults
happen (today's `mapPropsFromCopy` and `parseBoolean` move here). Unknown keys
are a `console.warn` in dev, so a typo in the doc is noticed.

**Runtime state is separate from the scene.** The scene is static per slide.
What the reader does or what's playing (`explore.*`, the video's current
song, hovered songs) is passed alongside it, as today. That keeps "what the
copy asked for" and "what the reader is doing" from mixing.

### 4. `Transition`: typed arrays, retargetable, reports when it settles

`src/components/hexmap/components/scatter/transition.svelte.ts`, replacing
`positionTween.svelte.ts`

```ts
createTransition({
  get target(): { x: Float32Array; y: Float32Array; alpha: Float32Array; stagger?: Float32Array },
  get durationMs(): number,          // 700 for small moves, ~1600 for layout changes
  get instant(): boolean,            // resize, first paint, instantFocus
  onFrame: () => void,
}) → {
  x: Float32Array, y: Float32Array, alpha: Float32Array,  // current, mutated in place
  readonly settled: boolean,         // $state, flips only at start and end
}
```

- `from`/`to`/`current` are preallocated `Float32Array(count)` buffers. A
  frame is one loop of multiply-adds, with no allocation.
- **Retargeting mid-flight** copies `current` into `from`, so fast slide
  changes never jump.
- **Stagger:** song _i_ starts at `stagger[i] * STAGGER_SPAN` (e.g. 40% of the
  duration) and runs over the rest, all with the same easing. That gives the
  ripple and sweep effects without a second animation system.
- **Alpha is a channel like x and y.** It's how songs appear and disappear
  (`songs.only`, `NaN` positions, the reveal on slide 1). A song with alpha 0
  is skipped by painters and hit-testing.
- `settled` gates things that are expensive or ugly mid-flight (hexes,
  labels, titles).

Painters read positions through one accessor (`scene.positionOf(i)` or
direct `x[i]`/`y[i]`), instead of today's `positions.get(songKey)`.

### Camera

The camera (`camera.svelte.ts`) mostly stays as is. Changes:

- `focusSong` support already exists (`focusSongKey`). The scene's
  `camera: {kind: "song"}` maps onto it.
- Camera targets come from **target** positions (as today via
  `basePixelOf`), so the camera and dots head to the same place together.
- Layout changes and camera moves start in the same frame and share a
  duration, so slide 0→1 reads as one zoom-out.
- `constrainTransform` works on the frame, not the whole viewport, for
  framed layouts (see frames).

### Hexes belong to the layout

`hexMode` becomes `layout.aggregate === "hex" && progressionShares available`.
Hexes and dots crossfade by `hexOpacity`, a 0–1 value tweened on its own:

- **Into a hex layout** (sky → UMAP on slide 5): dots fly while drawn as dots.
  When the transition settles, bin once at the target positions, then fade
  hexes in over ~500ms while dots fade out underneath.
- **Out of a hex layout** (UMAP → anything): hexes fade out fast (~200ms)
  over the dots, then the dots fly.
- Zoom-driven hex↔dot switching within UMAP stays exactly as today.

This is both the perf rule (never bin mid-flight) and the look we want (the
map "condenses" once dots arrive).

### Color

Layouts say `color: "star" | "region"`. Each song gets a precomputed star RGB
and region RGB (region = today's `songRegionFill` at gradient 1). During a
transition its fill is lerped by the same eased progress as its position. The
fill is quantized to a few dozen steps so batched drawing still has few
buckets (see performance). The sky is uniform white-ish stars; the UMAP map
gets its colors as dots land.

### Frames: layouts fill a measured rect

Today UMAP fills the whole viewport and is nudged down with `offsetY` (280px)
to clear the text. New layouts instead fill a **frame**: a rect Index measures
from the page, currently the viewport below the text box and above any
docked media or panel. Index already measures the text box and the stage
(`focusFrame`, `clusterFrameEl`); the frame is the same idea, generalized.

```ts
type MapFrame = { top: number; right: number; bottom: number; left: number }; // insets, px
```

- The timeline puts its 0–1 inside the frame, so `time →` sits right above
  the bottom inset, and docked media on slides 2–3 never covers lit dots.
- UMAP keeps its current behavior (`offsetY`, `centered`) unchanged. Its frame
  is the whole viewport, so Section 2 doesn't move.
- When the frame changes (text box resizes, docked card appears), layouts
  re-run and dots move with a normal short transition. On window resize they
  jump.

Implementation note: the plot rect stays "the viewport minus `PLOT_MARGIN`",
and the frame insets are applied when converting a layout's 0–1 to base
pixels: one function in `viewport.ts` (`toBasePixel`). The camera, hit-tests
and painters keep working in base pixels, unaware of frames.

### Guides

`Guide` is a small tagged union drawn by one painter (`paint/guides.ts`, which
grows out of today's `paint/axes.ts`):

```ts
type Guide =
	| {
			kind: "axisLabel";
			text: string;
			at: "bottom-right" | "bottom-left" | "left-top";
	  }
	| { kind: "tick"; text: string; x: number } // e.g. decades along the timeline
	| { kind: "columnLabel"; text: string; x: number; y: number }; // later: decade bars
```

Guides are in frame coordinates and **screen-fixed** for axis labels, so
`time →` stays put while the camera zooms. Each set fades with its layout.
The outgoing set fades out over the first 30% of a transition and the
incoming set fades in over the last 30%.

### Media sync (the video drives the map)

`src/runes/storyMedia.svelte.ts`, a tiny shared rune like `audio`:

```ts
export const storyMedia = $state({
	videoId: null as string | null,
	cueIndex: -1
});
```

- `Video.svelte` already runs a rAF loop while playing. It writes
  `storyMedia.cueIndex = cueAt(videoCues[videoId], currentTime)`, only when
  the value changes.
- Cue data lives in `src/data/videoCues.ts`: per video, an ordered list of
  `{ title, artist, songKey | null, startSeconds }`. For now `startSeconds`
  is generated evenly over the clip; real stamps can replace them later
  without touching code.
- Index turns the scene's `media.followVideo` plus `storyMedia` into runtime
  highlights for the map:
  - the current cue's song → `spotlitSongKey` (enlarged, labeled)
  - earlier cues' songs → `litSongKeys` (small outlined markers, no label)
- The scrolling list in `Video.svelte` is driven by the same `cueIndex`,
  instead of its free-running 40s CSS animation, so list and map agree.

### Where things live

```
src/components/storymap/              ← new: the "what", no rendering
  songTable.ts            + .test.ts
  mapScene.ts             + .test.ts    (parseMapScene: copy → MapScene)
  layouts/
    types.ts
    index.ts                            (registry)
    cache.ts                            (memoize by name/params/frame)
    umap.ts               + .test.ts    (today's displayPoints, moved)
    timeline.ts           + .test.ts
    seededRandom.ts       + .test.ts    (hash → [0,1), shared with jitterFor)
src/components/hexmap/components/     ← existing: the "how"
  EmbeddingScatter.svelte              (takes a LayoutResult + scene-derived props)
  scatter/transition.svelte.ts         (replaces positionTween)
  scatter/paint/guides.ts              (replaces paint/axes.ts)
  scatter/paint/dots.ts                (batched)
src/components/HexMap.svelte          ← adapter: snapshot → SongTable, scene → layout + props
src/data/videoCues.ts                 + .test.ts
src/runes/storyMedia.svelte.ts
src/components/AudioGate.svelte
```

Naming: we keep `HexMap` and `EmbeddingScatter` for now, to keep diffs small
and history readable. Once Sections 3 and 4 land, renaming `HexMap` to
`StoryMap` is a cheap follow-up.

### What stays out of scope

- **WebGL.** Canvas2D with batching should handle 7,300 dots. The painters'
  boundary (`drawDots(scene, …)`) is the seam where a WebGL points renderer
  could replace it, if measurements ever say so.
- **Animated twinkle** on the night sky. It would mean redrawing every frame
  while idle. If wanted later: a 20–30fps loop only on sky slides, after
  measuring.
- **Workers.** Nothing in the intro needs one.
