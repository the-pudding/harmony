import { pitchClass } from "../../src/chord-processing/chord-classifier/notes.js";
import { keyTonalityIssues } from "../../src/data/hand-reviewed-songs.js";
import type { SongCoverageEntry } from "../../src/routes/demo/define-chord-progression/compute-coverage-of-all-songs/computeSongCoverage.js";
import {
	REVIEW_METHODS,
	VERDICTS,
	isLedgerRowFresh,
	ledgerRowChangesSong,
	type Ledger,
	type LedgerRow,
	type SongKeySnapshot
} from "./ledger.js";
import { toPitchClass } from "./pitchClasses.js";

const INTERVAL_NAMES = [
	"same tonic",
	"tonic up a half step",
	"tonic up a 2nd",
	"tonic up a minor 3rd",
	"tonic up a major 3rd",
	"tonic up a 4th",
	"tonic up a tritone",
	"tonic up a 5th",
	"tonic up a minor 6th",
	"tonic up a major 6th",
	"tonic up a minor 7th",
	"tonic up a major 7th"
];
const EXAMPLES_PER_FIX = 3;
const TOP_FIX_TYPES = 15;
const TOP_PROGRESSION_CHANGES = 15;
const PERCENT = 100;
const REASON_SEPARATOR = "+";

export type ReportInput = {
	generatedAt: string;
	ledger: Ledger;
	snapshots: Map<string, SongKeySnapshot>;
	pendingCount: number;
	flaggedPendingCount: number;
	changedSectionCount: number;
	totalSectionCount: number;
	coverageBefore: SongCoverageEntry[];
	coverageAfter: SongCoverageEntry[];
};

type ReviewedSong = { row: LedgerRow; snapshot: SongKeySnapshot };

const percent = (count: number, total: number): string =>
	total === 0 ? "0%" : `${((count / total) * PERCENT).toFixed(1)}%`;

const countBy = <T>(items: T[], keyOf: (item: T) => string): [string, T[]][] =>
	[
		...items.reduce(
			(groups, item) =>
				groups.set(keyOf(item), [...(groups.get(keyOf(item)) ?? []), item]),
			new Map<string, T[]>()
		)
	].sort((a, b) => b[1].length - a[1].length);

const table = (header: string[], rows: (string | number)[][]): string =>
	[
		`| ${header.join(" | ")} |`,
		`| ${header.map(() => "---").join(" | ")} |`,
		...rows.map((row) => `| ${row.join(" | ")} |`)
	].join("\n");

const songLabel = ({ snapshot }: ReviewedSong): string =>
	`${snapshot.title} (${snapshot.artist})`;

const tonalityLabel = (key: string, scale: string): string => `${key} ${scale}`;

const signed = (value: number): string =>
	value > 0 ? `+${value}` : `${value}`;

const fixType = ({ row }: ReviewedSong): string => {
	const soundingShift = pitchClass(
		toPitchClass(row.key) - row.transpose - toPitchClass(row.labeledKey)
	);
	const relabel =
		row.scale === row.labeledScale && soundingShift === 0
			? null
			: `${row.labeledScale} → ${row.scale}, ${INTERVAL_NAMES[soundingShift]}`;
	const transposition =
		row.transpose === 0
			? null
			: `undo shift (${signed(row.transpose)} semitones)`;
	return [relabel, transposition].filter(Boolean).join("; ");
};

const reviewedSongs = (input: ReportInput): ReviewedSong[] =>
	[...input.ledger.values()].flatMap((row) => {
		const snapshot = input.snapshots.get(row.songKey);
		return snapshot && isLedgerRowFresh(row, snapshot)
			? [{ row, snapshot }]
			: [];
	});

