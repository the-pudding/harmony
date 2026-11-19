# Intro: commit by commit

← [README](README.md) · concepts in [01-architecture.md](01-architecture.md)

Conventions for every commit:

- `npm run check`, `npm run test` and `npm run lint` pass.
- Look at it in `npm run dev` on the slides listed under **Check**, using
  `?slide=N` (dev-only param), on desktop and in a phone-sized window. Before
  merging the visible commits (13–16), also check on a real phone.
- **Refactor commits (3–7, 9, 11–12) must not change what you see.** Compare
  Section 2 (`?slide=` its first map slide onward), the explore slide and
  the current Landing against `main` before the commit.
- Each commit message says what changed and why, like the existing history.

Slide numbers below are the **new** intro's (see README). Until commit 13
lands, the intro still has today's slides.

---

## 1 · Add the story-map plan

This folder. No code.

---

## 2 · Dev-only frame-time meter (`?perf=1`)

**Why:** "Buttery smooth" needs a number. We want a cheap way to see frame
times during transitions on a phone before and after the refactors.

**Files:** `src/utils/perfParam.js` (new), `EmbeddingScatter.svelte`.

**Steps**

1. Copy the `slideParam.js` pattern: a `DEV-ONLY-REMOVE-BEFORE-PUBLISH`
   header with removal instructions, `readPerfParam()`.
2. In `EmbeddingScatter`, when on, time each `draw()` (`performance.now()`
   around it) and keep a ring buffer of the last 120 frames' draw time and
   frame interval.
3. Render a small fixed overlay (top-left, monospace): draw ms p50/p95, fps
   over the last second, dot count drawn. It only updates while frames are
   happening.

**Check:** `?perf=1&slide=<a Section 2 cluster slide>`; step through clusters.
Write the baseline numbers (desktop and phone) into
[04-performance.md](04-performance.md) under "Baseline".

---

## 3 · Song table and the layout interface; UMAP becomes `umapLayout`

**Why:** Gives arrangements a home, without changing behavior yet.

**Files:** new `src/components/storymap/{songTable.ts, layouts/types.ts,
layouts/index.ts, layouts/cache.ts, layouts/umap.ts, layouts/seededRandom.ts}`
plus tests; `HexMap.svelte`.

**Steps**

1. `buildSongTable(snapshot)`: columns as in the architecture doc. Move
   `coverageBySongKey`, `homogeneityBySongKey` and `songSummaryByKey` from
   `HexMap` into it (or derive them from it), so they're built once.
2. `seededRandom.ts`: `hashUnit(songKey, salt) → [0,1)` (FNV-1a, like
   `songShardFor`). Re-express `jitterFor` with it, keeping the exact current
   output (unit test with a few known keys) so the UMAP map doesn't shift by
   a pixel.
3. `umapLayout.compute`: today's `points` → `applyPurityRadialLayout` →
   `normalizePoints`, returned as a `LayoutResult` (`aggregate: "hex"`,
   `color: "region"`, `pointRadius: POINT_RADIUS`, no guides).
4. `layouts/cache.ts`: `computeLayout(name, params, context)`, memoized on
   `name`, `JSON.stringify(params)`, `frame.width`, `frame.height`, and
   `songs` identity.
5. `HexMap` computes `umapLayout` through the cache and converts the result
   back into today's `points` shape for `EmbeddingScatter`. That's a temporary
   shim, removed in commit 4.

**Tests:** `umap.test.ts` compares `umapLayout` with the old pipeline's
normalized output on a small fixture snapshot (equal within 1e-6).
`songTable.test.ts`: index round-trips, years, cluster names.

**Check:** no visual change anywhere.

---

## 4 · Typed-array transition engine replaces `positionTween`

**Why:** No per-frame allocation (today: a new `Map` and 7,260 objects every
frame), alpha as an animatable channel, retarget mid-flight, `settled`.

**Files:** new `scatter/transition.svelte.ts` (+ a pure
`transitionMath.ts` with tests); `EmbeddingScatter.svelte`, `paint/scene.ts`,
`paint/*.ts`, `hitTesting.ts`, `hexLayout.ts`; delete
`positionTween.svelte.ts`.

