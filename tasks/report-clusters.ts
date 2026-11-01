// Snapshots matching + hex-map clustering stats for before/after comparisons:
// `vite-node tasks/report-clusters.ts <label>` writes
// reports/exact-roman-matching/<label>.json.
import fs from "fs";
import path from "path";
import type { SongInput } from "../src/chord-processing/types.js";
import coreProgressionsData from "../src/data/core-progressions.js";
import { applyHandReviewedCorrections } from "../src/data/applyHandReviewedCorrections.js";
import { groupSongs } from "../src/data/songBrowser.js";
import { sortAllSongs } from "../src/data/songBrowserData.js";
import {
	computeSongCoverage,
	type SongCoverageEntry
} from "../src/routes/demo/define-chord-progression/compute-coverage-of-all-songs/computeSongCoverage.js";
import { computeHexMapLayout } from "../src/routes/demo/harmony-map/embedding/hexMapLayout.js";
import { buildClusterInputPoints } from "../src/routes/demo/harmony-map/embedding/clustering/clusterInputPoints.js";
import { findDensityClusters } from "../src/routes/demo/harmony-map/embedding/clustering/densityClusters.js";
import { nameProgressionClusters } from "../src/routes/demo/harmony-map/embedding/clustering/progressionClusterNames.js";
import {
	computeSongHomogeneity,
	type SongHomogeneity
} from "../src/routes/demo/shared/progressionHomogeneity.js";

const CLUSTER_MIN_POINTS = 20;
const CLUSTER_MAX_POINTS = 300;
const CLUSTER_MIN_PROGRESSION_SHARE = 0.25;

const ROOT = process.cwd();
const SONGS_PATH = path.join(ROOT, "static/data/songs.json");
const REPORT_DIR = path.join(ROOT, "reports/exact-roman-matching");
const label = process.argv[2] ?? "snapshot";

const inputs: SongInput[] = applyHandReviewedCorrections(
	JSON.parse(fs.readFileSync(SONGS_PATH, "utf8"))
);
const songs = sortAllSongs(groupSongs(inputs));
const coverages = songs.map(computeSongCoverage);
const coordsByKey = computeHexMapLayout(coverages);

const homogeneityBySongKey = new Map(
	coverages.map((coverage): [string, SongHomogeneity | null] => [
		coverage.songKey,
		computeSongHomogeneity(coverage.progressionCounts)
	])
);

const clusterPoints = buildClusterInputPoints(
	coverages
		.filter((coverage) => coordsByKey.has(coverage.songKey))
		.map((coverage) => ({
			songKey: coverage.songKey,
			...coordsByKey.get(coverage.songKey)!,
			groupShares: [],
			homogeneityColor: ""
		}))
);

const dominantProgressionBySongKey = new Map(
	[...homogeneityBySongKey].flatMap(([songKey, homogeneity]) =>
		homogeneity ? [[songKey, homogeneity.dominantProgressionName] as const] : []
	)
);

const clusters = nameProgressionClusters(
	findDensityClusters(clusterPoints, CLUSTER_MIN_POINTS, CLUSTER_MAX_POINTS),
	dominantProgressionBySongKey,
	new Map(clusterPoints.map((point) => [point.songKey, point])),
	CLUSTER_MIN_PROGRESSION_SHARE
);

const countBy = <T>(items: readonly T[], keyOf: (item: T) => string) =>
	items.reduce(
		(counts, item) =>
			counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1),
		new Map<string, number>()
	);

const sortedRecord = (counts: Map<string, number>): Record<string, number> =>
	Object.fromEntries([...counts].sort((a, b) => b[1] - a[1]));

const coreScaleByName = new Map(
	coreProgressionsData.map((core) => [core.name, core.scale])
);

const crossScaleMatches = (coverage: SongCoverageEntry) =>
	coverage.progressionCounts.filter(
		(count) => count.isCore && coreScaleByName.get(count.name) !== count.scale
	);

const crossScaleSongs = coverages.filter(
	(coverage) => crossScaleMatches(coverage).length > 0
);

const mean = (values: readonly number[]): number =>
	values.length === 0
		? 0
		: values.reduce((sum, value) => sum + value, 0) / values.length;

const report = {
	label,
	songCount: coverages.length,
	meanExplainedPercent: mean(coverages.map((c) => c.coveragePercent)),
	songsWithAnyCore: coverages.filter((c) => c.matchingProgressions.length > 0)
		.length,
	clusteredSongCount: clusters.reduce(
		(sum, { cluster }) => sum + cluster.songKeys.length,
		0
	),
	clusters: clusters
		.map(({ cluster, name, showLabel }) => ({
			name,
			size: cluster.songKeys.length,
			showLabel
		}))
		.sort((a, b) => b.size - a.size),
	coreSongCounts: sortedRecord(
		countBy(
			coverages.flatMap((c) => [...new Set(c.matchingProgressions)]),
			(name) => name
		)
	),
	dominantProgressionCounts: sortedRecord(
		countBy([...dominantProgressionBySongKey.values()], (name) => name)
	),
	crossScale: {
		songCount: crossScaleSongs.length,
		matchCount: coverages.reduce(
			(sum, c) => sum + crossScaleMatches(c).length,
			0
		),
		byCore: sortedRecord(
			countBy(
				crossScaleSongs.flatMap((c) => crossScaleMatches(c)),
				(count) =>
					`${count.name} (core ${coreScaleByName.get(count.name)}, section ${count.scale})`
			)
		)
	},
	dominantProgressionBySongKey: Object.fromEntries(dominantProgressionBySongKey)
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
const outputPath = path.join(REPORT_DIR, `${label}.json`);
fs.writeFileSync(outputPath, JSON.stringify(report, null, "\t"));
console.log(
	`${report.songCount} songs, ${report.clusters.length} clusters → ${path.relative(ROOT, outputPath)}`
);
