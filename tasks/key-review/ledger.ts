import fs from "fs";
import { csvFormat, csvParse } from "d3";
import { toPitchClass } from "./pitchClasses.js";

export const VERDICTS = {
	confirmed: "confirmed",
	corrected: "corrected"
} as const;
export const REVIEW_METHODS = { auto: "auto", agent: "agent" } as const;
export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

export type Verdict = (typeof VERDICTS)[keyof typeof VERDICTS];
export type ReviewMethod = (typeof REVIEW_METHODS)[keyof typeof REVIEW_METHODS];
export type Confidence = (typeof CONFIDENCE_LEVELS)[number] | "";

export type SongKeySnapshot = {
	songKey: string;
	labeledKey: string;
	labeledScale: string;
	labeledCapo: number;
	source: string;
	url: string;
	title: string;
	artist: string;
};

export type LedgerRow = {
	songKey: string;
	labeledKey: string;
	labeledScale: string;
	labeledCapo: number;
	verdict: Verdict;
	key: string;
	scale: string;
	transpose: number;
	method: ReviewMethod;
	confidence: Confidence;
	flagReasons: string;
	reviewedAt: string;
	note: string;
};

export type Ledger = Map<string, LedgerRow>;

const LEDGER_COLUMNS: (keyof LedgerRow)[] = [
	"songKey",
	"labeledKey",
	"labeledScale",
	"labeledCapo",
	"verdict",
	"key",
	"scale",
	"transpose",
	"method",
	"confidence",
	"flagReasons",
	"reviewedAt",
	"note"
];

const parseLedgerRow = (
	row: Record<string, string | undefined>
): LedgerRow => ({
	songKey: row.songKey ?? "",
	labeledKey: row.labeledKey ?? "",
	labeledScale: row.labeledScale ?? "",
	labeledCapo: Number(row.labeledCapo ?? 0),
	verdict: (row.verdict ?? VERDICTS.confirmed) as Verdict,
	key: row.key ?? "",
	scale: row.scale ?? "",
	transpose: Number(row.transpose ?? 0),
	method: (row.method ?? REVIEW_METHODS.auto) as ReviewMethod,
	confidence: (row.confidence ?? "") as Confidence,
	flagReasons: row.flagReasons ?? "",
	reviewedAt: row.reviewedAt ?? "",
	note: row.note ?? ""
});

export const readLedger = (ledgerPath: string): Ledger => {
	if (!fs.existsSync(ledgerPath)) return new Map();
	return new Map(
		csvParse(fs.readFileSync(ledgerPath, "utf-8"))
			.map(parseLedgerRow)
			.map((row) => [row.songKey, row] as const)
	);
};

export const writeLedger = (ledgerPath: string, ledger: Ledger): void => {
	const rows = [...ledger.values()].sort((a, b) =>
		a.songKey.localeCompare(b.songKey)
	);
	fs.writeFileSync(
		ledgerPath,
		`${csvFormat(
			rows.map((row) => ({ ...row })),
			LEDGER_COLUMNS
		)}\n`
	);
};

export const isLedgerRowFresh = (
	row: LedgerRow,
	snapshot: SongKeySnapshot
): boolean =>
	toPitchClass(row.labeledKey) === toPitchClass(snapshot.labeledKey) &&
	row.labeledScale === snapshot.labeledScale &&
	row.labeledCapo === snapshot.labeledCapo;

export const ledgerRowChangesSong = (row: LedgerRow): boolean =>
	row.verdict === VERDICTS.corrected &&
	(row.transpose !== 0 ||
		row.scale !== row.labeledScale ||
		toPitchClass(row.key) !== toPitchClass(row.labeledKey));

export const snapshotToLedgerFields = (snapshot: SongKeySnapshot) => ({
	songKey: snapshot.songKey,
	labeledKey: snapshot.labeledKey,
	labeledScale: snapshot.labeledScale,
	labeledCapo: snapshot.labeledCapo
});