**Steps**

1. `transitionMath.ts`: `stepTransition(from, to, current, startAt, t,
easing)` working on `Float32Array`s. Unit tests cover endpoints, monotonic
   easing, stagger offsets, and retarget-from-current.
2. `transition.svelte.ts`: rAF loop as in `positionTween`, plus `instant`,
   `durationMs`, `stagger`, and a `settled` `$state` that's written only at
   start and end.
3. `EmbeddingScatter` takes a `layout: LayoutResult` prop and a `songs:
SongTable` prop instead of `points`. Remove the commit 3 shim.
   `normalizedPoints` and `drawablePoints` become index ranges plus
   `visibleSongKeys` → alpha.
4. `Scene` exposes `x`, `y`, `alpha` arrays and `indexOf`. Replace
   `positions.get(songKey)` with index reads in painters and hit-testing.
   Code that's keyed by song (markers, rings, labels; a handful of songs)
   looks the index up once.
5. `hexLayout.ts` cache key: replace `positions` identity with a
   `positionsVersion` number that only bumps when a transition **settles** or
   on instant jumps. Mid-flight frames reuse the last bins. (Commit 6 makes
   hexes not draw mid-flight at all, so this is belt-and-braces.)

**Check:** Section 2 cluster focusing; explore slide (pan, zoom, hover,
click, search); the year filter on any `/demo` page that still feeds
`visibleSongKeys`, if one does. `?perf=1` numbers should be equal or better.

---

## 5 · Batched dot drawing

**Why:** Today every dot sets `globalAlpha` and `fillStyle` and fills its own
path: 7,260 state changes and fills per frame. Canvas is much faster with a
few fills of many arcs.

**Files:** `paint/dots.ts`, `pointStyle.ts`.

**Steps**

1. Bucket on-screen plain dots by `(fillStyle, alpha quantized to 1/32,
radius)`. For each bucket: one `beginPath`, `moveTo`+`arc` per dot, one
   `fill()`.
2. Keep draw order where it matters: accented dots last (as today's
   `pointsInDrawOrder`). Markers, rings and labels stay per-song; there are
   few of them.
3. Keep `isOnScreen` culling.
4. Groups-mode gradients (`fillStyleForGroupShares`) aren't used by the story
   map. Keep the per-dot path for `colorMode === "groups"` only.

**Check:** pixel-compare a few Section 2 screenshots at dot zoom against
`main`; alpha quantization should be invisible. `?perf=1` draw ms down.
(If p95 is already well under budget on a phone after commit 4, this commit
can be deferred; note the numbers in 04-performance.md either way.)

---

## 6 · Hexes belong to the layout; they fade in after dots settle

**Why:** Layouts other than UMAP draw dots at 1×. Going to and from UMAP needs
the hex crossfade.

**Files:** `EmbeddingScatter.svelte`, `paint/hexes.ts`, `constants.ts`.

**Steps**

1. `hexMode = layout.aggregate === "hex" && progressionSharesBySongKey !== null`.
2. Add `hexOpacity` (a small single-value tween, ~500ms in / ~200ms out).
   Target 1 when `hexMode && transition.settled`, else 0.
3. `draw()`: when the zoom level is hex and `hexOpacity < 1`, draw dots first
   (alpha × `1 − hexOpacity`) then hexes with `globalAlpha = hexOpacity`. At 1
   it's exactly today's hex frame. Hex labels and rotating labels use
   `hexOpacity` too.
4. Leaving UMAP: the layout change is held until `hexOpacity` reaches 0
   (≤200ms), then dots fly. Implement as a `delayMs` on the transition rather
   than a separate state machine.

**Check:** Today's Landing (still slide 0 here) → slide 1 and back: the map
fades as before. Section 2: unchanged. A temporary dev toggle switching
`umap` ↔ a test layout (e.g. all dots on a circle, not committed) shows the
crossfade; remove the toggle before committing.

---

## 7 · Layout frames

**Why:** The sky must stay clear of the text box and the docked video card.
Later charts need the same thing.

**Files:** `viewport.ts` (+ tests), `camera.svelte.ts`,
`EmbeddingScatter.svelte`, `HexMap.svelte`, `Index.svelte`.

