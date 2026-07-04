export type CorrectedSongSection = {
	label: string;
	chords: string[];
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
					chords: ["Eb", "E", "Eb", "E", "Eb", "E", "Eb", "E"]
				},
				{
					label: "Pre-Chorus",
					chords: ["Eb", "E", "Eb", "E"]
				},
				{
					label: "Chorus",
					chords: ["Eb", "E", "Eb", "E", "Eb", "E", "Eb", "E"]
				}
			]
		}
	}
];