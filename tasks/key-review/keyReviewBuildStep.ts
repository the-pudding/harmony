import { NOTE_NAMES } from "../../src/chord-processing/chord-classifier/notes.js";
import type { SongInput } from "../../src/chord-processing/types.js";
import { readLedger, type Ledger, type SongKeySnapshot } from "./ledger.js";
import {
	applyKeyReviewLedger,
	assessSongs,
	buildSongSnapshots,
	countCorrectedSongs,
	isUnreviewedOrStale,
	trainModelFromCorpus,
	type AssessedSong,
	type SongSourceMeta
} from "./keyReviewPipeline.js";
import {
	KEY_REVIEW_LEDGER_PATH,
	SECTION_LEDGER_PATH
} from "./keyReviewPaths.js";
import {
	isSectionRowFresh,
	readSectionLedger,
	sectionLedgerRowChangesSong,
	type SectionLedger
} from "./sectionLedger.js";
import { rekeySectionTo } from "./rekeySong.js";
import type { Tonality, TonalityModel } from "./tonalityModel.js";

const MAX_LOGGED_FLAGGED_SONGS = 50;
const MARGIN_DECIMALS = 2;

export type KeyReviewResult = {
	songs: SongInput[];
	ledger: Ledger;
	sectionLedger: SectionLedger;
	snapshots: Map<string, SongKeySnapshot>;
	model: TonalityModel;
	pending: AssessedSong[];
};

export const formatTonality = ({ tonicPc, scale }: Tonality): string =>
	`${NOTE_NAMES[tonicPc]} ${scale}`;

export const applySectionKeyLedger = (
	songs: SongInput[],
	sectionLedger: SectionLedger
): SongInput[] =>
	songs.map((section) => {
		const row = sectionLedger.get(section.id);
		if (
			!row ||
			!isSectionRowFresh(row, section) ||
			!sectionLedgerRowChangesSong(row)
		)
			return section;
		return rekeySectionTo(section, row.key, row.scale, row.transpose);
	});

export const runKeyReview = (
	rawSongs: SongInput[],
	metaBySongKey: Map<string, SongSourceMeta>,
	ledger: Ledger = readLedger(KEY_REVIEW_LEDGER_PATH),
	sectionLedger: SectionLedger = readSectionLedger(SECTION_LEDGER_PATH)
): KeyReviewResult => {
	const snapshots = buildSongSnapshots(rawSongs, metaBySongKey);
	const songLevelCorrected = applyKeyReviewLedger(rawSongs, snapshots, ledger);
	const songs = applySectionKeyLedger(songLevelCorrected, sectionLedger);
	const model = trainModelFromCorpus(songs, snapshots, ledger);
	const pending = assessSongs(
		rawSongs,
		snapshots,
		ledger,
		model,
		isUnreviewedOrStale
	);
	return { songs, ledger, sectionLedger, snapshots, model, pending };
};

const formatFlaggedSong = ({ snapshot, status, assessment }: AssessedSong) => {
	const [best] = assessment.candidates;
	const margin = Number.isFinite(assessment.margin)
		? assessment.margin.toFixed(MARGIN_DECIMALS)
		: "n/a";
	return `  ${snapshot.songKey} [${status}]: labeled ${formatTonality(assessment.labeled)}, likely ${formatTonality(best)} (margin ${margin}; ${assessment.reasons.join(", ")})`;
};

export const logKeyReviewSummary = ({
	snapshots,
	ledger,
	model,
	pending
}: KeyReviewResult): void => {
	const flagged = pending.filter(({ assessment }) => assessment.reasons.length);
	console.log(
		`Key review: ${snapshots.size - pending.length} songs reviewed (${countCorrectedSongs(snapshots, ledger)} corrected), ${pending.length} unreviewed or stale; common modes: ${model.modes.join(", ")}`
	);
	if (flagged.length === 0) return;

	console.warn(
		`${flagged.length} unreviewed songs may have the wrong key. Run \`npm run keys:flag\` and review the queue (see tasks/key-review/review-prompt.md):`
	);
	flagged
		.slice(0, MAX_LOGGED_FLAGGED_SONGS)
		.forEach((song) => console.warn(formatFlaggedSong(song)));
	if (flagged.length > MAX_LOGGED_FLAGGED_SONGS) {
		console.warn(`  ...and ${flagged.length - MAX_LOGGED_FLAGGED_SONGS} more`);
	}
};