**Steps**

1. `MapFrame` insets prop on `EmbeddingScatter` (default all 0).
   `toBasePixel`/`fromBasePixel` map a layout's 0–1 into the plot rect shrunk
   by the insets. Only framed layouts (`layout.framed === true`, false for
   UMAP) use the insets, so UMAP and `offsetY` are untouched.
2. `LayoutContext.frame` = the inset rect's size, so layouts can be
   aspect-aware.
3. Index computes `mapFrame` from what it already measures: top = text box
   bottom + 16px; bottom = docked card height + gap (commit 14), else a small
   margin for the axis label. Pass it through `HexMap`.
4. Frame changes re-run the layout (cached by frame size) and transition at
   ~400ms. Window resizes are `instant`.

**Check:** no visual change (only UMAP exists yet). Unit tests for the
inset math in `viewport.test.ts`.

---

## 8 · Timeline ("sky") layout, star coloring, axis guide

**Files:** new `layouts/timeline.ts` (+ test), `paint/guides.ts` (from
`paint/axes.ts`), `paint/dots.ts`, `EmbeddingScatter.svelte`, `layouts/index.ts`.

**Layout**

- `x = (year − 1958 + hashUnit(key, "x")) / (2026 − 1958 + 1)`. The hash
  spreads each year's songs across its year, so there are no vertical
  stripes. (There are no release months in the snapshot.)
- `y = 0.04 + 0.92 × hashUnit(key, "y")`, a uniform scatter, which is the
  "night sky". With 49–174 songs per year it reads as a fairly even field,
  slightly denser in the 1960s.
- `aggregate: "none"`, `color: "star"`, `framed: true`,
  `pointRadius`: 2.25 on phones (frame width < 600), else 2.5. Stars should
  read as small and identical.
- `guides`: `axisLabel "time →"` (from the scene; `null` hides it). Optional
  decade ticks are off by default; the outline asked for just the label.
- `stagger`: none here. The slide 1 ripple comes from alpha (commit 10).

**Star color:** a constant in `constants.ts` (`STAR_FILL_COLOR` already
exists) at ~0.85 alpha. The per-song RGB lerp described in the architecture
doc lands here: `color` per song = lerp(from layout's color, to layout's
color, eased progress), quantized to 24 steps.

