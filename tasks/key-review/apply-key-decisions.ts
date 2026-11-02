import fs from "fs";
import path from "path";
import { buildMainDataset } from "../build-songs.js";
import { runKeyReview } from "./keyReviewBuildStep.js";
import { writeLedger, type Ledger, type LedgerRow } from "./ledger.js";
import {
	decisionMatchesSnapshot,
	normalizeDecisionForApply,
	decisionToLedgerRow,
	sameReviewOutcome,
	validateDecision,
	type KeyDecision
} from "./keyDecisions.js";
import {
	KEY_REVIEW_DECISIONS_DIR,
	KEY_REVIEW_LEDGER_PATH,
	KEY_REVIEW_QUEUE_DIR
} from "./keyReviewPaths.js";
import type { QueueEntry } from "./reviewQueue.js";
import { findReviewMisfits } from "./keyReviewPipeline.js";

const REASON_SEPARATOR = "+";
const MARGIN_DECIMALS = 2;

const readJsonFiles = <T>(dir: string): { file: string; items: T[] }[] =>
	fs.existsSync(dir)
		? fs
				.readdirSync(dir)
				.filter((file) => file.endsWith(".json"))
				.sort()
				.map((file) => ({
					file,
					items: JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"))
				}))
		: [];

const queuedReasons = new Map(
	readJsonFiles<QueueEntry>(KEY_REVIEW_QUEUE_DIR).flatMap(({ items }) =>
		items.map((entry) => [entry.songKey, entry.reasons.join(REASON_SEPARATOR)])
	)
);

const decisions = readJsonFiles<KeyDecision>(KEY_REVIEW_DECISIONS_DIR).flatMap(
	({ file, items }) => items.map((decision) => ({ file, decision }))
);

const { songs, metaBySongKey } = buildMainDataset();
const { ledger, snapshots, model } = runKeyReview(songs, metaBySongKey);
const reviewedAt = new Date().toISOString().slice(0, 10);

const isOutdated = ({ decision }: { decision: KeyDecision }): boolean => {
	const snapshot = snapshots.get(decision.songKey);
	return snapshot !== undefined && !decisionMatchesSnapshot(decision, snapshot);
};

const outdated = decisions.filter(isOutdated);
const validated = decisions
	.filter((entry) => !isOutdated(entry))
	.map((entry) => {
		const snapshot = snapshots.get(entry.decision.songKey)!;
		const decision = normalizeDecisionForApply(entry.decision, snapshot);
		return {
			...entry,
			decision,
			errors: validateDecision(decision, snapshots, model.modes)
		};
	});
const invalid = validated.filter(({ errors }) => errors.length);
const valid = validated.filter(({ errors }) => !errors.length);

const lastValidBySongKey = valid.reduce(
	(bySongKey, entry) =>
		new Map([...bySongKey, [entry.decision.songKey, entry] as const]),
	new Map<string, (typeof valid)[number]>()
);
const dedupedValid = [...lastValidBySongKey.values()];

const QUEUED_DECISION_FILE_PATTERN = /^batch-\d{8}-\d{4}-\d{3}\.json$/;

const toLedgerRow = (decision: KeyDecision): LedgerRow => {
	const previous = ledger.get(decision.songKey);
	const row = decisionToLedgerRow(
		decision,
		snapshots.get(decision.songKey)!,
		queuedReasons.get(decision.songKey) ?? previous?.flagReasons ?? "",
		reviewedAt
	);
	return previous && sameReviewOutcome(previous, row)
		? { ...row, reviewedAt: previous.reviewedAt }
		: row;
};

const candidateRows = dedupedValid.map(({ decision }) => toLedgerRow(decision));
const decisionFiles = new Map(
	dedupedValid.map(({ file, decision }) => [decision.songKey, file] as const)
);
const misfitCandidates = candidateRows.filter((row) => {
	const file = decisionFiles.get(row.songKey);
	return file === undefined || !QUEUED_DECISION_FILE_PATTERN.test(file);
});
const misfits = findReviewMisfits(
	songs,
	misfitCandidates,
	snapshots,
	model
).map((misfit) => ({ ...misfit, file: decisionFiles.get(misfit.row.songKey) }));
const misfitSongKeys = new Set(misfits.map(({ row }) => row.songKey));
const acceptedRows = candidateRows.filter(
	(row) => !misfitSongKeys.has(row.songKey)
);

const updatedLedger: Ledger = new Map([
	...[...ledger].filter(([songKey]) => !misfitSongKeys.has(songKey)),
	...acceptedRows.map((row) => [row.songKey, row] as const)
]);

writeLedger(KEY_REVIEW_LEDGER_PATH, updatedLedger);
console.log(
	`Applied ${acceptedRows.length} key decisions from ${KEY_REVIEW_DECISIONS_DIR} to ${KEY_REVIEW_LEDGER_PATH}`
);

if (misfits.length) {
	console.warn(
		`Held back ${misfits.length} decisions whose key fits the (rekeyed) chords much worse than another key; they're unreviewed again, so \`npm run keys:flag\` re-queues them:`
	);
	misfits.forEach(({ file, row, margin }) =>
		console.warn(
			`  ${file} ${row.songKey}: ${row.key} ${row.scale}${row.transpose ? ` transpose ${row.transpose}` : ""} [${row.confidence}] margin ${margin.toFixed(MARGIN_DECIMALS)}`
		)
	);
}

if (outdated.length) {
	console.warn(
		`Skipped ${outdated.length} decisions whose song was re-scraped since review (run \`npm run keys:flag\` to re-queue them)`
	);
}

if (invalid.length) {
	console.error(`${invalid.length} decisions were rejected:`);
	invalid.forEach(({ file, decision, errors }) =>
		console.error(`  ${file} ${decision.songKey}: ${errors.join("; ")}`)
	);
	process.exitCode = 1;
}
