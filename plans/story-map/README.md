# Story map: the map drives the piece

**Status:** intro built (commits 1–16 on main; phone perf rows still to measure; Sections 3–4 not started) · **Written:** 2026-11-19

The hex map (`HexMap.svelte` → `EmbeddingScatter.svelte`) becomes the main
visual of the whole piece. It stops being only "the UMAP hex map" and
becomes **one set of ~7,300 song dots that can be arranged in many layouts**:
a single dot, a time-sorted night sky, the UMAP hex map, and later a
stacked decade bar chart (Section 3) and per-progression beeswarms over time
(Section 4). Slides declare which layout, camera and highlights they want,
and the map animates between them smoothly.

This folder:

| File                                               | What's in it                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **README.md** (this file)                          | Goals, decisions, the new intro slide by slide, the commit list, open questions      |
| [01-architecture.md](01-architecture.md)           | The core concepts (song table, layouts, map scene, transitions), module layout, APIs |
| [02-intro-commits.md](02-intro-commits.md)         | Commit by commit: files touched, steps, how to check each one                        |
| [03-copy.md](03-copy.md)                           | Paste-ready ArchieML for the Google Doc, and which text is kept vs. new              |
| [04-performance.md](04-performance.md)             | Frame budget, precautions, and how we measure                                        |
| [05-later-sections.md](05-later-sections.md)       | Rough plans for Section 3 (decade bars) and Section 4 (beeswarms over time)          |
| [appendix-video-songs.md](appendix-video-songs.md) | The 38 songs in the "examples" video, matched to dataset song keys                   |

---

## Goals

1. **One map, many arrangements.** Every song is always the same dot. Moving
   between slides moves dots, never swaps one chart for another.
2. **Declarative slides.** A slide's `map` block in the Google Doc says _what_
   the map should look like: layout, camera, which songs are shown, highlighted
   or playable. The code works out _how_ to get there.
3. **Modular and readable.** A new arrangement is a new pure layout function in
   its own file, plus a line in a registry. A person should be able to read one
   layout file and understand it without knowing the renderer.
4. **Smooth on phones.** Animating 7,300 dots must hold 60fps on a recent
   iPhone or Pixel. We take cheap precautions now (typed arrays, no per-frame
   allocation, no re-binning hexes mid-animation) and measure before doing
   anything more drastic (see [04-performance.md](04-performance.md)).
5. **No regressions in Section 2.** Today's cluster focusing, explore panel,
   player and hex behaviour keep working at every commit.

## Decisions made (from the planning conversation)

| Question                                     | Decision                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where does the audio gate go?                | **Slide 0.** "Start with audio / Stay muted" buttons sit under slide 0's text. The title slide (now slide 5) is title and byline only.              |
| What happens to the "dead-simple" video?     | **Kept.** It gets its own slide (slide 2), carrying the existing "In 2009, the Australian comedy group…" text, before the examples video.           |
| What happens to "To find out, we gathered…"? | Kept, unchanged, right after the title slide (slide 6), still with UltimateGuitar. _(Assumed: see open questions.)_                                 |
| Video vs. map on the video slides            | **The video docks to a corner card.** The sky stays full screen; the timeline shrinks out of the card's way (see "frames" in the architecture doc). |
| Video songs missing from the dataset         | **Only matched songs light up.** 21 of the 38 are in the dataset. They light up as the clip names them and stay lit. M = 21.                        |
| Copy                                         | **Reuse the existing intro text** wherever it overlaps the new outline. New text only where a new visual needs it. See [03-copy.md](03-copy.md).    |

## The new intro, slide by slide

Slide numbers are `slideI` (0-based, as in `?slide=N`). "Sky" means the
timeline layout: x is release year, y is a stable random value per song, and
all dots are the same plain "star" color.