**Dev access:** until commit 9 wires the copy, `?layout=timeline`
(dev-only, folded into `perfParam.js`'s dev flags) forces it.

**Tests:** in range, deterministic, ordered by year, the same key always
lands in the same place.

**Check:** `?layout=timeline` on today's Landing: the map flies from UMAP to
the sky (hexes fade first, colors drain to white), and back. Phone: smooth?
Record `?perf=1` numbers.

---

## 9 · Map scene: parse the copy's `map` block into one typed spec

**Why:** One declarative object per slide instead of loose props; the place
new keys get added.

**Files:** new `storymap/mapScene.ts` (+ test); `Index.svelte`,
`HexMap.svelte`; `src/data/copy.d.ts` (types for `map`, `stage`, `text`, so
the copy is typed for the first time).

**Steps**

1. `parseMapScene(copyMap) → MapScene | null`, covering every key in the
   architecture table, with legacy keys mapped as listed. Move
   `mapPropsFromCopy` and `parseBoolean` out of Index into it.
2. Index keeps `textFocusCluster` overriding the camera (as today), now as
   `{ ...scene, camera: { kind: "cluster", name } }`.
3. `HexMap` takes `scene` (plus today's runtime props: playing, explore,
   hover, frame). Internally it maps `scene.layout` → layout result,
   `scene.camera` → `focusClusterName`/`focusSongKey`, `scene.songs` → marker
   sets, and so on.
4. Dev: warn on unknown keys.

**Tests:** every current `map` block in `copy.json` parses to a scene equal to
what today's props produce (a snapshot test over the real copy), plus each new
key.

**Check:** whole piece, no visual change.

---

## 10 · Song visibility and the reveal ripple; camera `focusSong`

**Files:** `HexMap.svelte`, `EmbeddingScatter.svelte`, `transition.svelte.ts`,
`camera.svelte.ts`, `mapScene.ts`.

**Steps**

1. `scene.songs.only` → target alpha 0 for every other song (and they're
   excluded from hover and click). `scene.songs.dimmed` → target alpha 0.35
   for non-marked songs.
2. **Ripple:** when alpha rises for many songs at once (i.e. `only` goes from
   one song to everyone), the per-song stagger is distance from the
   previously-only song, normalized (closest first). This lives in `HexMap`
   as a pure helper `revealStagger(table, layout, originIndex)`, unit-tested.
3. `scene.camera.kind === "song"` → `focusSongKey` with a new
   `SONG_FOCUS_SCALE` (~10). For slide 0, the dot is mid-frame and nothing
   else is visible, so the exact zoom only matters for how dramatic the
   slide 0→1 zoom-out feels. Tune in commit 16.
4. Slide 0→1: camera (`focusSong` → home) and the alpha reveal start
   together and share `SCRIPTED_FOCUS_TRANSITION_MS` (2000ms). Back
   navigation reverses: the others fade out (reverse ripple) while zooming in.
5. `instantFocus` (entering from a map-less slide) also makes the first
   layout and alpha target instant, so landing directly on `?slide=0` shows
   the lone dot without animation.

**Check:** with a temporary local copy edit (not committed) or the dev URL:
lone Journey dot → zoom out with the stars rippling in → back.

---

## 11 · Player plays a list of songs, not only a cluster's

**Why:** Slide 0's dot must play without a focused cluster or the panel.

**Files:** `Player.svelte`, `Index.svelte`.

**Steps**

1. `Player` gets an optional `songKeys` prop. When given, its song list is
   those (each with `featuredClusterOf(songKey)` for tonality and chord
   colors) instead of `featuredSongsOf(cluster)`. `cluster` becomes optional.
2. Add a `headless` prop: render only the `<audio>` elements, no
   `ClusterTitle`. The dot's progress ring, colored by chord, is the UI. (See
   README open question 3 for showing the chord readout instead.)
3. Index mounts a headless player outside the panel when
   `scene.songs.playable.length > 0` and no cluster is active. It's wired to
   `explore.playingSongKey`, as the panel player is.
4. `HexMap`: `scene.songs.playable` joins `playableSongKeys` (so they're
   enlarged, 🎧-labeled and clickable) even without `focusCluster`.

**Check:** Section 2 players unchanged (arrows, auto-advance, chords drawer).

---

## 12 · AudioGate text component; Landing becomes title-only

**Files:** new `src/components/AudioGate.svelte`; `Landing.svelte`,
`Index.svelte` (`components` map; `Chapters` input).

**Steps**

1. `AudioGate`: the two buttons, styled as Landing's today. "Start with
   audio" sets `audio.muted = false` and plays the slide's first playable
   song (via the `explore` context: add `playSong` to it). "Stay muted" sets
   `audio.muted = true`. Once a choice is made, the buttons show which
   (`aria-pressed`), so it's clear the choice took and can be changed.
2. `Landing`: remove the buttons and `start()`. Keep the `Header` wordmark,
   hed and byline. Add a subtle "→" hint (Tap's arrows already exist; maybe
   nothing is needed).
3. Register `AudioGate` in Index's `components`, so `{.AudioGate}{}` works in
   a text block (as `ExploreControls` does).
4. `Chapters`: today it gets `sections.slice(1)` to skip "Landing". After
   commit 13 there's no Landing section, so pass `sections` and keep
   filtering "Intro" by title, as `Chapters` already does.

**Check:** components render in isolation (temporary copy edit, not
committed).

---

## 13 · New intro copy, part 1: slides 0, 1, 5, 6

**Files:** Google Doc → `npm run gdoc` → `src/data/copy.json`.

**Steps**

1. Paste the intro blocks from [03-copy.md](03-copy.md) into the doc,
   replacing the "Landing" section and the "Intro" section. Slides 2–4 can
   go in now too: their map keys (`followVideo`, `litVideoSongs`, `dock`) are
   harmlessly ignored until commits 14–15. The `parseMapScene` dev warning
   will mention them; that's expected for one commit.
