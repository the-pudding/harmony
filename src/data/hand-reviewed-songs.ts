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
	}
];