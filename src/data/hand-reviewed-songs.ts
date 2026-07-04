export type CorrectedSongSection = {
	name: string;
	key: string;
	scale: string;
	romanTokens: string[];
};

export type CorrectedSongContents = {
	sections: CorrectedSongSection[];
};

export type HandReviewedSong = {
	id: string;
	chordProgressionIssues?: string;
	correctedSongContents?: CorrectedSongContents;
	technicalNotes?: string;
};

export const handReviewedSongs: HandReviewedSong[] = [
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
		correctedSongContents: {
			sections: [
				{
					name: "Verse",
					key: "B",
					scale: "major",
					romanTokens: ["IV", "ii", "iii", "V", "IV"]
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