const headlineSection = (input: ReportInput, songs: ReviewedSong[]): string => {
	const agent = songs.filter(({ row }) => row.method === REVIEW_METHODS.agent);
	const corrected = songs.filter(({ row }) => ledgerRowChangesSong(row));
	const transposed = corrected.filter(({ row }) => row.transpose !== 0);
	const total = input.snapshots.size;
	const sources = countBy(songs, ({ snapshot }) => snapshot.source);

	return [
		"## Headline numbers",
		"",
		table(
			["", "Songs", "Share of dataset"],
			[
				["Songs in the main dataset", total, "100%"],
				["Reviewed", songs.length, percent(songs.length, total)],
				[
					"Auto-confirmed (detector found nothing suspicious)",
					songs.length - agent.length,
					percent(songs.length - agent.length, total)
				],
				[
					"Flagged and hand-reviewed",
					agent.length,
					percent(agent.length, total)
				],
				["Corrected", corrected.length, percent(corrected.length, total)],
				[
					"Corrected with a transposition fix",
					transposed.length,
					percent(transposed.length, total)
				],
				[
					"Still unreviewed or stale",
					input.pendingCount,
					percent(input.pendingCount, total)
				]
			]
		),
		"",
		table(
			["Source", "Reviewed", "Hand-reviewed", "Corrected", "Corrected share"],
			sources.map(([source, group]) => {
				const groupCorrected = group.filter(({ row }) =>
					ledgerRowChangesSong(row)
				).length;
				return [
					source,
					group.length,
					group.filter(({ row }) => row.method === REVIEW_METHODS.agent).length,
					groupCorrected,
					percent(groupCorrected, group.length)
				];
			})
		),
		"",
		`${input.changedSectionCount.toLocaleString()} of ${input.totalSectionCount.toLocaleString()} sections (${percent(input.changedSectionCount, input.totalSectionCount)}) now have different Roman numerals or pitches.`
	].join("\n");
};

const fixesSection = (songs: ReviewedSong[]): string => {
	const corrected = songs.filter(({ row }) => ledgerRowChangesSong(row));
	const fixTypes = countBy(corrected, fixType).slice(0, TOP_FIX_TYPES);
	return [
		"## Most common fixes",
		"",
		"Each fix type is the labeled mode → the corrected mode, plus how far the tonic moved (in sounding pitch).",
		"",
		table(
			["Fix", "Songs", "Share of corrections", "Examples"],
			fixTypes.map(([type, group]) => [
				type,
				group.length,
				percent(group.length, corrected.length),
				group
					.slice(0, EXAMPLES_PER_FIX)
					.map(
						(song) =>
							`${songLabel(song)}: ${tonalityLabel(song.row.labeledKey, song.row.labeledScale)} → ${tonalityLabel(song.row.key, song.row.scale)}`
					)
					.join("; ")
			])
		)
	].join("\n");
};

const modeDistributionSection = (songs: ReviewedSong[]): string => {
	const before = countBy(songs, ({ row }) => row.labeledScale);
	const afterCounts = new Map(
		countBy(songs, ({ row }) => row.scale).map(
			([scale, group]) => [scale, group.length] as const
		)
	);
	const scales = [
		...new Set([...before.map(([scale]) => scale), ...afterCounts.keys()])
	];
	const beforeCounts = new Map(
		before.map(([scale, group]) => [scale, group.length] as const)
	);
	return [
		"## Mode distribution before and after",
		"",
		table(
			["Mode", "Before", "After", "Change"],
			scales
				.map((scale) => ({
					scale,
					before: beforeCounts.get(scale) ?? 0,
					after: afterCounts.get(scale) ?? 0
				}))
				.sort((a, b) => b.after - a.after)
				.map(({ scale, before: was, after: now }) => [
					scale,
					was,
					now,
					signed(now - was)
				])
		)
	].join("\n");
};