2. `npm run gdoc`, then review the `copy.json` diff: only the intro should
   change.
3. Check `?slide=0` lands on the lone dot: the gate works, clicking the dot
   plays Journey's clip with the chord-colored ring.

**Check:** slides 0 → 1 → … → 6 → Section 1, and back. Phone.

---

## 14 · Docked video and video cue data

**Files:** `Video.svelte`; new `src/data/videoCues.ts` (+ test);
new `src/runes/storyMedia.svelte.ts`; `Index.svelte` (frame bottom inset).

**Steps**

1. `videoCues.ts`: `examples` cues from the table in
   [appendix-video-songs.md](appendix-video-songs.md), in the video's list
   order. `startSeconds = i × (33.218 / 38)` for now, with a comment marking
   them as placeholders. Export `cueAt(cues, seconds) → index` (binary
   search). `dead-simple` has no cues.
2. Move the hard-coded `songs` array out of `Video.svelte` into
   `videoCues.ts` (it's the same list).
3. `Video` gets `dock: "corner" | null` from the stage props. Docked: `position:
fixed`, bottom-left, `width: min(40vw, 360px)` on desktop; on phones a
   full-width card at the bottom, ≤ 35svh. The play button and captions work
   as today. Measure its height and publish it to Index via a bindable prop
   or context, for the frame's bottom inset.
4. Scrolling list (examples only): stop the infinite CSS animation. Show
   about 3 rows in the docked card, current cue centered and bold,
   translated by `cueIndex` with a CSS transition. Paused at 0 shows the
   first rows.
5. While playing, write `storyMedia.videoId` / `cueIndex` (only on change).
   Reset on pause-at-0, `onStopAll` and destroy.

**Check:** slides 2–3: the card docks, plays, captions; the list follows
the clip; the sky sits above the card (frame inset). Mute toggle and the
card don't overlap (mute is bottom-right).

---

## 15 · Map follows the video: spotlight, lit songs, labels; slides 2–4

**Files:** `Index.svelte`, `HexMap.svelte`, `EmbeddingScatter.svelte`
(`paint/markedSongs.ts`, `paint/outlinedLabels.ts`).

**Steps**

1. Index derives, from `scene.media` + `storyMedia`:
   - `spotlitSongKey` = current cue's `songKey` (null for unmatched cues)
   - `litSongKeys` = matched songs of earlier cues (on slide 4, via
     `litVideoSongs: examples`: all matched songs)
2. `HexMap`: an external spotlight wins over `searchedSongKey`
   (`spotlitSongKey={mediaSpotlight ?? (explorable ? searchedSongKey : null)}`).
   `litSongKeys` join `highlightedSongKeys` as **inert, smaller** markers.
3. Labels: only the spotlit song is labeled. Lit songs get a marker and no
   label, since 21 labels on a dense sky would collide. Add a
   `labeledSongKeys` subset to `drawOutlinedSongLabels`, defaulting to
   "all outlined", as today.
4. Slide 2 (`dimmed: true`): sky at reduced alpha behind the dead-simple
   clip.
5. Slide 4: `litVideoSongs: examples` keeps the 21 marked; everything else
   back to full brightness.

**Check:** play the examples clip: songs light up one by one in the sky as
the list scrolls. Pause, scrub, replay, change slides mid-clip (state
resets). Slide 4 shows 21 lit.

---

## 16 · Polish the choreography

Not a refactor; a tuning pass with `?perf=1` open on a real phone.

- Durations: slide 0→1 zoom-out (≈2s), sky → UMAP reveal on slide 5 (dots
  ≈1.6s with a year-ordered stagger, then hexes 0.5s), frame changes (0.4s).
- The slide 5 reveal: try `stagger` = UMAP cluster order vs. year order;
  pick what reads as "the sky organizes itself".
- Back navigation for every pair (1→0, 5→4, 3→2) looks intentional, not
  merely reversed.
- Rapid tapping through slides 0–6 never drops below ~50fps and never ends
  in a wrong state.
- `prefers-reduced-motion`: layout and camera changes become ~200ms
  crossfades (alpha only), no ripple.
- Remove anything temporary left behind; make sure every `DEV-ONLY` flag is
  marked for removal.
