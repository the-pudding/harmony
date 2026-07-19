export type CorrectedSongSection = {
	name: string;
	key: string;
	scale: string;
	romanTokens: string[];
};

export type CorrectedSongContents = {
	sections: CorrectedSongSection[];
};

export const CHORD_PROGRESSION_ISSUES_LABEL = "chordProgressionIssues:";

export type ManuallyEnteredSong = {
	id: string;
	correctedSongContents: CorrectedSongContents;
	technicalNotes?: string;
};

export type ProblematicSong = {
	id: string;
	chordProgressionIssues: string;
};

export const manuallyEnteredSongs: ManuallyEnteredSong[] = [
	{
		id: "desiigner__panda",
		technicalNotes: "",
		correctedSongContents: {
			sections: [
				...["Intro", "Verse 1", "Chorus", "Verse 2"].map((name) => ({
					name,
					key: "Eb",
					scale: "minor",
					romanTokens: ["i", "Vsus4", "V", "i", "Vsus4", "V"]
				}))
			]
		}
	},
	{
		id: "walker-hayes__fancy-like",
		technicalNotes: "Original HT put just the chorus",
		correctedSongContents: {
			sections: [
				...["Intro", "Verse 1", "Chorus", "Verse 2"].map((name) => ({
					name,
					key: "F#",
					scale: "major",
					romanTokens: ["I", "V", "I", "V"]
				})),
				{
					name: "Pre-Chorus",
					key: "F#",
					scale: "major",
					romanTokens: ["IV", "V"]
				},
				{
					name: "Bridge",
					key: "F#",
					scale: "major",
					romanTokens: ["I", "V", "I", "V", "IV", "V"]
				}
			]
		}
	},
	{
		id: "olivia-rodrigo__good-4-u",
		technicalNotes:
			"Like other songs, the HT original is almost there, but misses several chords completely. This seem to happen a lot when the harmony is largely implied by a sparse bassline.",
		correctedSongContents: {
			sections: [
				...["Verse 1", "Verse 2"].map((name) => ({
					name,
					key: "F#",
					scale: "minor",
					romanTokens: ["i", "VII", "i", "VII", "i", "VII", "VI", "V"]
				})),
				{
					name: "Chorus",
					key: "F#",
					scale: "minor",
					romanTokens: [
						// 1
						"VI",
						"III",
						"VII",
						"i",
						"VII",
						// 2
						"VI",
						"III",
						"VII",
						"i",
						"VII",
						// 3
						"VI",
						"III",
						"VII",
						"i",
						"VII",
						// 4
						"VI",
						"III",
						"VII",
						"i",
						"VII"
					]
				},
				...["Interlude", "Bridge"].map((name) => ({
					name,
					key: "F#",
					scale: "minor",
					romanTokens: ["i", "VII", "IV", "i", "VII", "IV"]
				}))
			]
		}
	},
	{
		id: "travis-scott__stargazing",
		technicalNotes:
			"Good attempt from the original HT, but the harmony is subtle and bass-driven, and they didn't quite get it.",
		correctedSongContents: {
			sections: [
				...[
					"Intro",
					"Chorus",
					"Post-Chorus",
					"Verse"
					/* part 2 is basically just 1 chord, not a progression */
				].map((name) => ({
					name,
					key: "G",
					scale: "minor",
					romanTokens: ["i", "VI", "V"]
				}))
			]
		}
	},
	{
		id: "jonas-brothers__burnin-up",
		technicalNotes:
			"Original basically correct, they just missed the bII at the end of the bridge and listed just one verse.",
		correctedSongContents: {
			sections: [
				...["Intro", "Verse 1", "Chorus", "Verse 2"].map((name) => ({
					name,
					key: "B",
					scale: "minor",
					romanTokens: ["i", "III", "VII", "VI", "i", "III", "VII", "VI"] // lol wrote it higher to improve the % coverage stat since the bridge has no progression :P
				})),
				{
					name: "Bridge",
					key: "B",
					scale: "minor",
					romanTokens: ["VI", "VII", "i", "VII", "VI", "VII", "bII"]
				}
			]
		}
	},
	{
		id: "omi__cheerleader",
		technicalNotes:
			"Original chords were mostly correct, but with like 2 random chords, V-IV, thrown in at the start of one of the verses.",
		correctedSongContents: {
			sections: [
				...["Intro", "Verse"].map((name) => ({
					name,
					key: "E",
					scale: "major",
					romanTokens: ["I", "V", "IV"]
				})),
				...["Pre-Chorus", "Chorus", "Bridge"].map((name) => ({
					name,
					key: "E",
					scale: "major",
					romanTokens: ["I", "IV", "V", "IV"]
				}))
			]
		}
	},
	{
		id: "one-direction__perfect",
		technicalNotes:
			"There are just 4 chords, which the original song nailed, but listed only for the chorus, preventing a 2x+ match.",
		correctedSongContents: {
			sections: [
				...["Intro", "Verse 1", "Chorus", "Verse 2", "Bridge"].map((name) => ({
					name,
					key: "D",
					scale: "major",
					romanTokens: ["I", "IV", "vi", "IV"]
				}))
			]
		}
	},
	{
		id: "travis-scott__highest-in-the-room",
		correctedSongContents: {
			sections: [
				...["Intro", "Verse 1", "Chorus", "Verse 2"].map((name) => ({
					name,
					key: "D",
					scale: "minor",
					romanTokens: ["i", "v", "i", "v"]
				})),
				{
					name: "Outro",
					key: "D",
					scale: "minor",
					romanTokens: ["vi", "i", "v", "VI", "iv", "i", "v", "VI", "iv", "i"]
				}
			]
		}
	},
	{
		id: "billie-eilish__therefore-i-am",
		technicalNotes:
			"Original chords are technically correct, but since they list only one section, it's both incomplete and (at the time of writing) doesn't allow for matches on 2+ instances",
		correctedSongContents: {
			sections: [
				{
					name: "Intro",
					key: "D",
					scale: "minor",
					romanTokens: ["I", "V7", "I", "V7"]
				},
				{
					name: "Verse",
					key: "D",
					scale: "minor",
					romanTokens: ["I", "V7", "I", "V7"]
				},
				{
					name: "Chorus",
					key: "D",
					scale: "minor",
					romanTokens: ["I", "V7", "I", "V7"]
				}
			]
		}
	},
	{
		id: "kanye-west__jail",
		correctedSongContents: {
			sections: [
				{
					name: "Intro",
					key: "E",
					scale: "major",
					romanTokens: ["I", "ii", "IV", "I"]
				},
				{
					name: "Verse",
					key: "E",
					scale: "major",
					romanTokens: ["I", "ii", "IV", "I"]
				},
				{
					name: "Chorus",
					key: "E",
					scale: "major",
					romanTokens: ["I", "ii", "IV", "I"]
				}
			]
		}
	},
	{
		id: "drake__whats-next",
		correctedSongContents: {
			sections: [
				{
					name: "Intro",
					key: "A",
					scale: "minor",
					romanTokens: ["v", "iv", "i", "VII"]
				},
				{
					name: "Verse",
					key: "A",
					scale: "minor",
					romanTokens: ["v", "iv", "i", "VII"]
				},
				{
					name: "Chorus",
					key: "A",
					scale: "minor",
					romanTokens: ["v", "iv", "i", "VII"]
				}
			]
		}
	},
	{
		id: "sza__good-days",
		correctedSongContents: {
			sections: [
				{
					name: "Intro",
					key: "E",
					scale: "major",
					romanTokens: ["Imaj7", "vi7"]
				},
				{
					name: "Verse 1",
					key: "E",
					scale: "major",
					romanTokens: [
						"Imaj7",
						"vi7",
						"IVmaj7",
						"Imaj7",
						"vi7",
						"Imaj7",
						"ii°",
						"IV",
						"iv"
					]
				},
				{
					name: "Pre-Chorus", //  "I try to keep from losin'..."
					key: "E",
					scale: "major",
					romanTokens: [
						"Imaj7",
						"vi7",
						"Imaj7",
						"vi7",
						"IVmaj7",
						"Vsus4",
						"Imaj7",
						"vi7"
					]
				},
				{
					name: "Chorus", // "All the while, I'll await my armored fate..."
					key: "E",
					scale: "major",
					romanTokens: ["Imaj7", "ii°", "IVmaj7", "Imaj7", "vi7"]
				},
				{
					name: "Verse 2", // "Tell me I'm not my fears, my limitations..."
					key: "E",
					scale: "major",
					romanTokens: [
						"Imaj7",
						"vi7",
						"IVmaj7",
						"Imaj7",
						"vi7",
						"Imaj7",
						"ii°",
						"IV",
						"iv",
						"Imaj7",
						"vi7"
					]
				},
				{
					name: "Verse 3",
					key: "E",
					scale: "major",
					romanTokens: ["Imaj7", "vi7", "Imaj7", "ii°", "VI", "Imaj7", "vi7"]
				}
			]
		}
	},
	{
		id: "lil-nas-x__montero-call-me-by-your-name",
		technicalNotes:
			"Flamenco-style (Andalusian) progression rocking between I and II the entire time. In phrygian dominant the 2nd scale degree is already the b2 (1 semitone above the tonic), so 'II' is correct — 'bII' would lower it a further semitone back to the tonic.",
		correctedSongContents: {
			sections: [
				{
					name: "Verse 1",
					key: "Eb",
					scale: "phrygianDominant",
					romanTokens: ["I", "II", "I", "II", "I", "II", "I", "II"]
				},
				{
					name: "Pre-Chorus",
					key: "Eb",
					scale: "phrygianDominant",
					romanTokens: ["I", "II", "I", "II"]
				},
				{
					name: "Chorus",
					key: "Eb",
					scale: "phrygianDominant",
					romanTokens: ["I", "II", "I", "II", "I", "II", "I", "II"]
				}
			]
		}
	},
	{
		id: "drake__passionfruit",
		technicalNotes:
			"Technically E lydian, but I feel it's easier to read it as B major. Note that the progression starts and ends with the same IV chord. It repeats endlessly, so I just wrote it once for each section.",
		correctedSongContents: {
			sections: [
				{
					name: "Intro",
					key: "B",
					scale: "major",
					romanTokens: ["IVmaj7", "ii7", "iii7", "vi7", "IVmaj7"]
				},
				{
					name: "Verse",
					key: "B",
					scale: "major",
					romanTokens: ["IVmaj7", "ii7", "iii7", "vi7", "IVmaj7"]
				},
				{
					name: "Chorus",
					key: "B",
					scale: "major",
					romanTokens: ["IVmaj7", "ii7", "iii7", "vi7", "IVmaj7"]
				}
			]
		}
	},
	{
		id: "danity-kane__damaged",
		correctedSongContents: {
			sections: [
				{
					name: "Refrain",
					key: "Eb",
					scale: "minor",
					romanTokens: ["i", "iv", "V", "VI", "iv", "V"]
				},
				{
					name: "Verse 1",
					key: "Eb",
					scale: "minor",
					romanTokens: ["i", "iv", "VI", "iv", "V"]
				},
				{
					name: "Chorus",
					key: "Eb",
					scale: "minor",
					romanTokens: ["VI", "v", "iv", "VII", "VI", "v", "iv", "V"]
				},
				{
					name: "Post-Chorus",
					key: "Eb",
					scale: "minor",
					romanTokens: ["i", "VII", "VI", "V"]
				},
				{
					name: "Verse 2",
					key: "Eb",
					scale: "minor",
					romanTokens: ["i", "VII", "VI", "V", "i", "VII", "VI", "iv"] // ends on the softer iv (rather than V), which blends with the tonic sung high in the melody
				},
				{
					name: "Bridge",
					key: "Eb",
					scale: "minor",
					romanTokens: ["i", "iv", "III", "iv"] // technically this ends with a spicy b2 in the bass
				},
				{
					name: "Outro",
					key: "Eb",
					scale: "minor",
					romanTokens: ["i", "iv", "III", "iv"]
				}
			]
		}
	}
];

