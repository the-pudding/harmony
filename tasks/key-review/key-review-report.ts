import fs from "fs";
import type { SongInput } from "../../src/chord-processing/types.js";
import { resolveSongKey } from "../../src/chord-processing/songIdentity.js";
import { groupSongs } from "../../src/data/songBrowser.js";
import { computeSongCoverage } from "../../src/routes/demo/define-chord-progression/compute-coverage-of-all-songs/computeSongCoverage.js";
import { buildMainDataset } from "../build-songs.js";
import { runKeyReview } from "./keyReviewBuildStep.js";
import { isLedgerRowFresh, ledgerRowChangesSong } from "./ledger.js";
import { KEY_REVIEW_REPORT_PATH } from "./keyReviewPaths.js";
import { buildKeyReviewReport } from "./keyReviewReport.js";

const sectionChanged = (before: SongInput, after: SongInput): boolean =>
	before.key !== after.key ||
	before.scale !== after.scale ||
	JSON.stringify(before.romanTokens) !== JSON.stringify(after.romanTokens) ||
	JSON.stringify(before.progression) !== JSON.stringify(after.progression);

const { songs: rawSongs, metaBySongKey } = buildMainDataset() as {
	songs: SongInput[];
	metaBySongKey: Map<string, { capo: number; url: string }>;
};
const { songs, ledger, snapshots, pending } = runKeyReview(
	rawSongs,
	metaBySongKey
);

const correctedSongKeys = new Set(
	[...ledger.values()]
		.filter((row) => {
			const snapshot = snapshots.get(row.songKey);
			return (
				snapshot !== undefined &&
				isLedgerRowFresh(row, snapshot) &&
				ledgerRowChangesSong(row)
			);
		})
		.map((row) => row.songKey)
);

const coverageOf = (sections: SongInput[]) =>
	groupSongs(
		sections.filter((section) => correctedSongKeys.has(resolveSongKey(section)))
	).map(computeSongCoverage);

const report = buildKeyReviewReport({
	generatedAt: new Date().toISOString().slice(0, 10),
	ledger,
	snapshots,
	pendingCount: pending.length,
	flaggedPendingCount: pending.filter(
		({ assessment }) => assessment.reasons.length
	).length,
	changedSectionCount: rawSongs.filter((section, index) =>
		sectionChanged(section, songs[index])
	).length,
	totalSectionCount: rawSongs.length,
	coverageBefore: coverageOf(rawSongs),
	coverageAfter: coverageOf(songs)
});

fs.writeFileSync(KEY_REVIEW_REPORT_PATH, report);
console.log(`Wrote ${KEY_REVIEW_REPORT_PATH}`);
