// A visual to show above the text box for this beat.
export type StoryBeatMedia =
	| { type: "youtube"; videoId: string; title?: string }
	// Line chart of % of corpus songs matched by any of these chord
	// progressions, by release year (reuses the same chart as
	// /core-progressions). Progression strings are roman-numeral keys like
	// "I-V-vi-IV" — see src/data/core-progressions.ts.
	| { type: "prevalenceChart"; chordProgressions: string[]; title?: string };

export type StoryBeat = {
	// A single paragraph, or multiple — each string in the array renders as
	// its own paragraph.
	text: string | string[];
	// Song to center/zoom the map on. Omit (or use null) to show the full
	// zoomed-out map for this beat. Ignored when focusCluster is set.
	focusSongKey?: string | null;
	// Cluster to center/zoom on (by its display name, e.g. "axis") when you
	// want to frame a whole cluster rather than any one song within it —
	// takes priority over focusSongKey when both are set. Omit (or use null)
	// to show the full zoomed-out map for this beat.
	focusCluster?: string | null;
	// Song(s) to ring-highlight — everything outside their cluster(s) fades
	// out. Pass an array to highlight several songs at once (e.g. several
	// examples of the same progression); their clusters are unioned, so nothing
	// among any of them fades. Omit (or use null) for no highlight. Can be
	// combined with highlightFamily.
	highlightSongKey?: string | string[] | null;
	// Progression family to highlight instead of (or alongside) one song —
	// every song whose dominant family matches stays lit, everything else
	// fades. Use a family's display name: "Happy, major-y progressions",
	// "Minor-y progressions", "Jazzy progressions", "Axis of awesome" (see
	// src/data/core-progressions.ts). Omit (or use null) for no family
	// highlight.
	highlightFamily?: string | null;
	// Color dots by their progression-family blend, like /harmony-map.
	// Defaults to false — dots are plain star-white so a highlighted
	// song/family stands out starkly instead of competing with color.
	showFamilyColors?: boolean;
	// Draw the dashed cluster outlines + names, like /harmony-map. Defaults
	// to false, to keep the map uncluttered for the story visuals.
	showClusterOutlines?: boolean;
	// Optional visual (video or chart) shown above the text box. Omit (or
	// use null) for no media.
	media?: StoryBeatMedia | null;
};

// Toy version: a hand-scripted sequence of story beats. Edit this array to
// add/remove/reorder beats or paste in new text — each beat only needs
// `text`; add focusSongKey/highlightSongKey when you want that beat to zoom
// to (and highlight) a specific song. Find a song's key on /harmony-map or
// /demo/define-chord-progression (it's the `?song=` URL param).
export const storyBeats: StoryBeat[] = [
	{
		text: "In 2009, an Australian comedy group called “Axis of Awesome” performed a sketch that demonstrated the surprising number of pop songs built off of the same 4 chords.",
		focusCluster: "axis",
		// TODO double-check this is the right video — grab the ID from the
		// youtube.com/watch?v=<ID> URL and swap it in if not.
		media: {
			type: "youtube",
			videoId: "5pidokakU4I",
			title: "Axis of Awesome — 4 Four Chords"
		}
	},
	{
		text: [
			"It’s these 4 chords: C G Am F",
			"They are the backbone of lots of pop and rock hits, like Papparazzi, Hey Soul Sister, Let it Be, I'm Yours.",
			"Note: We transposed these songs to all be in the same key, edited them to have the same tempo. More detailed explanation in the methods? I don’t want to spend too much time on it up here."
		],
		focusCluster: "axis",
		highlightSongKey: [
			"lady-gaga__paparazzi",
			// "train__hey-soul-sister",
			// "the-beatles__let-it-be",
			"jason-mraz__im-yours"
		]
	},
	{
		text: [
			"People often cite this video to show how formulaic pop music can be. That it all sounds the same.",
			"We wanted to see if that’s true. We looked at the chord progressions from Billboard top 10 songs going back to its inception in 1958.",
		],
		focusCluster: "axis",
	},
		{
		text: "Sure, it might be formulaic, but we found a whole lot more formulas than just “the 4 chords.” There’s a deep language/vocabulary in this galaxy that reveals what we find pleasing to listen to, why, and how that has shifted over time. Let’s go explore… 🔭",
		focusSongKey: null,
		highlightSongKey: null
	},
	{
		text: [
			"“The 4 chords” is an example of a chord progression.",
			"Underneath all your favorite songs are a series of chords that form the backbone of the sound of the song.",
			"Take Paparazzi for example: the melody is the part that’s sung, and the chord progression is the movement underneath."
		],
		focusSongKey: "lady-gaga__paparazzi",
		highlightSongKey: "lady-gaga__paparazzi",
		showClusterOutlines: true
	},
	{
		text: [
			"A good chord progression is its own little journey. Just like a good story, it’s all about tension and release. Start somewhere, go somewhere new and different, but eventually make it back home.",
			"“The 4 chords” is so common because it does this so well."
		],
		focusSongKey: "lady-gaga__paparazzi",
		highlightSongKey: "lady-gaga__paparazzi",
		showClusterOutlines: true
	},
	{
		text: "The first appearance of “the 4 chords” in our dataset is To Know Him Is to Love Him, released by The Teddy Bears in 1958, the first year of the Billboard Hot 100 list.",
		focusSongKey: "the-teddy-bears__to-know-him-is-to-love-him",
		highlightSongKey: "the-teddy-bears__to-know-him-is-to-love-him",
		showClusterOutlines: true
	},
	{
		text: "This progression actually wasn’t super popular among hits in the early years of the dataset. It really peaked in the 2000s and 2010s, right when Axis of Awesome made their mash-up, and has since declined.",
		focusSongKey: "the-teddy-bears__to-know-him-is-to-love-him",
		highlightSongKey: "the-teddy-bears__to-know-him-is-to-love-him",
		showClusterOutlines: true,
		media: {
			type: "prevalenceChart",
			chordProgressions: ["I-V-vi-IV"],
			title: "“Axis of awesome” (I-V-vi-IV) prevalence over time"
		}
	},
	{
		text: [
			"There was a much more dominant set of progressions in the 60s – what we’re calling the “happy major-y” family of progressions.",
			"These progressions are rooted in the major scale, classic patterns like I-IV and I-IV-V. They sound brighter and cheerful."
		],
		focusSongKey: null,
		highlightSongKey: null,
		highlightFamily: "Happy, major-y progressions",
		// showFamilyColors: true,
	},
];
