// Bakes the history page's ranked core progressions (see
// src/routes/demo/history/topProgressions.ts) from static/data/songs.json:
// writes src/data/top-progressions.csv (import it via $data).
// Run with `npm run top-progressions` after songs.json, the progressions or
// the matching algorithm change.
import fs from "fs";
import path from "path";
import { csvFormat } from "d3";
import type { SongInput } from "../src/chord-processing/types.js";
import { applyHandReviewedCorrections } from "../src/data/applyHandReviewedCorrections.js";
import { progressionGroupNameByProgressionName } from "../src/data/core-progressions.util.js";
import { groupSongs } from "../src/data/songBrowser.js";
import { sortAllSongs } from "../src/data/songBrowserData.js";
import { computeSongCoverage } from "../src/routes/demo/define-chord-progression/compute-coverage-of-all-songs/computeSongCoverage.js";
import { computeTopProgressions } from "../src/routes/demo/history/topProgressions.js";

const ROOT = process.cwd();
const SONGS_PATH = path.join(ROOT, "static/data/songs.json");
const OUTPUT_PATH = path.join(ROOT, "src/data/top-progressions.csv");
const PERCENT_DECIMALS = 3;

const round = (value: number): number =>
	Number(value.toFixed(PERCENT_DECIMALS));

const inputs: SongInput[] = applyHandReviewedCorrections(
	JSON.parse(fs.readFileSync(SONGS_PATH, "utf8"))
);
// Same pipeline as the history page (createAllSongsCoverageState).
const songs = sortAllSongs(groupSongs(inputs));
const coverages = songs.map(computeSongCoverage);
// Unlimited, like the history page.
const ranked = computeTopProgressions(coverages, Number.POSITIVE_INFINITY);

const rows = ranked.map((row, i) => ({
	rank: i + 1,
	name: row.name,
	chordProgression: row.chordProgression,
	scale: row.scale,
	group: progressionGroupNameByProgressionName.get(row.name) ?? "",
	avgCoveragePercent: round(row.avgCoveragePercent),
	songCount: row.songCount,
	songSharePercent: round(row.songSharePercent)
}));
fs.writeFileSync(OUTPUT_PATH, csvFormat(rows) + "\n");

console.log(
	`${songs.length} songs, ${rows.length} progressions → ${path.relative(ROOT, OUTPUT_PATH)}`
);
