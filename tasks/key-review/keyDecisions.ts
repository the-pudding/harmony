import { SCALE_INTERVALS } from "../../src/chord-processing/scale-intervals.js";
import {
	NOTES_PER_OCTAVE,
	pitchClass
} from "../../src/chord-processing/chord-classifier/notes.js";
import {
	CONFIDENCE_LEVELS,
	REVIEW_METHODS,
	snapshotToLedgerFields,
	VERDICTS,
	type Confidence,
	type LedgerRow,
	type SongKeySnapshot,
	type Verdict
} from "./ledger.js";
import {
	canonicalNoteName,
	parsePitchClass,
	toPitchClass
} from "./pitchClasses.js";

export type KeyDecision = {
	songKey: string;
	labeled: string;
	verdict: Verdict;
	key: string;
	scale: string;
	recordedKey?: string;
	transpose?: number;
	confidence: Confidence;
	note: string;
};

type DecisionOutcome = { key: string; transpose: number };

const TONALITY_SEPARATOR = " ";
const HALF_OCTAVE = NOTES_PER_OCTAVE / 2;

const parseTonalityLabel = (label: string) => {
	const [key, scale] = label.trim().split(TONALITY_SEPARATOR);
	return { key: key ?? "", scale: scale ?? "" };
};

const sameKey = (a: string, b: string): boolean =>
	parsePitchClass(a) !== null && parsePitchClass(a) === parsePitchClass(b);

const shortestSignedInterval = (from: string, to: string): number => {
	const up = pitchClass(toPitchClass(to) - toPitchClass(from));
	return up > HALF_OCTAVE ? up - NOTES_PER_OCTAVE : up;
};

const hasRecordedKey = (decision: KeyDecision): boolean =>
	Boolean(decision.recordedKey?.trim());

const isValidNote = (note: string | undefined): boolean =>
	parsePitchClass(note ?? "") !== null;

export const decisionOutcome = (decision: KeyDecision): DecisionOutcome =>
	hasRecordedKey(decision)
		? {
				key: decision.recordedKey!,
				transpose: shortestSignedInterval(decision.key, decision.recordedKey!)
			}
		: { key: decision.key, transpose: decision.transpose ?? 0 };

export const decisionMatchesSnapshot = (
	decision: KeyDecision,
	snapshot: SongKeySnapshot
): boolean => {
	const labeled = parseTonalityLabel(decision.labeled ?? "");
	return (
		sameKey(labeled.key, snapshot.labeledKey) &&
		labeled.scale === snapshot.labeledScale
	);
};

const noteErrors = (decision: KeyDecision): string[] => [
	...(isValidNote(decision.key)
		? []
		: [`key "${decision.key}" is not a note name`]),
	...(!hasRecordedKey(decision) || isValidNote(decision.recordedKey)
		? []
		: [`recordedKey "${decision.recordedKey}" is not a note name`]),
	...(hasRecordedKey(decision) && (decision.transpose ?? 0) !== 0
		? ["give either recordedKey or transpose, not both"]
		: [])
];

const outcomeErrors = (
	decision: KeyDecision,
	snapshot: SongKeySnapshot
): string[] => {
	const { key, transpose } = decisionOutcome(decision);
	const keepsLabel =
		sameKey(key, snapshot.labeledKey) &&
		decision.scale === snapshot.labeledScale &&
		transpose === 0;
	return [
		...(Number.isInteger(transpose) && Math.abs(transpose) < NOTES_PER_OCTAVE
			? []
			: ["transpose must be an integer between -11 and 11"]),
		...(decision.verdict === VERDICTS.confirmed && !keepsLabel
			? ["confirmed decisions must keep the labeled key and scale"]
			: []),
		...(decision.verdict === VERDICTS.corrected && keepsLabel
			? ["corrected decisions must change the key, scale or pitch"]
			: [])
	];
};

const keepsLabeledTonality = (
	decision: KeyDecision,
	snapshot: SongKeySnapshot
): boolean => {
	const { key, transpose } = decisionOutcome(decision);
	return (
		sameKey(key, snapshot.labeledKey) &&
		decision.scale === snapshot.labeledScale &&
		transpose === 0
	);
};

export const normalizeDecisionForApply = (
	decision: KeyDecision,
	snapshot: SongKeySnapshot
): KeyDecision => {
	if (
		decision.verdict === VERDICTS.confirmed &&
		!keepsLabeledTonality(decision, snapshot)
	) {
		return { ...decision, verdict: VERDICTS.corrected };
	}
	return decision;
};

const decisionErrors = (
	decision: KeyDecision,
	snapshot: SongKeySnapshot | undefined,
	commonModes: string[]
): string[] => {
	if (!snapshot) return ["unknown songKey"];
	const formatErrors = [
		...(Object.values(VERDICTS).includes(decision.verdict)
			? []
			: [`verdict must be one of ${Object.values(VERDICTS).join(", ")}`]),
		...noteErrors(decision),
		...(SCALE_INTERVALS[decision.scale]
			? []
			: [`scale "${decision.scale}" is unknown`]),
		...(commonModes.includes(decision.scale) || decision.note?.trim()
			? []
			: [`scale "${decision.scale}" is not a common mode; justify it in note`]),
		...((CONFIDENCE_LEVELS as readonly string[]).includes(decision.confidence)
			? []
			: [`confidence must be one of ${CONFIDENCE_LEVELS.join(", ")}`])
	];
	return formatErrors.length ? formatErrors : outcomeErrors(decision, snapshot);
};

export const validateDecision = (
	decision: KeyDecision,
	snapshots: Map<string, SongKeySnapshot>,
	commonModes: string[]
): string[] =>
	decisionErrors(decision, snapshots.get(decision.songKey), commonModes);

export const sameReviewOutcome = (a: LedgerRow, b: LedgerRow): boolean =>
	a.method === b.method &&
	a.verdict === b.verdict &&
	sameKey(a.key, b.key) &&
	a.scale === b.scale &&
	a.transpose === b.transpose;

export const decisionToLedgerRow = (
	decision: KeyDecision,
	snapshot: SongKeySnapshot,
	flagReasons: string,
	reviewedAt: string
): LedgerRow => {
	const { key, transpose } = decisionOutcome(decision);
	return {
		...snapshotToLedgerFields(snapshot),
		verdict: decision.verdict,
		key: canonicalNoteName(key),
		scale: decision.scale,
		transpose,
		method: REVIEW_METHODS.agent,
		confidence: decision.confidence,
		flagReasons,
		reviewedAt,
		note: decision.note?.trim() ?? ""
	};
};
