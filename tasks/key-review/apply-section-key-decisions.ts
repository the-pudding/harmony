/**
 * CLI: apply section-level key-review decisions to the section ledger.
 *
 * Usage:
 *   npm run keys:apply-sections
 *
 * Reads all JSON files from SECTION_DECISIONS_DIR, validates each decision,
 * writes accepted rows to key-review-sections.csv. Optionally writes song-level
 * corrections back to key-review.csv (via the `song` field in decisions).
 */

import fs from "fs";
import path from "path";
import { buildMainDataset } from "../build-songs.js";
import { runKeyReview } from "./keyReviewBuildStep.js";
import {
	readSectionLedger,
	writeSectionLedger,
	validateSectionDecision,
	type SongSectionDecisions,
	type SectionLedgerRow
} from "./sectionLedger.js";
import {
	SECTION_LEDGER_PATH,
	SECTION_DECISIONS_DIR,
	KEY_REVIEW_LEDGER_PATH,
	KEY_REVIEW_DECISIONS_DIR
} from "./keyReviewPaths.js";
import {
	canonicalNoteName,
	parsePitchClass,
	toPitchClass
} from "./pitchClasses.js";
import {
	NOTES_PER_OCTAVE,
	pitchClass
} from "../../src/chord-processing/chord-classifier/notes.js";
import { REVIEW_METHODS, VERDICTS, writeLedger } from "./ledger.js";
import { decisionToLedgerRow } from "./keyDecisions.js";

const HALF_OCTAVE = NOTES_PER_OCTAVE / 2;

const shortestSignedInterval = (from: string, to: string): number => {
	const up = pitchClass(toPitchClass(to) - toPitchClass(from));
	return up > HALF_OCTAVE ? up - NOTES_PER_OCTAVE : up;
};

const today = (): string => new Date().toISOString().slice(0, 10);

// ── load corpus ────────────────────────────────────────────────────────────────

const { songs, metaBySongKey } = buildMainDataset();
const keyReview = runKeyReview(songs, metaBySongKey);
const { model, snapshots, sectionLedger } = keyReview;

const correctedSectionById = new Map(keyReview.songs.map((s) => [s.id, s]));
const commonModes = model.modes;

// ── read and validate decision files ──────────────────────────────────────────

if (!fs.existsSync(SECTION_DECISIONS_DIR)) {
	console.log(`No decisions directory found at ${SECTION_DECISIONS_DIR}. Nothing to apply.`);
	process.exit(0);
}

const decisionFiles = fs
	.readdirSync(SECTION_DECISIONS_DIR)
	.filter((f) => f.endsWith(".json"))
	.sort();

if (decisionFiles.length === 0) {
	console.log("No decision files found. Nothing to apply.");
	process.exit(0);
}

const allErrors: string[] = [];
const validRows: SectionLedgerRow[] = [];
const songLevelRevisions: Array<{ songKey: string; decisions: SongSectionDecisions }> = [];

for (const file of decisionFiles) {
	const filePath = path.join(SECTION_DECISIONS_DIR, file);
	let parsed: SongSectionDecisions[];
	try {
		parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
	} catch {
		allErrors.push(`${file}: invalid JSON`);
		continue;
	}

	for (const entry of parsed) {
		const snapshot = snapshots.get(entry.songKey);
		if (!snapshot) {
			allErrors.push(`${file}: unknown songKey "${entry.songKey}"`);
			continue;
		}

		if (entry.song) songLevelRevisions.push({ songKey: entry.songKey, decisions: entry });

		for (const sd of entry.sections) {
			const errors = validateSectionDecision(sd, commonModes);
			if (errors.length > 0) {
				errors.forEach((e) =>
					allErrors.push(`${file} [${entry.songKey}/${sd.sectionId}]: ${e}`)
				);
				continue;
			}

			const section = correctedSectionById.get(sd.sectionId);
			const labeledKey = section?.key ?? snapshot.labeledKey;
			const labeledScale = section?.scale ?? snapshot.labeledScale;

			const outcomeKey = sd.recordedKey ?? sd.key;
			const transpose = sd.recordedKey
				? shortestSignedInterval(sd.key, sd.recordedKey)
				: 0;

			validRows.push({
				sectionId: sd.sectionId,
				songKey: entry.songKey,
				labeledKey,
				labeledScale,
				verdict: sd.verdict,
				key: canonicalNoteName(outcomeKey),
				scale: sd.scale,
				transpose,
				flagKind: "",
				method: REVIEW_METHODS.agent,
				confidence: sd.confidence,
				reviewedAt: today(),
				note: sd.note?.trim() ?? ""
			});
		}
	}
}

if (allErrors.length > 0) {
	console.error(`\n${allErrors.length} validation error(s):\n${allErrors.map((e) => `  ${e}`).join("\n")}`);
	process.exit(1);
}

// ── write section ledger ───────────────────────────────────────────────────────

const updatedSectionLedger = new Map([
	...sectionLedger,
	...validRows.map((row) => [row.sectionId, row] as const)
]);
writeSectionLedger(SECTION_LEDGER_PATH, updatedSectionLedger);
console.log(
	`Wrote ${validRows.length} section decision(s) (${updatedSectionLedger.size} total) → ${SECTION_LEDGER_PATH}`
);

// ── apply any song-level revisions ────────────────────────────────────────────

if (songLevelRevisions.length > 0) {
	const { ledger } = keyReview;
	const revisedLedger = new Map(ledger);

	for (const { songKey, decisions } of songLevelRevisions) {
		const sd = decisions.song;
		if (!sd) continue;
		const snapshot = snapshots.get(songKey);
		if (!snapshot) continue;

		const row = decisionToLedgerRow(
			{
				songKey,
				labeled: `${snapshot.labeledKey} ${snapshot.labeledScale}`,
				verdict: sd.verdict,
				key: sd.key,
				scale: sd.scale,
				recordedKey: sd.recordedKey,
				confidence: sd.confidence,
				note: sd.note
			},
			snapshot,
			"section-level-revision",
			today()
		);
		revisedLedger.set(songKey, row);
	}

	writeLedger(KEY_REVIEW_LEDGER_PATH, revisedLedger);
	console.log(
		`Wrote ${songLevelRevisions.length} song-level revision(s) → ${KEY_REVIEW_LEDGER_PATH}`
	);
}
