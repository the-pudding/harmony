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
flies in alone, then everyone else, then the hexes, then the slide's text and stage.

```
{.map}
visible: true
layout: timeline
onlySongs: journey__dont-stop-believin
focusSong: journey__dont-stop-believin
{}
```
