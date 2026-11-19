# Copy changes (Google Doc)

← [README](README.md)

The copy lives in the
[Google Doc](https://docs.google.com/document/d/1pYa2yKuIAz3FFvh9qCXQ1jULubM_8C7QPwaKJ98Pe_c/edit?tab=t.0)
and is pulled into `src/data/copy.json` with `npm run gdoc`. Claude can read
the doc (its plain-text export) but can't write to it, so this file is
paste-ready.

**When:** paste during commit 13 (see [02-intro-commits.md](02-intro-commits.md)),
then `npm run gdoc`. Nothing below needs code that isn't in place by then,
except slides 2–4's video keys, which do nothing until commits 14–15.

## Principle: keep the existing intro's words

The existing intro text was carefully worded, so it's kept wherever the new
outline overlaps it. Only the lines a new visual needs are new.

| Slide | Text                                                                                                       | Source                                                                                                                                                                                                                                                            |
| ----- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | "This is one pop hit, represented with a dot."                                                             | ✏️ new (no existing equivalent)                                                                                                                                                                                                                                   |
| 1     | "Here are all [7,260] Billboard top-20 hits… night sky… sound the same, too. [TK]"                         | ✏️ new, from your outline (typos fixed; "Billboard top-20 hits" spelled as the existing copy does)                                                                                                                                                                |
| 2     | "In 2009, the Australian comedy group "Axis of Awesome" performed a viral sketch…"                         | ♻️ existing slide 1, word for word. Replaces your "People have been grumbling… went mainstream in 2011 when a comedy video…".                                                                                                                                     |
| 3     | "People cite this video as proof… makes a compelling case."                                                | ♻️ existing slide 2, word for word. Replaces your "Despite being comedy, the video seems to make a compelling case…".                                                                                                                                             |
| 4     | "Ok, but that was [21] examples. What about the other [7,239]?" + "But is it true? Is pop music really: …" | ✏️ first line new (it's what the lit-up sky shows); ♻️ the rest is the existing slide 3, word for word. Your "Until now, everyone's just cited this video to further the claims that:" is dropped, since slide 3 already says "People cite this video as proof…". |
| 5     | Title + byline                                                                                             | ♻️ existing Landing (buttons move to slide 0)                                                                                                                                                                                                                     |
| 6     | "To find out, we gathered every Billboard top-20 hit since 1958…"                                          | ♻️ existing slide 4, unchanged (see README open question 1)                                                                                                                                                                                                       |

Numbers: 7,260 = songs in the current snapshot; 21 = examples-video songs
matched in the dataset ([appendix](appendix-video-songs.md)); 7,239 = 7,260 − 21.
Re-check them if the snapshot changes.

## What to paste

Replace **everything from `title: Landing` up to (not including)
`title: What is a chord progression?`** with the block below. It removes the
separate "Landing" section: the title slide now lives inside "Intro", which
`Chapters` already hides.

```
title: Intro
[.slides]
[.+text]
This is one pop hit, represented with a dot.
{.AudioGate}
{}
[]
{.map}
visible: true
layout: timeline
focusSong: journey__dont-stop-believin
[.onlySongs]
*journey__dont-stop-believin
[]
[.playableSongs]
*journey__dont-stop-believin
[]
movable: false
hoverable: false
{}


[.+text]
Here are all [7,260] Billboard top-20 hits from 1958 to 2026. Laid out like this, they look like a night sky, where every “star” (song) looks the same. People love to claim that they <em>sound</em> the same, too.


[TK: Rick Beato quotes, etc.]
[]
{.map}
visible: true
layout: timeline
axisLabel: time →
movable: false
{}


[.+text]
In 2009, the Australian comedy group “Axis of Awesome” performed a viral sketch showing that a surprising number of pop songs – from Journey’s “Don’t Stop Believin’” to Beyoncé’s “If I Were A Boy” – are built off of the same four chords.
[]
{.map}
visible: true
layout: timeline
axisLabel: time →
dimmed: true
movable: false
hoverable: false
{}
{.stage}
component: Video
videoId: dead-simple
dock: corner
{}


[.+text]
People cite this video as proof that all pop music is formulaic and sounds the same. The sheer volume of songs built on this foundation makes a compelling case.
[]
{.map}
visible: true
layout: timeline
axisLabel: time →
followVideo: examples
movable: false
{}
{.stage}
component: Video
videoId: examples
dock: corner
{}


[.+text]
Ok, but that was [21] examples. What about the other [7,239]?
But is it true?
Is pop music really:
{.ol}
[.li]
*built on a single four-chord progression 🧱
*looped for the entire song 🔁
*and recycled decade after decade? 🗓️
[]
{}
[]
{.map}
visible: true
layout: timeline
axisLabel: time →
litVideoSongs: examples
movable: false
{}


[.+text]
[]
{.map}
visible: true
movable: false
hoverable: false
rotateLabels: true
centered: true
{}
{.stage}
component: Landing
hed: Mapping every pop hit’s chords
byline: By <a href=https://pudding.cool/author/michelle-pera-mcghee/ target=_blank>Michelle Pera-McGhee</a> and <a href=https://pudding.cool/author/david-mora/ target=_blank>David Mora</a>
{}


[.+text]
To find out, we gathered every Billboard top-20 hit since 1958, [7,300] songs, and found their chord progressions on popular online chord sites.


But to compare thousands of songs, we first need a way to tell when two of them are doing the same thing.
[]
{.stage}
component: UltimateGuitar
songs: 3
{}
[]


```

Notes for pasting:

- In the doc, `{.map}` and `{.stage}` blocks follow their `[.+text]` block
  inside the same slide, as they do today. Indentation doesn't matter to
  ArchieML.
- Slide 5's empty `[.+text]` / `[]` keeps it text-less, exactly like today's
  Landing.
- `[7,300]` on slide 6 is unchanged on purpose. Brackets mean "number to
  confirm", as before.
- After `npm run gdoc`, the only diff in `src/data/copy.json` should be in
  the first two sections (they become one).
