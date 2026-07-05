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

export type HandReviewedSong = {
	id: string;
	chordProgressionIssues?: string;
	correctedSongContents?: CorrectedSongContents;
	technicalNotes?: string;
};

export const handReviewedSongs: HandReviewedSong[] = [
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
		chordProgressionIssues:
			"It's wrong and missing a lot of sections. This song has a lot of lovely, jazzy chords: vamps on Imaj7-vi7, some nice b6 noted chords, etc."
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

const chordProgressionIssuesBySongId = new Map(
	handReviewedSongs
		.filter((review) => review.chordProgressionIssues !== undefined)
		.map((review) => [review.id, review.chordProgressionIssues!])
);

export const getChordProgressionIssues = (
	songKey: string
): string | undefined => chordProgressionIssuesBySongId.get(songKey);