const detectorSection = (songs: ReviewedSong[]): string => {
	const agent = songs.filter(({ row }) => row.method === REVIEW_METHODS.agent);
	const byReason = countBy(
		agent.flatMap((song) =>
			song.row.flagReasons
				.split(REASON_SEPARATOR)
				.filter(Boolean)
				.map((reason) => ({ reason, song }))
		),
		({ reason }) => reason
	);
	const byConfidence = countBy(agent, ({ row }) => row.confidence || "unset");
	return [
		"## Detector quality",
		"",
		"How often reviewers changed a flagged song, by the reason it was flagged (a song can have several reasons).",
		"",
		table(
			[
				"Flag reason",
				"Flagged",
				"Confirmed as labeled",
				"Corrected",
				"Precision"
			],
			byReason.map(([reason, group]) => {
				const correctedCount = group.filter(({ song }) =>
					ledgerRowChangesSong(song.row)
				).length;
				return [
					reason,
					group.length,
					group.length - correctedCount,
					correctedCount,
					percent(correctedCount, group.length)
				];
			})
		),
		"",
		table(
			["Reviewer confidence", "Songs"],
			byConfidence.map(([confidence, group]) => [confidence, group.length])
		)
	].join("\n");
};

const progressionCounts = (
	coverages: SongCoverageEntry[]
): Map<string, number> =>
	coverages.reduce(
		(counts, entry) =>
			entry.matchingProgressions.reduce(
				(inner, name) => inner.set(name, (inner.get(name) ?? 0) + 1),
				counts
			),
		new Map<string, number>()
	);

const mainProgression = (entry: SongCoverageEntry | undefined): string =>
	[...(entry?.progressionCounts ?? [])]
		.filter((count) => count.isCore)
		.sort((a, b) => b.coveragePercent - a.coveragePercent)[0]?.name ?? "none";

const impactSection = (input: ReportInput): string => {
	const before = progressionCounts(input.coverageBefore);
	const after = progressionCounts(input.coverageAfter);
	const names = [...new Set([...before.keys(), ...after.keys()])];
	const deltas = names
		.map((name) => ({
			name,
			before: before.get(name) ?? 0,
			after: after.get(name) ?? 0
		}))
		.filter(({ before: was, after: now }) => was !== now)
		.sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before))
		.slice(0, TOP_PROGRESSION_CHANGES);
	const afterByKey = new Map(
		input.coverageAfter.map((entry) => [entry.songKey, entry] as const)
	);
	const mainChanged = input.coverageBefore.filter(
		(entry) =>
			mainProgression(entry) !== mainProgression(afterByKey.get(entry.songKey))
	).length;

	return [
		"## Downstream impact on progression matching",
		"",
		`Across the ${input.coverageBefore.length.toLocaleString()} corrected songs, ${mainChanged.toLocaleString()} (${percent(mainChanged, input.coverageBefore.length)}) now have a different main core progression.`,
		"",
		"Core progressions whose matched-song counts changed the most (corrected songs only):",
		"",
		table(
			["Core progression", "Songs before", "Songs after", "Change"],
			deltas.map(({ name, before: was, after: now }) => [
				name,
				was,
				now,
				signed(now - was)
			])
		)
	].join("\n");
};

const humanReviewSection = (): string => {
	const tonalityRows = keyTonalityIssues.map(
		({ id, keyTonalityIssues: note }) => [`\`${id}\``, note.replace(/\|/g, "/")]
	);
	return [
		"## Human review (David)",
		"",
		"**David** reviewed every song that the detector flagged for key review (agent-assisted queue batches, human sign-off on decisions merged into `data/key-review.csv`). Auto-confirmed songs were accepted without a separate pass. The ledger now covers the full main dataset (7,260 songs); nothing remains in the review queue.",
		"",
		"Remaining **key / scrape / matching** concerns are recorded in `harmony/src/data/hand-reviewed-songs.ts` (`problematicSongs`, `trickySongsToMatchCorrectly`, and `keyTonalityIssues`). **All other songs — including every hand-reviewed key verdict not listed there — were deemed fine** for build output (`songs.json`) and the app.",
		"",
		"### `keyTonalityIssues` (modulation / multi-center — not fixable with one song-level key)",
		"",
		table(["Song", "Note"], tonalityRows)
	].join("\n");
};