export const problematicSongs: ProblematicSong[] = [
	{
		id: "miley-cyrus__cant-be-tamed",
		chordProgressionIssues: "eg chrous is i-iv but it's actually i-vi-V, etc"
	},
	{
		id: "juice-wrld__wishing-wel",
		chordProgressionIssues:
			"Just has an intro, missing eg main progression: vi-IV-I"
	},
	{
		id: "maroon-5__daylight",
		chordProgressionIssues: "Chorus looks right, missing eg verse"
	},
	{
		id: "lady-gaga__dope",
		chordProgressionIssues: "Just has chorus, eg no verse (iv-iii-VI-V)"
	},
	{
		id: "radiohead__creep",
		chordProgressionIssues:
			"at least the chorus is totally wrong (missed entire harmonic concept)"
	},
	{
		id: "kelly-clarkson__walk-away",
		chordProgressionIssues:
			"at least verse is totally wrong (should be I-bVII-IV)"
	},
	{
		id: "extreme__hole-hearted",
		chordProgressionIssues: "at least chorus is totally wrong"
	},
	{
		id: "bobby-caldwell__what-you-wont-do-for-love",
		chordProgressionIssues:
			"whole song looks way off. should be a dorian-y tune"
	},
	{
		id: "carly-rae-jepsen__call-me-maybe",
		chordProgressionIssues: "whole thing looks wrong, should be IV-vi-V-ish"
	}
];

export const songLooksGoodAsIs: string[] = [
	"juice-wrld__wishing-well",
	"luke-combs__beer-never-broke-my-heart",
	"beyonce__if-i-were-a-boy"
];

export const LOOKS_GOOD_LABEL = "looks good as is";
export const LOOKS_GOOD_EMOJI = "🔵";

const chordProgressionIssuesBySongId = new Map(
	problematicSongs.map((song) => [song.id, song.chordProgressionIssues])
);

export const getChordProgressionIssues = (
	songKey: string
): string | undefined => chordProgressionIssuesBySongId.get(songKey);

const looksGoodSongIds = new Set(songLooksGoodAsIs);

export const isSongLooksGoodAsIs = (songKey: string): boolean =>
	looksGoodSongIds.has(songKey);
