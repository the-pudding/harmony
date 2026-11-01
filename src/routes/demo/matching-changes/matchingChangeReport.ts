import { PERCENT_MULTIPLIER } from "../match-algo-v2/match-algo-v2-logic/algoMetrics.js";

export type SnapshotSong = {
	songKey: string;
	title: string;
	artists: string[];
	explainedPercent: number;
	coreCoverage: Record<string, number>;
	dominantProgression?: string;
	hasCrossScaleCoreMatch: boolean;
};

export type SnapshotCluster = { name: string; songKeys: string[] };

export type MatchingSnapshot = {
	songs: SnapshotSong[];
	clusters: SnapshotCluster[];
};

export type SongChangeExample = {
	songKey: string;
	title: string;
	artists: string[];
	beforePercent: number;
	afterPercent: number;
	dominantBefore?: string;
	dominantAfter?: string;
};

export type ChangedRow = {
	name: string;
	before: number;
	after: number;
	examples: SongChangeExample[];
};

export type HeadlineMetric = {
	label: string;
	before: number;
	after: number;
	unit: "count" | "percent";
};

export type MatchingChangeReport = {
	headline: HeadlineMetric[];
	cores: ChangedRow[];
	clusters: ChangedRow[];
};

export const TOP_CHANGED_ROWS = 12;
export const EXAMPLES_PER_ROW = 5;

const NO_COVERAGE = 0;

const mean = (values: readonly number[]): number =>
	values.length === 0
		? 0
		: values.reduce((sum, value) => sum + value, 0) / values.length;

const coreNamesOf = (song: SnapshotSong): string[] =>
	Object.keys(song.coreCoverage);

const coreCoverageOf = (song: SnapshotSong | undefined, core: string) =>
	song?.coreCoverage[core] ?? NO_COVERAGE;

export const songChangeMagnitude = (
	before: SnapshotSong | undefined,
	after: SnapshotSong | undefined
): number => {
	const cores = new Set([
		...(before ? coreNamesOf(before) : []),
		...(after ? coreNamesOf(after) : [])
	]);
	return [...cores].reduce(
		(sum, core) =>
			sum +
			Math.abs(coreCoverageOf(after, core) - coreCoverageOf(before, core)),
		0
	);
};

export const percentChange = (before: number, after: number): number | null =>
	before === 0 ? null : ((after - before) / before) * PERCENT_MULTIPLIER;

const songsByKey = (snapshot: MatchingSnapshot) =>
	new Map(snapshot.songs.map((song) => [song.songKey, song]));

const buildHeadline = (
	before: MatchingSnapshot,
	after: MatchingSnapshot
): HeadlineMetric[] => {
	const metric = (
		label: string,
		unit: HeadlineMetric["unit"],
		measure: (snapshot: MatchingSnapshot) => number
	): HeadlineMetric => ({
		label,
		unit,
		before: measure(before),
		after: measure(after)
	});
	return [
		metric("Mean explained coverage", "percent", (s) =>
			mean(s.songs.map((song) => song.explainedPercent))
		),
		metric(
			"Songs matching a core",
			"count",
			(s) => s.songs.filter((song) => coreNamesOf(song).length > 0).length
		),
		metric("Hex-map clusters", "count", (s) => s.clusters.length),
		metric("Songs in a cluster", "count", (s) =>
			s.clusters.reduce((sum, cluster) => sum + cluster.songKeys.length, 0)
		),
		metric(
			"Songs matching a core in another scale",
			"count",
			(s) => s.songs.filter((song) => song.hasCrossScaleCoreMatch).length
		)
	];
};

const toExample = (
	before: SnapshotSong | undefined,
	after: SnapshotSong | undefined,
	core: string | null
): SongChangeExample => {
	const song = (after ?? before)!;
	return {
		songKey: song.songKey,
		title: song.title,
		artists: song.artists,
		beforePercent: core
			? coreCoverageOf(before, core)
			: (before?.explainedPercent ?? 0),
		afterPercent: core
			? coreCoverageOf(after, core)
			: (after?.explainedPercent ?? 0),
		dominantBefore: before?.dominantProgression,
		dominantAfter: after?.dominantProgression
	};
};

const largestFirst = <T>(items: readonly T[], size: (item: T) => number): T[] =>
	[...items].sort((a, b) => size(b) - size(a));

const topChangedRows = (rows: readonly ChangedRow[]): ChangedRow[] =>
	largestFirst(rows, (row) => Math.abs(row.after - row.before))
		.filter((row) => row.after !== row.before)
		.slice(0, TOP_CHANGED_ROWS);

const buildCoreRows = (
	before: MatchingSnapshot,
	after: MatchingSnapshot
): ChangedRow[] => {
	const beforeByKey = songsByKey(before);
	const afterByKey = songsByKey(after);
	const songKeys = [...new Set([...beforeByKey.keys(), ...afterByKey.keys()])];
	const cores = [
		...new Set([...before.songs, ...after.songs].flatMap(coreNamesOf))
	];
	const songCountWithCore = (byKey: Map<string, SnapshotSong>, core: string) =>
		[...byKey.values()].filter((song) => core in song.coreCoverage).length;
	const coreChange = (songKey: string, core: string) =>
		Math.abs(
			coreCoverageOf(afterByKey.get(songKey), core) -
				coreCoverageOf(beforeByKey.get(songKey), core)
		);

	return topChangedRows(
		cores.map((core) => ({
			name: core,
			before: songCountWithCore(beforeByKey, core),
			after: songCountWithCore(afterByKey, core),
			examples: largestFirst(
				songKeys.filter((songKey) => coreChange(songKey, core) > 0),
				(songKey) => coreChange(songKey, core)
			)
				.slice(0, EXAMPLES_PER_ROW)
				.map((songKey) =>
					toExample(beforeByKey.get(songKey), afterByKey.get(songKey), core)
				)
		}))
	);
};

const buildClusterRows = (
	before: MatchingSnapshot,
	after: MatchingSnapshot
): ChangedRow[] => {
	const beforeByKey = songsByKey(before);
	const afterByKey = songsByKey(after);
	const membersByName = (snapshot: MatchingSnapshot) =>
		snapshot.clusters.reduce(
			(byName, cluster) =>
				new Map(byName).set(
					cluster.name,
					new Set([...(byName.get(cluster.name) ?? []), ...cluster.songKeys])
				),
			new Map<string, Set<string>>()
		);
	const beforeMembers = membersByName(before);
	const afterMembers = membersByName(after);
	const names = [...new Set([...beforeMembers.keys(), ...afterMembers.keys()])];
	const changeOf = (songKey: string) =>
		songChangeMagnitude(beforeByKey.get(songKey), afterByKey.get(songKey));

	return topChangedRows(
		names.map((name) => {
			const was = beforeMembers.get(name) ?? new Set<string>();
			const now = afterMembers.get(name) ?? new Set<string>();
			const movedSongKeys = [
				...[...was].filter((songKey) => !now.has(songKey)),
				...[...now].filter((songKey) => !was.has(songKey))
			];
			return {
				name,
				before: was.size,
				after: now.size,
				examples: largestFirst(movedSongKeys, changeOf)
					.slice(0, EXAMPLES_PER_ROW)
					.map((songKey) =>
						toExample(beforeByKey.get(songKey), afterByKey.get(songKey), null)
					)
			};
		})
	);
};

export const buildMatchingChangeReport = (
	before: MatchingSnapshot,
	after: MatchingSnapshot
): MatchingChangeReport => ({
	headline: buildHeadline(before, after),
	cores: buildCoreRows(before, after),
	clusters: buildClusterRows(before, after)
});
