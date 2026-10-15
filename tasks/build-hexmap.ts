// Bakes HexMap's data (see src/data/hexMapSnapshot.ts) from static/data/songs.json:
// writes static/data/hexmap.json and static/data/song-shards/*.json.
// Run with `npm run hexmap` after songs.json, the progressions or the
// matching algorithm change.
import fs from "fs";
import path from "path";
import type { SongInput } from "../src/chord-processing/types.js";
import { resolveSongKey } from "../src/chord-processing/songIdentity.js";
import { applyHandReviewedCorrections } from "../src/data/applyHandReviewedCorrections.js";
import { groupSongs } from "../src/data/songBrowser.js";
import { sortAllSongs } from "../src/data/songBrowserData.js";
import {
	SONG_SHARD_COUNT,
	songShardFor,
	type HexMapSnapshot
} from "../src/data/hexMapSnapshot.js";
import { computeSongCoverage } from "../src/routes/demo/define-chord-progression/compute-coverage-of-all-songs/computeSongCoverage.js";
import { computeHexMapLayout } from "../src/routes/demo/harmony-map/embedding/hexMapLayout.js";

const ROOT = process.cwd();
const SONGS_PATH = path.join(ROOT, "static/data/songs.json");
const SNAPSHOT_PATH = path.join(ROOT, "static/data/hexmap.json");
const SHARD_DIR = path.join(ROOT, "static/data/song-shards");
// Enough to keep positions well under a pixel apart at max zoom.
const COORD_DECIMALS = 5;
const COVERAGE_DECIMALS = 2;

const round = (value: number, decimals: number): number =>
	Number(value.toFixed(decimals));

const time = <T>(label: string, run: () => T): T => {
	const startedAt = performance.now();
	const result = run();
	console.log(`${label}: ${Math.round(performance.now() - startedAt)} ms`);
	return result;
};

const inputs: SongInput[] = applyHandReviewedCorrections(
	JSON.parse(fs.readFileSync(SONGS_PATH, "utf8"))
);
// Same order as the live pipeline (createAllSongsCoverageState's baseList),
// since UMAP's output depends on row order.
const songs = time("group", () => sortAllSongs(groupSongs(inputs)));
const coverages = time("coverage", () => songs.map(computeSongCoverage));
const coordsByKey = time("umap", () => computeHexMapLayout(coverages));

const progressionNames: string[] = [];
const progressionIndex = new Map<string, number>();
const indexFor = (name: string): number => {
	let index = progressionIndex.get(name);
	if (index === undefined) {
		index = progressionNames.length;
		progressionNames.push(name);
		progressionIndex.set(name, index);
	}
	return index;
};

const placed = coverages.filter((entry) => coordsByKey.has(entry.songKey));
const snapshot: HexMapSnapshot = {
	songKeys: placed.map((entry) => entry.songKey),
	titles: placed.map((entry) => entry.title),
	artists: placed.map((entry) => entry.artists),
	x: placed.map((entry) =>
		round(coordsByKey.get(entry.songKey)!.x, COORD_DECIMALS)
	),
	y: placed.map((entry) =>
		round(coordsByKey.get(entry.songKey)!.y, COORD_DECIMALS)
	),
	progressionNames,
	progressions: placed.map((entry) =>
		entry.progressionCounts.flatMap((count) => [
			indexFor(count.name),
			round(count.coveragePercent, COVERAGE_DECIMALS)
		])
	)
};
fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot));

const shards: SongInput[][] = Array.from(
	{ length: SONG_SHARD_COUNT },
	() => []
);
for (const input of inputs)
	shards[songShardFor(resolveSongKey(input))].push(input);
fs.rmSync(SHARD_DIR, { recursive: true, force: true });
fs.mkdirSync(SHARD_DIR, { recursive: true });
shards.forEach((shard, index) =>
	fs.writeFileSync(path.join(SHARD_DIR, `${index}.json`), JSON.stringify(shard))
);

const megabytes = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
console.log(
	`${placed.length} songs, ${progressionNames.length} progressions → ${path.relative(ROOT, SNAPSHOT_PATH)} (${megabytes(fs.statSync(SNAPSHOT_PATH).size)})`
);
console.log(`${SONG_SHARD_COUNT} shards → ${path.relative(ROOT, SHARD_DIR)}/`);
