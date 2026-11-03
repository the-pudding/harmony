/**
 * CLI: generate section-level key review queue batches.
 *
 * Usage:
 *   npm run keys:flag-sections
 *   npm run keys:flag-sections -- --batch-size 30 --dry-run
 *
 * Reads the corpus, applies the song-level ledger, then runs Viterbi section
 * segmentation on every song. Outputs one JSON file per batch of songs that
 * have at least one section key conflict.
 */

import fs from "fs";
import path from "path";
import { buildMainDataset } from "../build-songs.js";
import { runKeyReview } from "./keyReviewBuildStep.js";
import { findSectionKeyConflicts, DEFAULT_VITERBI_PARAMS } from "./segmentSectionKeys.js";
import { isSectionRowFresh, readSectionLedger } from "./sectionLedger.js";
import { SECTION_LEDGER_PATH, SECTION_QUEUE_DIR } from "./keyReviewPaths.js";
import {
	formatTonality,
	type KeyReviewResult
} from "./keyReviewBuildStep.js";
import { NOTE_NAMES } from "../../src/chord-processing/chord-classifier/notes.js";
import { formatChordName } from "../../src/chord-processing/formatChordDisplay.js";
import { parseSongTitleAndSectionLabel } from "../../src/chord-processing/songIdentity.js";
import type { SongInput } from "../../src/chord-processing/types.js";
import type { StructuredChord } from "../../src/chord-processing/types.js";
import { toPitchClass } from "./pitchClasses.js";
import type { SongSectionAssessment } from "./segmentSectionKeys.js";

const DEFAULT_BATCH_SIZE = 25;
const BATCH_NUMBER_DIGITS = 3;
const BATCH_SIZE_FLAG = "--batch-size";
const DRY_RUN_FLAG = "--dry-run";
const MIN_MAX_MARGIN_FLAG = "--min-max-margin";
// Only include songs where at least one section flag exceeds this margin.
// Filters out low-confidence flags; all 6 known modulating golden songs have
// at least one flag with margin >= 1.5 using DEFAULT_VITERBI_PARAMS.
const DEFAULT_MIN_MAX_MARGIN = 1.5;
const MAX_CHORDS_PER_SECTION = 48;

const cliArgs = process.argv.slice(2);
const batchSizeArg = cliArgs[cliArgs.indexOf(BATCH_SIZE_FLAG) + 1];
const batchSize = cliArgs.includes(BATCH_SIZE_FLAG) ? Number(batchSizeArg) : DEFAULT_BATCH_SIZE;
const isDryRun = cliArgs.includes(DRY_RUN_FLAG);
const minMaxMarginArg = cliArgs[cliArgs.indexOf(MIN_MAX_MARGIN_FLAG) + 1];
const minMaxMargin = cliArgs.includes(MIN_MAX_MARGIN_FLAG)
	? Number(minMaxMarginArg)
	: DEFAULT_MIN_MAX_MARGIN;

// ── queue entry format ────────────────────────────────────────────────────────

type SectionQueueSection = {
	sectionId: string;
	name: string;
	labeledKey: string;
	labeledScale: string;
	chords: string;
	romans: string;
	chordCount: number;
};

type SectionQueueFlag = {
	sectionId: string;
	kind: string;
	suggestedKey: string;
	margin: number;
};

type SectionQueueEntry = {
	songKey: string;
	title: string;
	artist: string;
	source: string;
	url: string;
	songLabeledKey: string;
	sections: SectionQueueSection[];
	flags: SectionQueueFlag[];
};

// ── formatters ────────────────────────────────────────────────────────────────

const chordLabel = (chord: SongInput["progression"][number]): string =>
	formatChordName({
		rootPitchClass: toPitchClass(chord.noteName),
		suffix: chord.suffix,
		bassPitchClass: chord.bassNoteName ? toPitchClass(chord.bassNoteName) : undefined
	} as StructuredChord).replace(" / ", "/");

const toQueueSection = (section: SongInput): SectionQueueSection => ({
	sectionId: section.id,
	name: parseSongTitleAndSectionLabel(section.title).sectionLabel ?? section.title,
	labeledKey: section.key ?? "",
	labeledScale: section.scale ?? "",
	chords: section.progression.slice(0, MAX_CHORDS_PER_SECTION).map(chordLabel).join(" "),
	romans: (section.romanTokens ?? []).slice(0, MAX_CHORDS_PER_SECTION).join(" "),
	chordCount: section.progression.length
});

// ── queue building ────────────────────────────────────────────────────────────

