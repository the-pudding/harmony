# Story map

One set of song dots (about 7,300) that the story slides rearrange, highlight
and zoom. Slides declare what the map should look like; the code animates there.

| Concept    | What it is                                                                   | Where                                                                 |
| ---------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Song table | Every song once, as parallel arrays by index (keys only appear at the edges) | `storymap/songTable.ts`                                               |
| Layouts    | Pure functions that place each song (x, y in 0-1), plus hex/color settings   | `storymap/layouts/` (`index.ts` is the registry; add new ones there)  |
| Map scene  | A slide's `{.map}` copy block parsed into one typed object                   | `storymap/mapScene.ts` (`parseMapScene`)                              |
| Transition | Typed-array engine that animates positions and alpha toward a layout         | `hexmap/components/scatter/transition.svelte.ts`, `transitionMath.ts` |
| Map frame  | The rect framed layouts fill, clear of the text and video above              | `hexmap/components/scatter/viewport.ts` (`frameRect`)                 |

`Index.svelte` turns each slide's copy into a scene and passes it to
`HexMap.svelte`, which drives `EmbeddingScatter.svelte`.

## Writing a `{.map}` block

The keys, their values and their defaults are documented in
`src/data/copy.d.ts` (`CopyMap`); unknown keys and layouts log a warning in
dev. Song keys are the dataset's (e.g. `journey__dont-stop-believin`), and
`followVideo` / `litVideoSongs` take a video id from `src/data/videoCues.ts`.
Booleans are the strings `true` / `false`.
`revealClusters` stages the arrival from another layout: each listed cluster
flies in alone, then everyone else, then the hexes, then the slide's stage.
`revealSongs` puts its songs in a stage of their own before the clusters
(slide 29 lands the previous slide's two anchored songs first).

Section 3's charts are layouts too (`layouts/effectiveProgressions.ts`): the
songs stack into bars by effective-progression band, and the labels and the
≈1 boxes are the layout's guides (`label`, `box`).

Section 4's chart is `layouts/progressionOverTime.ts`: a column per year,
each a 100% stack of that year's songs, with the featured progression's songs
at the bottom in its color. The slide's stage picks the progression through
`src/runes/stageMap.svelte.ts`, which is how a stage component talks to the
map beyond its `{.map}` block: the chart it features (`scene.chart`, merged
by `withStageMap`), its own songs (playable on the map, played by the stage)
and where the map's frame starts below it. Signatures (slides 32–34) stays
mounted across the three slides, so the chart only ever updates in place.

```
{.map}
visible: true
layout: timeline
onlySongs: journey__dont-stop-believin
focusSong: journey__dont-stop-believin
{}
```

## Song anchors and the stage

A stage component renders `<SongAnchor songKey … />` where a song's dot should
stand; the map draws the dot, label and play ring there via the pin canvas.
The `songDots` registry is `src/runes/songDots.svelte.ts`; pins are in
`hexmap/components/scatter/songPins.svelte.ts`.
A slide with no `{.map}` block uses `STAGE_SCENE`: other stars go offstage and
only anchored songs stay.
Stage components get `arrivingForward`; a forward-arriving new stage waits
until its dots arrive.
