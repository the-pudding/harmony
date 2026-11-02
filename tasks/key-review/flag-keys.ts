import fs from "fs";
import path from "path";
import { buildMainDataset } from "../build-songs.js";
import { runKeyReview } from "./keyReviewBuildStep.js";
import {
	REVIEW_METHODS,
	snapshotToLedgerFields,
	VERDICTS,
	writeLedger,
	type Ledger
} from "./ledger.js";
import type { AssessedSong } from "./keyReviewPipeline.js";
import {
	KEY_REVIEW_LEDGER_PATH,
	KEY_REVIEW_QUEUE_DIR
} from "./keyReviewPaths.js";
import { chunk, compareQueueEntries, toQueueEntry } from "./reviewQueue.js";

const DEFAULT_BATCH_SIZE = 25;
const BATCH_NUMBER_DIGITS = 3;
const BATCH_SIZE_FLAG = "--batch-size";
const DRY_RUN_FLAG = "--dry-run";

const cliArgs = process.argv.slice(2);
const batchSizeArg = cliArgs[cliArgs.indexOf(BATCH_SIZE_FLAG) + 1];
const batchSize = cliArgs.includes(BATCH_SIZE_FLAG)
	? Number(batchSizeArg)
	: DEFAULT_BATCH_SIZE;
const isDryRun = cliArgs.includes(DRY_RUN_FLAG);

const today = (): string => new Date().toISOString().slice(0, 10);
const ROUND_STAMP_LENGTH = 16;
const roundStamp = (): string =>
	new Date()
		.toISOString()
		.slice(0, ROUND_STAMP_LENGTH)
		.replace(/[-:]/g, "")
		.replace("T", "-");

const withAutoConfirmedSongs = (
	ledger: Ledger,
	cleanSongs: AssessedSong[]
): Ledger =>
	new Map([
		...ledger,
		...cleanSongs.map(
			({ snapshot }) =>
				[
					snapshot.songKey,
					{
						...snapshotToLedgerFields(snapshot),
						verdict: VERDICTS.confirmed,
						key: snapshot.labeledKey,
						scale: snapshot.labeledScale,
						transpose: 0,
						method: REVIEW_METHODS.auto,
						confidence: "" as const,
						flagReasons: "",
						reviewedAt: today(),
						note: ""
					}
				] as const
		)
	]);

const writeQueueBatches = (flaggedSongs: AssessedSong[]): number => {
	const entries = flaggedSongs.map(toQueueEntry).sort(compareQueueEntries);
	const batches = chunk(entries, batchSize);
	const round = roundStamp();
	fs.rmSync(KEY_REVIEW_QUEUE_DIR, { recursive: true, force: true });
	fs.mkdirSync(KEY_REVIEW_QUEUE_DIR, { recursive: true });
	batches.forEach((batch, index) =>
		fs.writeFileSync(
			path.join(
				KEY_REVIEW_QUEUE_DIR,
				`batch-${round}-${String(index + 1).padStart(BATCH_NUMBER_DIGITS, "0")}.json`
			),
			`${JSON.stringify(batch, null, "\t")}\n`
		)
	);
	return batches.length;
};

const { songs, metaBySongKey } = buildMainDataset();
const { ledger, pending, model } = runKeyReview(songs, metaBySongKey);
const flagged = pending.filter(({ assessment }) => assessment.reasons.length);
const clean = pending.filter(({ assessment }) => !assessment.reasons.length);

console.log(
	`Common modes: ${model.modes.join(", ")}. ${pending.length} unreviewed or stale songs: ${clean.length} look fine, ${flagged.length} flagged`
);

if (isDryRun) {
	console.log("Dry run: ledger and queue left untouched");
} else {
	writeLedger(KEY_REVIEW_LEDGER_PATH, withAutoConfirmedSongs(ledger, clean));
	const batchCount = writeQueueBatches(flagged);
	console.log(
		`Auto-confirmed ${clean.length} songs in ${KEY_REVIEW_LEDGER_PATH}; wrote ${batchCount} review batches to ${KEY_REVIEW_QUEUE_DIR}`
	);
}
