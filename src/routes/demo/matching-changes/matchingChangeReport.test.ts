import { describe, expect, it } from "vitest";
import {
	buildMatchingChangeReport,
	EXAMPLES_PER_ROW,
	percentChange,
	songChangeMagnitude,
	type MatchingSnapshot,
	type SnapshotSong
} from "./matchingChangeReport.js";

const PERCENT_BASE = 10;
const PERCENT_INCREASED = 15;
const PERCENT_DECREASED = 5;
const EXPECTED_INCREASE_PERCENT = 50;
const EXPECTED_DECREASE_PERCENT = -50;

const CORE_ALPHA = "alpha";
const CORE_BETA = "beta";
const CORE_GAMMA = "gamma";
const CORE_ZETA = "zeta";

const COVERAGE_TEN = 10;
const COVERAGE_FIFTEEN = 15;
const COVERAGE_TWENTY = 20;
const COVERAGE_THIRTY = 30;
const COVERAGE_FIVE = 5;
const COVERAGE_TWENTY_FIVE = 25;

const EXPLAINED_FORTY = 40;
const EXPLAINED_FIFTY = 50;
const EXPLAINED_SIXTY = 60;
const EXPLAINED_EIGHTY = 80;

const SONG_KEY_ONE = "song-one";
const SONG_KEY_TWO = "song-two";
const SONG_KEY_THREE = "song-three";
const SONG_KEY_FOUR = "song-four";

const CLUSTER_SHARED = "shared-cluster";
const CLUSTER_BEFORE_ONLY = "before-only-cluster";
const CLUSTER_AFTER_ONLY = "after-only-cluster";
const CLUSTER_MERGE_TEST = "merge-test-cluster";

const makeSong = (
	songKey: string,
	explainedPercent: number,
	coreCoverage: Record<string, number>,
	options: {
		title?: string;
		artists?: string[];
		crossScale?: boolean;
		dominantProgression?: string;
	} = {}
): SnapshotSong => ({
	songKey,
	title: options.title ?? songKey,
	artists: options.artists ?? ["Test Artist"],
	explainedPercent,
	coreCoverage,
	hasCrossScaleCoreMatch: options.crossScale ?? false,
	...(options.dominantProgression
		? { dominantProgression: options.dominantProgression }
		: {})
});

const meanExplained = (songs: SnapshotSong[]): number =>
	songs.length === 0
		? 0
		: songs.reduce((sum, song) => sum + song.explainedPercent, 0) /
			songs.length;

const songsMatchingCore = (snapshot: MatchingSnapshot): number =>
	snapshot.songs.filter((song) => Object.keys(song.coreCoverage).length > 0)
		.length;

const songsInClusters = (snapshot: MatchingSnapshot): number =>
	snapshot.clusters.reduce((sum, cluster) => sum + cluster.songKeys.length, 0);

const crossScaleCount = (snapshot: MatchingSnapshot): number =>
	snapshot.songs.filter((song) => song.hasCrossScaleCoreMatch).length;

describe("percentChange", () => {
	it("returns null when before is zero", () => {
		expect(percentChange(0, COVERAGE_TEN)).toBeNull();
	});

	it("returns positive percent for an increase", () => {
		expect(percentChange(PERCENT_BASE, PERCENT_INCREASED)).toBe(
			EXPECTED_INCREASE_PERCENT
		);
	});

	it("returns negative percent for a decrease", () => {
		expect(percentChange(PERCENT_BASE, PERCENT_DECREASED)).toBe(
			EXPECTED_DECREASE_PERCENT
		);
	});
});

describe("songChangeMagnitude", () => {
	it("sums absolute per-core coverage differences across the union of cores", () => {
		const before = makeSong(SONG_KEY_ONE, EXPLAINED_FORTY, {
			[CORE_ALPHA]: COVERAGE_TEN,
			[CORE_BETA]: COVERAGE_FIVE
		});
		const after = makeSong(SONG_KEY_ONE, EXPLAINED_FORTY, {
			[CORE_ALPHA]: COVERAGE_FIFTEEN,
			[CORE_BETA]: COVERAGE_FIVE - 2
		});
		expect(songChangeMagnitude(before, after)).toBe(COVERAGE_FIVE + 2);
	});

	it("treats missing before song as zero coverage on all after cores", () => {
		const after = makeSong(SONG_KEY_ONE, EXPLAINED_FORTY, {
			[CORE_ALPHA]: COVERAGE_TWENTY
		});
		expect(songChangeMagnitude(undefined, after)).toBe(COVERAGE_TWENTY);
	});

	it("treats missing after song as zero coverage on all before cores", () => {
		const before = makeSong(SONG_KEY_ONE, EXPLAINED_FORTY, {
			[CORE_BETA]: COVERAGE_THIRTY
		});
		expect(songChangeMagnitude(before, undefined)).toBe(COVERAGE_THIRTY);
	});
});

