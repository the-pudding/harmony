// Bakes the data behind the story's charts from static/data/songs.json into
// src/data/charts/*.csv (import them via $data/charts/...). Coverage is
// computed once and shared by every chart; add a new chart by adding an entry
// to `charts` below.
// Run with `npm run charts` after songs.json, the progressions or the
// matching algorithm change.
import fs from "fs";
import path from "path";
import { csvFormat } from "d3";
import type { SongInput } from "../src/chord-processing/types.js";
import { applyHandReviewedCorrections } from "../src/data/applyHandReviewedCorrections.js";
import { progressionGroupNameByProgressionName } from "../src/data/core-progressions.util.js";
import { groupSongs } from "../src/data/songBrowser.js";
import { sortAllSongs } from "../src/data/songBrowserData.js";
import { toCalendarYear } from "../src/data/songYear.js";
import { byYearFile } from "../src/utils/clusterChartFile.js";
import { computeSongCoverage } from "../src/routes/demo/define-chord-progression/compute-coverage-of-all-songs/computeSongCoverage.js";
import { computeDecadeHistory } from "../src/routes/demo/history/decadeSignatures.js";
import { computeTopProgressions } from "../src/routes/demo/history/topProgressions.js";
import {
	buildHomogeneityBandShares,
	effectiveProgressionCountFor
} from "../src/routes/demo/shared/progressionHomogeneity.js";

const ROOT = process.cwd();
const SONGS_PATH = path.join(ROOT, "static/data/songs.json");
const OUTPUT_DIR = path.join(ROOT, "src/data/charts");
const PERCENT_DECIMALS = 3;
const DECADE_YEARS = 10;
const SIGNATURE_DECADES = [1970, 1980, 1990];

const round = (value: number): number =>
	Number(value.toFixed(PERCENT_DECIMALS));

const inputs: SongInput[] = applyHandReviewedCorrections(
	JSON.parse(fs.readFileSync(SONGS_PATH, "utf8"))
);
// Same pipeline as the history page (createAllSongsCoverageState).
const songs = sortAllSongs(groupSongs(inputs));
const coverages = songs.map(computeSongCoverage);

// Songs with no matched progressions have no effective count and are left out
// of the effective-progression charts.
const songsWithEffectiveCount = songs.flatMap((song, i) => {
	const effectiveProgressionCount = effectiveProgressionCountFor(
		coverages[i].progressionCounts
	);
	return effectiveProgressionCount === null
		? []
		: [{ year: song.year, effectiveProgressionCount }];
});

const toBandRows = (effectiveProgressionCounts: readonly number[]) =>
	buildHomogeneityBandShares(effectiveProgressionCounts).map(
		({ band, songCount, sharePercent }) => ({
			band: band.shortLabel,
			label: band.label,
			songCount,
			sharePercent: round(sharePercent)
		})
	);

const decadeOf = (year: number): number =>
	Math.floor(toCalendarYear(year) / DECADE_YEARS) * DECADE_YEARS;

const buildTopProgressions = () =>
	// Unlimited, like the history page.
	computeTopProgressions(coverages, Number.POSITIVE_INFINITY).map((row, i) => ({
		rank: i + 1,
		name: row.name,
		chordProgression: row.chordProgression,
		scale: row.scale,
		group: progressionGroupNameByProgressionName.get(row.name) ?? "",
		avgCoveragePercent: round(row.avgCoveragePercent),
		songCount: row.songCount,
		songSharePercent: round(row.songSharePercent)
	}));

const buildEffectiveProgressions = () =>
	toBandRows(
		songsWithEffectiveCount.map((song) => song.effectiveProgressionCount)
	);

// Long format: one row per decade × band; sharePercent is within the decade.
const buildEffectiveProgressionsByDecade = () => {
	const countsByDecade = Map.groupBy(
		songsWithEffectiveCount.filter((song) => song.year !== undefined),
		(song) => decadeOf(song.year!)
	);
	return [...countsByDecade]
		.sort(([a], [b]) => a - b)
		.flatMap(([decade, decadeSongs]) =>
			toBandRows(decadeSongs.map((song) => song.effectiveProgressionCount)).map(
				(row) => ({ decade, ...row, decadeSongCount: decadeSongs.length })
			)
		);
};

// One row per calendar year: the share of that year's songs containing the
// named core progression at least once. Songs without a year are left out.
const buildProgressionShareByYear = (progressionName: string) => () => {
	const songsByYear = Map.groupBy(
		songs.flatMap((song, i) =>
			song.year === undefined
				? []
				: [{ year: song.year, coverage: coverages[i] }]
		),
		(song) => toCalendarYear(song.year)
	);
	return [...songsByYear]
		.sort(([a], [b]) => a - b)
		.map(([year, yearSongs]) => {
			const matchingCount = yearSongs.filter(({ coverage }) =>
				coverage.progressionCounts.some(
					(p) => p.isCore && p.name === progressionName
				)
			).length;
			return { year, percent: round((matchingCount / yearSongs.length) * 100) };
		});
};

// Each decade's top signature progression (most over-represented vs. the whole
// corpus), as ranked on the history page.
const decadeHistory = computeDecadeHistory(
	coverages,
	new Map(songs.map((song) => [song.songKey, song]))
);
const signatureCharts = SIGNATURE_DECADES.flatMap((decade) => {
	const signature = decadeHistory.find((d) => d.decade === decade)
		?.signatures[0];
	if (!signature) return [];
	console.log(`${decade}s signature: ${signature.name}`);
	return [
		{
			file: byYearFile(signature.name, decade),
			build: buildProgressionShareByYear(signature.name)
		}
	];
});

const charts: { file: string; build: () => object[] }[] = [
	{ file: "top-progressions.csv", build: buildTopProgressions },
	{ file: "effective-progressions.csv", build: buildEffectiveProgressions },
	{
		file: "effective-progressions-by-decade.csv",
		build: buildEffectiveProgressionsByDecade
	},
	{
		file: byYearFile("axis of awesome"),
		build: buildProgressionShareByYear("axis of awesome")
	},
	{
		file: byYearFile("doo wop"),
		build: buildProgressionShareByYear("doo wop")
	},
	...signatureCharts
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
console.log(
	`${songs.length} songs (${songsWithEffectiveCount.length} with matched progressions)`
);
charts.forEach(({ file, build }) => {
	const rows = build();
	const outputPath = path.join(OUTPUT_DIR, file);
	fs.writeFileSync(outputPath, csvFormat(rows) + "\n");
	console.log(`${rows.length} rows → ${path.relative(ROOT, outputPath)}`);
});
