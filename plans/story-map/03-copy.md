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

| Slide | Text                                                                                                                                                                                | Source                                                                                                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | "This is one pop hit, represented with a dot."                                                                                                                                      | ✏️ new (no existing equivalent). Two hint callouts appear 3 s in (at the next arrow and the mute toggle); they are code, not copy.                                                 |
| 1     | "Here are all [7,260] Billboard top-20 hits… night sky… sound the same, too. [TK]"                                                                                                  | ✏️ new, from your outline (typos fixed; "Billboard top-20 hits" spelled as the existing copy does)                                                                                 |
| 2     | "This belief went mainstream in 2009, when the Australian comedy group “Axis of Awesome” performed a viral sketch…"                                                                 | ♻️ existing slide 1, reworded to open with "This belief went mainstream in 2009, when…". Replaces your "People have been grumbling… went mainstream in 2011 when a comedy video…". |
| 3     | "People cite this video as proof… makes a compelling case."                                                                                                                         | ♻️ existing slide 2, word for word. Replaces your "Despite being comedy, the video seems to make a compelling case…".                                                              |
| 4     | "Axis of Awesome helped cement 3 big beliefs about pop:", the three-item list, then "Ok, but they cited just [21] examples. What about the other [7,239]? Do these claims hold up?" | ✏️ new framing lines around the existing slide 3 list (word for word); "But is it true?" and "Is pop music really:" are dropped.                                                   |
| 5     | Title + byline                                                                                                                                                                      | ♻️ existing Landing (title and byline only)                                                                                                                                        |
| 6     | "To find out, we gathered every Billboard top-20 hit since 1958…"                                                                                                                   | ♻️ existing slide 4, unchanged (see README open question 1)                                                                                                                        |

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
		tooltip: basic
	{}

	[.+text]
		Here are all [7,260] Billboard top-20 hits from 1958 to 2026, sorted chronologically from left to right. Laid out like this, they look like a night sky, where every “star” (song) looks the same. People love to claim that they <em>sound</em> the same, too.
		[TK: Rick Beato quotes, etc.]
	[]
	{.map}
		visible: true
		layout: timeline
		frame: full
		[.playableSongs]
			*journey__dont-stop-believin
		[]
		movable: false
		tooltip: basic
	{}

	[.+text]
		This belief went mainstream in 2009, when the Australian comedy group “Axis of Awesome” performed a viral sketch showing that a surprising number of pop songs – from Journey’s “Don’t Stop Believin’” to Beyoncé’s “If I Were A Boy” – are built off of the same four chords.
	[]
	{.map}
		visible: true
		layout: timeline
		dimmed: true
		movable: false
		hoverable: false
		tooltip: basic
	{}
	{.stage}
		component: Video
		videoId: dead-simple
	{}

	[.+text]
		People cite this video as proof that all pop music is formulaic and sounds the same. The sheer volume of songs built on this foundation makes a compelling case.
	[]
	{.map}
		visible: true
		layout: timeline
		followVideo: examples
		movable: false
		tooltip: basic
	{}
	{.stage}
		component: Video
		videoId: examples
	{}

	[.+text]
		Axis of Awesome helped cement 3 big beliefs about pop:
		{.ol}
			[.li]
				*built on a single four-chord progression 🧱
				*looped for the entire song 🔁
				*and recycled decade after decade? 🗓️
			[]
		{}
		Ok, but they cited just [21] examples. What about the other [7,239]? Do these claims hold up?
	[]
	{.map}
		visible: true
		layout: timeline
		litVideoSongs: examples
		movable: false
		tooltip: basic
	{}

	[.+text]
	[]
	{.map}
		visible: true
		movable: false
		hoverable: false
		rotateLabels: true
		centered: true
		tooltip: basic
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

- The block is tab-indented (one tab for each slide's `[.+text]`, `{.map}` and
  `{.stage}`, two inside them, three inside a list nested in them), which ArchieML ignores. In the doc, `{.map}` and `{.stage}` blocks follow their `[.+text]` block
  inside the same slide, as they do today.
- Slide 5's empty `[.+text]` / `[]` keeps it text-less, exactly like today's
  Landing.
- `[7,300]` on slide 6 is unchanged on purpose. Brackets mean "number to
  confirm", as before.
- After `npm run gdoc`, the only diff in `src/data/copy.json` should be in
  the first two sections (they become one).