describe("buildMatchingChangeReport", () => {
	const songOneBefore = makeSong(
		SONG_KEY_ONE,
		EXPLAINED_FORTY,
		{ [CORE_ALPHA]: COVERAGE_TEN },
		{ dominantProgression: "I-V-vi-IV" }
	);
	const songTwoBefore = makeSong(
		SONG_KEY_TWO,
		EXPLAINED_SIXTY,
		{
			[CORE_ALPHA]: COVERAGE_TWENTY,
			[CORE_BETA]: COVERAGE_FIVE
		},
		{ crossScale: true, dominantProgression: "I-IV-V" }
	);
	const songThreeBefore = makeSong(SONG_KEY_THREE, EXPLAINED_EIGHTY, {
		[CORE_BETA]: COVERAGE_THIRTY
	});

	const songOneAfter = makeSong(
		SONG_KEY_ONE,
		EXPLAINED_FORTY,
		{ [CORE_ALPHA]: COVERAGE_FIFTEEN },
		{ dominantProgression: "I-V-vi-IV" }
	);
	const songTwoAfter = makeSong(
		SONG_KEY_TWO,
		EXPLAINED_SIXTY,
		{
			[CORE_ALPHA]: COVERAGE_TEN
		},
		{ crossScale: true, dominantProgression: "ii-V-I" }
	);
	const songThreeAfter = makeSong(SONG_KEY_THREE, EXPLAINED_EIGHTY, {
		[CORE_BETA]: COVERAGE_THIRTY
	});
	const songFourAfter = makeSong(SONG_KEY_FOUR, EXPLAINED_FIFTY, {
		[CORE_GAMMA]: COVERAGE_TWENTY_FIVE
	});

	const beforeSnapshot: MatchingSnapshot = {
		songs: [songOneBefore, songTwoBefore, songThreeBefore],
		clusters: [
			{ name: CLUSTER_SHARED, songKeys: [SONG_KEY_ONE, SONG_KEY_TWO] },
			{
				name: CLUSTER_BEFORE_ONLY,
				songKeys: [SONG_KEY_TWO, SONG_KEY_THREE]
			}
		]
	};

	const afterSnapshot: MatchingSnapshot = {
		songs: [songOneAfter, songTwoAfter, songThreeAfter, songFourAfter],
		clusters: [
			{ name: CLUSTER_SHARED, songKeys: [SONG_KEY_ONE, SONG_KEY_THREE] },
			{ name: CLUSTER_AFTER_ONLY, songKeys: [SONG_KEY_FOUR] }
		]
	};

	const report = buildMatchingChangeReport(beforeSnapshot, afterSnapshot);

	it("builds headline metrics with correct before and after values", () => {
		const headlineByLabel = Object.fromEntries(
			report.headline.map((metric) => [metric.label, metric])
		);

		expect(headlineByLabel["Mean explained coverage"]).toEqual({
			label: "Mean explained coverage",
			unit: "percent",
			before: meanExplained(beforeSnapshot.songs),
			after: meanExplained(afterSnapshot.songs)
		});
		expect(headlineByLabel["Songs matching a core"]).toEqual({
			label: "Songs matching a core",
			unit: "count",
			before: songsMatchingCore(beforeSnapshot),
			after: songsMatchingCore(afterSnapshot)
		});
		expect(headlineByLabel["Hex-map clusters"]).toEqual({
			label: "Hex-map clusters",
			unit: "count",
			before: beforeSnapshot.clusters.length,
			after: afterSnapshot.clusters.length
		});
		expect(headlineByLabel["Songs in a cluster"]).toEqual({
			label: "Songs in a cluster",
			unit: "count",
			before: songsInClusters(beforeSnapshot),
			after: songsInClusters(afterSnapshot)
		});
		expect(headlineByLabel["Songs matching a core in another scale"]).toEqual({
			label: "Songs matching a core in another scale",
			unit: "count",
			before: crossScaleCount(beforeSnapshot),
			after: crossScaleCount(afterSnapshot)
		});
	});

	it("builds core rows with song counts, change-only filter, sort, and examples", () => {
		expect(report.cores.map((row) => row.name)).toEqual([
			CORE_BETA,
			CORE_GAMMA
		]);
		expect(report.cores.every((row) => row.before !== row.after)).toBe(true);

		const betaRow = report.cores.find((row) => row.name === CORE_BETA);
		expect(betaRow).toEqual({
			name: CORE_BETA,
			before: 2,
			after: 1,
			examples: [
				{
					songKey: SONG_KEY_TWO,
					title: SONG_KEY_TWO,
					artists: ["Test Artist"],
					beforePercent: COVERAGE_FIVE,
					afterPercent: 0,
					dominantBefore: "I-IV-V",
					dominantAfter: "ii-V-I"
				}
			]
		});

		const gammaRow = report.cores.find((row) => row.name === CORE_GAMMA);
		expect(gammaRow?.before).toBe(0);
		expect(gammaRow?.after).toBe(1);
		expect(gammaRow?.examples).toEqual([
			{
				songKey: SONG_KEY_FOUR,
				title: SONG_KEY_FOUR,
				artists: ["Test Artist"],
				beforePercent: 0,
				afterPercent: COVERAGE_TWENTY_FIVE,
				dominantBefore: undefined,
				dominantAfter: undefined
			}
		]);
	});

	it("merges clusters with the same name and uses zero for missing side counts", () => {
		const mergeBefore: MatchingSnapshot = {
			songs: beforeSnapshot.songs,
			clusters: [
				{ name: CLUSTER_MERGE_TEST, songKeys: [SONG_KEY_ONE] },
				{ name: CLUSTER_MERGE_TEST, songKeys: [SONG_KEY_TWO] }
			]
		};
		const mergeAfter: MatchingSnapshot = {
			songs: beforeSnapshot.songs,
			clusters: [{ name: CLUSTER_MERGE_TEST, songKeys: [SONG_KEY_ONE] }]
		};
		const mergedReport = buildMatchingChangeReport(mergeBefore, mergeAfter);
		const mergedRow = mergedReport.clusters.find(
			(row) => row.name === CLUSTER_MERGE_TEST
		);
		expect(mergedRow?.before).toBe(2);
		expect(mergedRow?.after).toBe(1);

		const afterOnlyRow = buildMatchingChangeReport(
			beforeSnapshot,
			afterSnapshot
		).clusters.find((row) => row.name === CLUSTER_AFTER_ONLY);
		expect(afterOnlyRow?.before).toBe(0);
		expect(afterOnlyRow?.after).toBe(1);
	});

	it("builds cluster rows with size changes and magnitude-ordered join/leave examples", () => {
		const clusterNames = report.clusters.map((row) => row.name);
		expect(clusterNames).toContain(CLUSTER_BEFORE_ONLY);
		expect(clusterNames).toContain(CLUSTER_AFTER_ONLY);
		expect(clusterNames).not.toContain(CLUSTER_SHARED);

		const beforeOnlyRow = report.clusters.find(
			(row) => row.name === CLUSTER_BEFORE_ONLY
		);
		expect(beforeOnlyRow?.before).toBe(2);
		expect(beforeOnlyRow?.after).toBe(0);
		expect(beforeOnlyRow?.examples.map((example) => example.songKey)).toEqual([
			SONG_KEY_TWO,
			SONG_KEY_THREE
		]);
		expect(beforeOnlyRow?.examples[0]).toMatchObject({
			beforePercent: EXPLAINED_SIXTY,
			afterPercent: EXPLAINED_SIXTY
		});

		const afterOnlyRow = report.clusters.find(
			(row) => row.name === CLUSTER_AFTER_ONLY
		);
		expect(afterOnlyRow?.before).toBe(0);
		expect(afterOnlyRow?.after).toBe(1);
		expect(afterOnlyRow?.examples[0]?.songKey).toBe(SONG_KEY_FOUR);
		expect(songChangeMagnitude(songTwoBefore, songTwoAfter)).toBeGreaterThan(
			songChangeMagnitude(songThreeBefore, songThreeAfter)
		);
	});

	it("caps core row examples at EXAMPLES_PER_ROW", () => {
		const zetaSongKeys = Array.from(
			{ length: EXAMPLES_PER_ROW + 1 },
			(_, index) => `zeta-song-${index}`
		);
		const zetaBeforeSongs = zetaSongKeys.map((songKey) =>
			makeSong(songKey, EXPLAINED_FORTY, { [CORE_ZETA]: COVERAGE_TEN })
		);
		const zetaAfterSongs = zetaSongKeys.map((songKey, index) =>
			makeSong(
				songKey,
				EXPLAINED_FORTY,
				index === zetaSongKeys.length - 1
					? {}
					: { [CORE_ZETA]: COVERAGE_TWENTY }
			)
		);
		const zetaReport = buildMatchingChangeReport(
			{ songs: zetaBeforeSongs, clusters: [] },
			{ songs: zetaAfterSongs, clusters: [] }
		);
		const zetaRow = zetaReport.cores.find((row) => row.name === CORE_ZETA);
		expect(zetaRow?.before).toBe(EXAMPLES_PER_ROW + 1);
		expect(zetaRow?.after).toBe(EXAMPLES_PER_ROW);
		expect(zetaRow?.examples).toHaveLength(EXAMPLES_PER_ROW);
	});
});