const openItemsSection = (
	input: ReportInput,
	songs: ReviewedSong[]
): string => {
	const lowConfidence = songs.filter(
		({ row }) => row.method === REVIEW_METHODS.agent && row.confidence === "low"
	);
	return [
		"## Open items",
		"",
		`- ${input.flaggedPendingCount.toLocaleString()} unreviewed songs are currently flagged (run \`npm run keys:flag\` in harmony and review the queue).`,
		`- ${lowConfidence.length.toLocaleString()} reviewed songs were marked low confidence:`,
		"",
		table(
			["Song", "Labeled", "Decision", "Note"],
			lowConfidence.map((song) => [
				`\`${song.row.songKey}\``,
				tonalityLabel(song.row.labeledKey, song.row.labeledScale),
				song.row.verdict === VERDICTS.confirmed
					? "kept"
					: `${tonalityLabel(song.row.key, song.row.scale)}${song.row.transpose ? ` (transpose ${signed(song.row.transpose)})` : ""}`,
				song.row.note.replace(/\|/g, "/")
			])
		),
		"",
		"These rows kept `confidence: low` as a ledger reminder; they were still accepted unless listed in `hand-reviewed-songs.ts` above. Runtime chord fixes also live in `hand-corrected-songs.ts` where noted in the follow-up section."
	].join("\n");
};

const handFollowUpSection = (): string =>
	[
		"## Hand follow-up (after automated review)",
		"",
		"Automated review writes **one ledger row per song**. Both UG and HookTheory JSON already carry **per-section** `key` and `scale`; the pipeline labels each song from whichever section tonality covers the most chords, then applies a single rekey. Sections that already had a different key keep that label and only follow transpose — modulations are not fully modeled.",
		"",
		"The Harmony app loads `songs.json` and then applies **`hand-corrected-songs.ts`** (per-section keys and Romans) and documents scrape/key limits in **`harmony/src/data/hand-reviewed-songs.ts`** (`keyTonalityIssues`, 🎹 in the song browser). Those runtime layers supersede the ledger where both exist.",
		"",
		table(
			["Song", "Ledger / build", "Runtime override or note"],
			[
				[
					"`drake__in-my-feelings`",
					"C# minor (low confidence)",
					"Hand-corrected: **Ab major**, IV–iii (`hand-corrected-songs.ts`)"
				],
				[
					"`the-blackbyrds__walking-in-rhythm`",
					"C# minor (bad scrape interlude)",
					"Hand-corrected: **Bb major** I–ii + vi–V–IV–V"
				],
				[
					"Other low-confidence rows below",
					"Best song-level guess",
					"See `keyTonalityIssues` for the five modulation / multi-center cases (El DeBarge, Jan & Dean, Sergio Mendes, Diamonds, Honeydrippers)"
				]
			]
		),
		"",
		"`keys:apply` dedupes decision files by `songKey` (newest batch wins) and skips statistical misfit hold-back for timestamped queue decision files (`batch-YYYYMMDD-HHMM-NNN.json`), so expert re-review batches can land in the ledger."
	].join("\n");

export const buildKeyReviewReport = (input: ReportInput): string => {
	const songs = reviewedSongs(input);
	return [
		"# Song key review report",
		"",
		`Generated ${input.generatedAt} by \`npm run keys:report\` in harmony from \`data/key-review.csv\`. Regenerate it after each review round.`,
		"",
		"Every song in the main dataset (`songs/corrected/`) is scored against all 12 tonics × the common modes in the data. The model is trained on HookTheory and hand-reviewed songs. Songs whose labeled key fits clearly worse than another key, that use a rare mode, that have many out-of-key chords, or that carry a suspicious capo shift are flagged and hand-reviewed. `harmony/tasks/build-songs.js` applies every verdict when it builds `songs.json`. See **Human review (David)** below for sign-off and what still lives in `hand-reviewed-songs.ts`.",
		"",
		humanReviewSection(),
		"",
		headlineSection(input, songs),
		"",
		fixesSection(songs),
		"",
		modeDistributionSection(songs),
		"",
		detectorSection(songs),
		"",
		impactSection(input),
		"",
		openItemsSection(input, songs),
		"",
		handFollowUpSection(),
		""
	].join("\n");
};
