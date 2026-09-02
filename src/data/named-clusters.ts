export type NamedClusterEntry = {
	// The one song used to re-identify this cluster across re-clusterings — a
	// name survives points drifting in and out as long as this song is still
	// grouped there. See namedClusters.ts for how entries are matched back to
	// a live cluster. This song is also what shows as "highlighted" (ring +
	// label) on the map for this cluster.
	anchorSongKey: string;
	name: string;
};

// Hand-curated cluster names for /harmony-map's density clusters — the sole
// source of truth, shared by everyone who loads the app. There's no in-app
// editing: to name, rename, or re-anchor a cluster, find its anchor song key
// (click through to it on the map) and add or edit its entry here directly,
// then commit. Keep one entry per name and per anchor song — re-anchoring an
// existing cluster should replace its entry, not add a new one.
export const namedClusters: NamedClusterEntry[] = [
	{ anchorSongKey: "lorde__royals", name: "sweet home mixolydian" },
	{ anchorSongKey: "journey__dont-stop-believin", name: "axis mini" },
	{ anchorSongKey: "jason-derulo__whatcha-say", name: "whatcha say" },
	{
		anchorSongKey: "taylor-swift__we-are-never-ever-getting-back-together",
		name: "never getting back together"
	},
	{ anchorSongKey: "iyaz__replay", name: "axis minor" },
	{ anchorSongKey: "michael-jackson__beat-it", name: "beat it" },
	{ anchorSongKey: "lionel-richie__hello", name: "jazz (ii-V-I)" },
	{
		anchorSongKey: "andy-williams__its-the-most-wonderful-time-of-the-year",
		name: "jazz (I-vi-ii-V)"
	},
	{ anchorSongKey: "fleetwood-mac__go-your-own-way", name: "go your own way" },
	{ anchorSongKey: "david-guetta__titanium-feat-sia", name: "royal road" },
	{ anchorSongKey: "sam-smith__stay-with-me", name: "stay with me" },
	{ anchorSongKey: "taylor-swift__lover", name: "I-V-IV" },
	{ anchorSongKey: "rare-earth__i-just-want-to-celebrate", name: "I-V vamp" },
	{ anchorSongKey: "fleetwood-mac__dreams", name: "IV-V vamp" },
	{ anchorSongKey: "tom-petty__free-fallin", name: "blues lite" },
	{ anchorSongKey: "maroon-5__this-love", name: "jazz (vi-ii-V-I)" },
	{ anchorSongKey: "michael-jackson__bad", name: "ii-V vamp" },
	{ anchorSongKey: "oasis__wonderwall", name: "plagal cascade" },
	{ anchorSongKey: "los-lobos__la-bamba", name: "la bamba" },
	{ anchorSongKey: "brandy-monica__the-boy-is-mine", name: "i-v vamp" },
	{ anchorSongKey: "the-killers__mr-brightside", name: "mr. brightside" },
	{ anchorSongKey: "jonas-brothers__burnin-up", name: "burnin up" },
	{ anchorSongKey: "the-turtles__happy-together", name: "hit the road jack" },
	{
		anchorSongKey: "fun-featuring-janelle-monae__we-are-young",
		name: "doo wop"
	},
	{
		anchorSongKey: "janet-jackson__come-back-to-me",
		name: "somebody i used to know"
	},
	{
		anchorSongKey:
			"tina-turner__i-don-t-wanna-fight-from-what-s-love-got-to-do-with-it",
		name: "I-V-IV-V"
	},
	{ anchorSongKey: "jason-mraz__im-yours", name: "axis" },
	{ anchorSongKey: "salt-n-pepa-featuring-en-vogue__whatta-man", name: "I-IV vamp" },
	{ anchorSongKey: "destiny-s-child__survivor", name: "havana ooh na na" },
	{ anchorSongKey: "usher__u-remind-me", name: "i-iv-v" },
	{ anchorSongKey: "omi__cheerleader", name: "cheerleader chorus" },
	{ anchorSongKey: "wings__silly-love-songs", name: "silly love songs" },
	{ anchorSongKey: "plain-white-t-s__hey-there-delilah", name: "I-vi vamp" },
	{ anchorSongKey: "john-denver__back-home-again", name: "IV-V-I" },
	{ anchorSongKey: "dua-lipa__new-rules", name: "new rules" },
	{ anchorSongKey: "miley-cyrus__we-can-t-stop", name: "axis of angsty" },
	{ anchorSongKey: "vanessa-williams__dreamin", name: "i-VI vamp" },
	{ anchorSongKey: "lmfao__party-rock-anthem", name: "party rock" },
	{
		anchorSongKey: "tears-for-fears__everybody-wants-to-rule-the-world",
		name: "V-IV vamp"
	},
	{ anchorSongKey: "ariana-grande__dangerous-woman", name: "dangerous" },
	{ anchorSongKey: "charlie-puth__attention", name: "attention" },
	{ anchorSongKey: "dean-martin__i-will", name: "I-V-I" },
	{ anchorSongKey: "carpenters__top-of-the-world", name: "I-IV-I" },
	{ anchorSongKey: "coldplay__viva-la-vida", name: "viva la vida" },
	{ anchorSongKey: "katy-perry__roar", name: "roar" }
];
