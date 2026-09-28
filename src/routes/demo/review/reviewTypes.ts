import type {
	CorrectedSongContents,
	SongKeyAdjustment
} from "../../../data/hand-corrected-songs.js";

export type ReviewerName = "Michelle" | "David";

export type ReviewStatus = "verified" | "flagged";

export type ReviewStatusEntry = {
	status: ReviewStatus;
	reviewedBy: string;
	reviewedAt: string;
	note?: string;
};

// Keyed by songKey — see src/data/song-review-status.json.
export type ReviewStatusStore = Record<string, ReviewStatusEntry>;

export type ReviewedCorrectionEntry = {
	correctedSongContents?: CorrectedSongContents;
	keyAdjustment?: SongKeyAdjustment;
	technicalNotes?: string;
};

// Keyed by songKey — see src/data/reviewed-corrections.json. Same shape as
// HandCorrectedSong (hand-corrected-songs.ts) minus `id`, since the key
// already is the id.
export type ReviewedCorrectionsStore = Record<string, ReviewedCorrectionEntry>;

export type ReviewDecisionRequest =
	| { songKey: string; action: "verify"; reviewedBy: string }
	| { songKey: string; action: "flag"; reviewedBy: string; note: string }
	| {
			songKey: string;
			action: "correct";
			reviewedBy: string;
			note?: string;
			correction: ReviewedCorrectionEntry;
	  }
	// Bumps the shared split seed, reshuffling which reviewer each
	// still-unreviewed song is assigned to — see reviewQueue.ts.
	| { action: "reshuffle" };

export type ReviewStateResponse = {
	reviewStatus: ReviewStatusStore;
	reviewedCorrections: ReviewedCorrectionsStore;
	splitSeed: number;
};
