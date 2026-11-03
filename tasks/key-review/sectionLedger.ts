import fs from "fs";
import { csvFormat, csvParse } from "d3";
import type { SongInput } from "../../src/chord-processing/types.js";
import { toPitchClass } from "./pitchClasses.js";
import type { Confidence, ReviewMethod, Verdict } from "./ledger.js";
import { CONFIDENCE_LEVELS, REVIEW_METHODS, VERDICTS } from "./ledger.js";
import type { SectionChangeKind } from "./segmentSectionKeys.js";

export type SectionLedgerRow = {
	sectionId: string;
	songKey: string;
	labeledKey: string;
	labeledScale: string;
	verdict: Verdict;
	key: string;
	scale: string;
	transpose: number;
	flagKind: SectionChangeKind | "";
	method: ReviewMethod;
	confidence: Confidence;
	reviewedAt: string;
	note: string;
};

export type SectionLedger = Map<string, SectionLedgerRow>;

const SECTION_LEDGER_COLUMNS: (keyof SectionLedgerRow)[] = [
	"sectionId",
	"songKey",
	"labeledKey",
	"labeledScale",
	"verdict",
	"key",
	"scale",
	"transpose",
	"flagKind",
	"method",
	"confidence",
	"reviewedAt",
	"note"
];

const parseSectionLedgerRow = (
	row: Record<string, string | undefined>
): SectionLedgerRow => ({
	sectionId: row.sectionId ?? "",
	songKey: row.songKey ?? "",
	labeledKey: row.labeledKey ?? "",
	labeledScale: row.labeledScale ?? "",
	verdict: (row.verdict ?? VERDICTS.confirmed) as Verdict,
	key: row.key ?? "",
	scale: row.scale ?? "",
	transpose: Number(row.transpose ?? 0),
	flagKind: (row.flagKind ?? "") as SectionChangeKind | "",
	method: (row.method ?? REVIEW_METHODS.agent) as ReviewMethod,
	confidence: (row.confidence ?? "") as Confidence,
	reviewedAt: row.reviewedAt ?? "",
	note: row.note ?? ""
});

export const readSectionLedger = (ledgerPath: string): SectionLedger => {
	if (!fs.existsSync(ledgerPath)) return new Map();
	return new Map(
		csvParse(fs.readFileSync(ledgerPath, "utf-8"))
			.map(parseSectionLedgerRow)
			.map((row) => [row.sectionId, row] as const)
	);
};

export const writeSectionLedger = (
	ledgerPath: string,
	ledger: SectionLedger
): void => {
	const rows = [...ledger.values()].sort((a, b) =>
		a.songKey.localeCompare(b.songKey) || a.sectionId.localeCompare(b.sectionId)
	);
	fs.writeFileSync(
		ledgerPath,
		`${csvFormat(
			rows.map((row) => ({ ...row })),
			SECTION_LEDGER_COLUMNS
		)}\n`
	);
};

export const isSectionRowFresh = (
	row: SectionLedgerRow,
	section: SongInput
): boolean =>
	toPitchClass(row.labeledKey) === toPitchClass(section.key ?? row.labeledKey) &&
	row.labeledScale === (section.scale ?? row.labeledScale);

export const sectionLedgerRowChangesSong = (row: SectionLedgerRow): boolean =>
	row.verdict === VERDICTS.corrected &&
	(row.transpose !== 0 ||
		row.scale !== row.labeledScale ||
		toPitchClass(row.key) !== toPitchClass(row.labeledKey));

// ── decision types ───────────────────────────────────────────────────────────

export type SectionDecision = {
	sectionId: string;
	labeled: string;
	verdict: Verdict;
	key: string;
	scale: string;
	recordedKey?: string;
	confidence: Confidence;
	note: string;
};

export type SongSectionDecisions = {
	songKey: string;
	song?: {
		verdict: Verdict;
		key: string;
		scale: string;
		recordedKey?: string;
		confidence: Confidence;
		note: string;
	};
	sections: SectionDecision[];
};

// ── validation ───────────────────────────────────────────────────────────────

import { parsePitchClass } from "./pitchClasses.js";
import { SCALE_INTERVALS } from "../../src/chord-processing/scale-intervals.js";

const isValidNote = (note: string | undefined): boolean =>
	parsePitchClass(note ?? "") !== null;

export const validateSectionDecision = (
	decision: SectionDecision,
	commonModes: string[]
): string[] => {
	const errors: string[] = [];

	if (!Object.values(VERDICTS).includes(decision.verdict))
		errors.push(`verdict must be one of ${Object.values(VERDICTS).join(", ")}`);

	if (!isValidNote(decision.key)) errors.push(`key "${decision.key}" is not a note name`);

	if (decision.recordedKey && !isValidNote(decision.recordedKey))
		errors.push(`recordedKey "${decision.recordedKey}" is not a note name`);

	if (!SCALE_INTERVALS[decision.scale])
		errors.push(`scale "${decision.scale}" is unknown`);

	if (!commonModes.includes(decision.scale) && !decision.note?.trim())
		errors.push(`scale "${decision.scale}" is not a common mode; justify in note`);

	if (!(CONFIDENCE_LEVELS as readonly string[]).includes(decision.confidence))
		errors.push(`confidence must be one of ${CONFIDENCE_LEVELS.join(", ")}`);

	return errors;
};
