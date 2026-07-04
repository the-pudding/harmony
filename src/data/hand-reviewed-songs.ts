export type CorrectedSongSection = {
	label: string;
	romanTokens: string[];
};

export type CorrectedSongContents = {
	key?: string;
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
			"This is generally a Flamenco-style (Andalusian) progression, just rocking between a sort of I and bII the entire time. I wrote Ab minor, but you could think of it as E phrygian dominant (in HT, `scale: phrygianDominant`).",
		correctedSongContents: {
			key: "Ab minor",
			sections: [
				{
					label: "Verse 1",
					romanTokens: ["V", "bVI", "V", "bVI", "V", "bVI", "V", "bVI"]
				},
				{
					label: "Pre-Chorus",
					romanTokens: ["V", "bVI", "V", "bVI"]
				},
				{
					label: "Chorus",
					romanTokens: ["V", "bVI", "V", "bVI", "V", "bVI", "V", "bVI"]
				}
			]
		}
	},
	{
		id: "danity-kane__damaged",
		correctedSongContents: {
			key: "Eb minor",
			sections: [
				{
					label: "Refrain",
					romanTokens: ["i", "iv", "V", "VI", "iv", "V"]
				},
				{
					label: "Verse 1",
					romanTokens: ["i", "iv", "VI", "iv", "V"]
				},
				{
					label: "Chorus",
					romanTokens: ["VI", "v", "iv", "VII", "VI", "v", "iv", "V"]
				},
				{
					label: "Post-Chorus",
					romanTokens: ["i", "VII", "VI", "V"]
				},
				{
					label: "Verse 2",
					romanTokens: ["i", "VII", "VI", "V", "i", "VII", "VI", "iv"] // ends on the softer iv (rather than V), which blends with the tonic sung high in the melody
				},
				{
					label: "Bridge",
					romanTokens: ["i", "iv", "III", "iv"] // technically this ends with a spicy b2 in the bass acting as a dominant root of the subsequent VI chord in the chorus
				},
				{
					label: "Outro",
					romanTokens: ["i", "iv", "III", "iv"]
				}
			]
		}
	}
];