// `vite-node tasks/snapshot-matching.ts <output.json>` snapshots per-song core
// coverage and hex-map cluster membership, for diffing two matcher versions
// with tasks/build-matching-change-report.ts.
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
import { computeHexMapLayout } from "../src/components/hexmap/embedding/hexMapLayout.js";
import { buildClusterInputPoints } from "../src/components/hexmap/embedding/clustering/clusterInputPoints.js";
import { findDensityClusters } from "../src/components/hexmap/embedding/clustering/densityClusters.js";
import { nameProgressionClusters } from "../src/components/hexmap/embedding/clustering/progressionClusterNames.js";
import { computeSongHomogeneity } from "../src/routes/demo/shared/progressionHomogeneity.js";

const CLUSTER_MIN_POINTS = 20;
const CLUSTER_MAX_POINTS = 300;
const CLUSTER_MIN_PROGRESSION_SHARE = 0.25;

const ROOT = process.cwd();
const SONGS_PATH = path.join(ROOT, "static/data/songs.json");
const outputPath = path.resolve(process.argv[2] ?? "matching-snapshot.json");

const inputs: SongInput[] = applyHandReviewedCorrections(
	JSON.parse(fs.readFileSync(SONGS_PATH, "utf8"))
);
const coverages = sortAllSongs(groupSongs(inputs)).map(computeSongCoverage);
const coordsByKey = computeHexMapLayout(coverages);

const dominantProgressionBySongKey = new Map(
	coverages.flatMap((coverage) => {
		const homogeneity = computeSongHomogeneity(coverage.progressionCounts);
		return homogeneity
			? [[coverage.songKey, homogeneity.dominantProgressionName] as const]
			: [];
	})
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

const clusters = nameProgressionClusters(
	findDensityClusters(clusterPoints, CLUSTER_MIN_POINTS, CLUSTER_MAX_POINTS),
	dominantProgressionBySongKey,
	new Map(clusterPoints.map((point) => [point.songKey, point])),
	CLUSTER_MIN_PROGRESSION_SHARE
);

const coreScaleByName = new Map(
	coreProgressionsData.map((core) => [core.name, core.scale])
);

const coreCoverageByName = (
	coverage: SongCoverageEntry
): Record<string, number> =>
	coverage.progressionCounts
		.filter((count) => count.isCore)
		.reduce<Record<string, number>>(
			(byName, count) => ({
				...byName,
				[count.name]: (byName[count.name] ?? 0) + count.coveragePercent
			}),
			{}
		);

const hasCrossScaleCoreMatch = (coverage: SongCoverageEntry): boolean =>
	coverage.progressionCounts.some(
		(count) => count.isCore && coreScaleByName.get(count.name) !== count.scale
	);

const snapshot = {
	songs: coverages.map((coverage) => ({
		songKey: coverage.songKey,
		title: coverage.title,
		artists: coverage.artists,
		explainedPercent: coverage.coveragePercent,
		coreCoverage: coreCoverageByName(coverage),
		dominantProgression: dominantProgressionBySongKey.get(coverage.songKey),
		hasCrossScaleCoreMatch: hasCrossScaleCoreMatch(coverage)
	})),
	clusters: clusters.map(({ cluster, name }) => ({
		name,
		songKeys: cluster.songKeys
	}))
};

fs.writeFileSync(outputPath, JSON.stringify(snapshot));
console.log(
	`${snapshot.songs.length} songs, ${snapshot.clusters.length} clusters → ${outputPath}`
);