const buildQueueEntry = (
	assessment: SongSectionAssessment,
	sectionsBySong: Map<string, SongInput[]>,
	keyReview: KeyReviewResult
): SectionQueueEntry | null => {
	const sections = sectionsBySong.get(assessment.songKey);
	const snapshot = keyReview.snapshots.get(assessment.songKey);
	if (!sections || !snapshot) return null;

	return {
		songKey: assessment.songKey,
		title: snapshot.title,
		artist: snapshot.artist,
		source: snapshot.source,
		url: snapshot.url,
		songLabeledKey: formatTonality({ tonicPc: toPitchClass(snapshot.labeledKey), scale: snapshot.labeledScale }),
		sections: sections.map(toQueueSection),
		flags: assessment.flags.map((flag) => ({
			sectionId: flag.sectionId,
			kind: flag.kind,
			suggestedKey: formatTonality(flag.suggested),
			margin: Number.isFinite(flag.margin) ? Number(flag.margin.toFixed(3)) : null
		}))
	};
};

const chunk = <T>(items: T[], size: number): T[][] =>
	Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
		items.slice(index * size, (index + 1) * size)
	);

const roundStamp = (): string =>
	new Date()
		.toISOString()
		.slice(0, 16)
		.replace(/[-:]/g, "")
		.replace("T", "-");

const entryMaxMargin = (entry: SectionQueueEntry): number =>
	Math.max(...entry.flags.map((f) => (f.margin != null ? f.margin : Number.MAX_VALUE)));

const writeQueueBatches = (entries: SectionQueueEntry[]): number => {
	const sorted = [...entries].sort((a, b) => entryMaxMargin(b) - entryMaxMargin(a));
	const batches = chunk(sorted, batchSize);
	const round = roundStamp();

	fs.rmSync(SECTION_QUEUE_DIR, { recursive: true, force: true });
	fs.mkdirSync(SECTION_QUEUE_DIR, { recursive: true });

	batches.forEach((batch, index) =>
		fs.writeFileSync(
			path.join(
				SECTION_QUEUE_DIR,
				`batch-${round}-${String(index + 1).padStart(BATCH_NUMBER_DIGITS, "0")}.json`
			),
			`${JSON.stringify(batch, null, "\t")}\n`
		)
	);
	return batches.length;
};

// ── main ──────────────────────────────────────────────────────────────────────

const { songs, metaBySongKey } = buildMainDataset();
const keyReview = runKeyReview(songs, metaBySongKey);
const { songs: correctedSongs, snapshots, model, sectionLedger } = keyReview;

const sectionsBySong = new Map<string, SongInput[]>();
for (const section of correctedSongs) {
	const songKey = section.songKey ?? section.id;
	sectionsBySong.set(songKey, [...(sectionsBySong.get(songKey) ?? []), section]);
}

const allConflicts = findSectionKeyConflicts(
	model,
	correctedSongs,
	snapshots,
	DEFAULT_VITERBI_PARAMS
);
const effectiveMargin = (m: number) => (Number.isFinite(m) ? m : Number.MAX_VALUE);
const conflicts = allConflicts.filter(
	(c) => Math.max(...c.flags.map((f) => effectiveMargin(f.margin))) >= minMaxMargin
);

const alreadyReviewed = conflicts.filter((assessment) => {
	const sections = sectionsBySong.get(assessment.songKey) ?? [];
	return assessment.flags.every((flag) => {
		const section = sections.find((s) => s.id === flag.sectionId);
		if (!section) return false;
		const row = sectionLedger.get(flag.sectionId);
		return row !== undefined && isSectionRowFresh(row, section);
	});
});

const pending = conflicts.filter(
	(a) => !alreadyReviewed.some((r) => r.songKey === a.songKey)
);

console.log(
	`Section key detection: ${allConflicts.length} songs with flags ` +
		`(${allConflicts.length - conflicts.length} filtered below minMaxMargin=${minMaxMargin}), ` +
		`${conflicts.length} qualifying songs ` +
		`(${alreadyReviewed.length} already reviewed, ${pending.length} pending)`
);

const flagsByKind = pending.flatMap((a) => a.flags).reduce(
	(acc, f) => ({ ...acc, [f.kind]: (acc[f.kind] ?? 0) + 1 }),
	{} as Record<string, number>
);
console.log(
	`Pending flags: ${Object.entries(flagsByKind)
		.map(([k, n]) => `${k}=${n}`)
		.join(", ")}`
);

if (isDryRun) {
	console.log("Dry run: queue not written");
	process.exit(0);
}

const entries = pending.flatMap((assessment) => {
	const entry = buildQueueEntry(assessment, sectionsBySong, keyReview);
	return entry ? [entry] : [];
});

const batchCount = writeQueueBatches(entries);
console.log(
	`Wrote ${batchCount} batches (${entries.length} songs) to ${SECTION_QUEUE_DIR}`
);