| #   | Text (✏️ new · ♻️ existing)                                                                                         | Map                                                                                                                                                                                      | Stage                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 0   | ✏️ "This is one pop hit, represented with a dot." + audio gate                                                      | Sky layout, **only** "Don't Stop Believin'" visible, enlarged, labeled, playable (🎧). Camera zoomed in on it, so it sits alone mid-screen.                                              | none                                                                 |
| 1   | ✏️ "Here's all [7,260] Billboard top-20 hits from 1958 to 2026… night sky… [TK Beato]"                              | Camera zooms out to home while the other 7,259 stars fade in, rippling out from Journey's dot. `time →` axis label fades in. Hover shows a song's name.                                  | none                                                                 |
| 2   | ♻️ "In 2009, the Australian comedy group "Axis of Awesome" performed a viral sketch…"                               | Sky, slightly dimmed.                                                                                                                                                                    | `dead-simple` video, docked                                          |
| 3   | ♻️ "People cite this video as proof that all pop music is formulaic…"                                               | Sky. While the video plays, each matched song it names is spotlit and labeled, then stays lit (small, outlined). Timestamps are placeholders for now: spread evenly over the 33.2s clip. | `examples` video, docked, with its scrolling list synced to the clip |
| 4   | ✏️ "But that was [21] songs. What about the other [7,239]?" + ♻️ "But is it true? Is pop music really: [3 bullets]" | Sky, the 21 still marked; the rest return to full brightness.                                                                                                                            | none                                                                 |
| 5   | ♻️ Title: "Mapping every pop hit's chords" + byline (no buttons)                                                    | **The reveal:** every dot flies from the sky into the UMAP map, then hexes fade in with rotating labels (today's Landing map settings).                                                  | Landing (title only)                                                 |
| 6   | ♻️ "To find out, we gathered every Billboard top-20 hit…" (unchanged)                                               | none (as today)                                                                                                                                                                          | UltimateGuitar (as today)                                            |

After slide 6, Section 1 ("What is a chord progression?") continues as today.

## Commit plan (summary)

Each commit leaves the site working. Commits 2–6 change nothing you can see
(refactors with checks), so they can be reviewed against today's site. Full
detail for each is in [02-intro-commits.md](02-intro-commits.md).

| #   | Commit                                                                    | Visible change?              |
| --- | ------------------------------------------------------------------------- | ---------------------------- |
| 1   | Add the story-map plan (this folder)                                      | no                           |
| 2   | Dev-only frame-time meter (`?perf=1`)                                     | dev only                     |
| 3   | Song table and the layout interface; UMAP becomes `umapLayout`            | no                           |
| 4   | Typed-array transition engine replaces `positionTween` (position + alpha) | no                           |
| 5   | Batched dot drawing                                                       | no                           |
| 6   | Hexes belong to the layout: they fade in after dots settle                | no (barely)                  |
| 7   | Layout frames: layouts fill a measured rect, not the whole viewport       | no                           |
| 8   | Timeline ("sky") layout, star coloring, axis guide                        | only via a dev URL           |
| 9   | Map scene: parse the copy's `map` block into one typed spec               | no                           |
| 10  | Song visibility and the reveal ripple; camera `focusSong`                 | only via a dev URL           |
| 11  | Player plays a list of songs, not only a cluster's                        | no                           |
| 12  | AudioGate text component; Landing becomes title-only                      | no (not wired into copy yet) |
| 13  | New intro copy, part 1: slides 0, 1, 5, 6                                 | **yes**                      |
| 14  | Docked video and video cue data                                           | **yes**                      |
| 15  | Map follows the video: spotlight, lit songs and labels; slides 2–4        | **yes**                      |
| 16  | Polish the choreography: timings, stagger, back-navigation, mobile        | **yes**                      |

## Open questions (answer whenever; defaults are in the plan)

1. **Slide 6 ("To find out…").** Kept unchanged by default. Slide 1 now also
   says "all [7,260] Billboard top-20 hits", so the first sentence repeats it.
   Trim it, or keep the repeat as a deliberate callback?
2. **Audio gate buttons.** Default: "Start with audio" unmutes _and_ starts
   Journey's clip, which shows what clicking a dot does; "Stay muted" only
   mutes. Neither moves to the next slide. Should either one advance?
3. **Slide 0 player UI.** Default: audio only. The dot's progress ring, colored
   by chord, is the only playback UI. Alternatively, show the chord readout
   (`ClusterTitle`) under the dot, as Section 2's player does.
4. **The year.** The existing copy says the sketch was 2009; your outline said 2011. Plan keeps 2009, since it's the existing text. Worth fact-checking.
5. **The "grumbling" line.** Your outline opened the video slide with "People
   have been grumbling about pop being formulaic for a long time." It's left
   out, because the existing "In 2009…" text follows slide 1's "People love to
   claim that they _sound_ the same" naturally. Easy to add back.
6. **Song count.** The snapshot has 7,260 songs; the copy says [7,300]. The
   numbers in the new copy are hard-coded from the current snapshot.
