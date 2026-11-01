// `vite-node tasks/build-matching-change-report.ts <before.json> <after.json>`
// diffs two tasks/snapshot-matching.ts outputs into the /demo/matching-changes
// page data, and re-matches the current corpus to show what cores opted out
// of exact roman numeral matching retain.
import fs from "fs";
import path from "path";
import type { SongInput } from "../src/chord-processing/types.js";
import coreProgressions, {
	matchesRomanNumeralsExactly,
	type CoreProgression
} from "../src/data/core-progressions.js";
import { applyHandReviewedCorrections } from "../src/data/applyHandReviewedCorrections.js";
import { groupSongs, type GroupedSong } from "../src/data/songBrowser.js";
import { matchSongV2 } from "../src/routes/demo/match-algo-v2/match-algo-v2-logic/matchSongV2.js";
import {
	buildMatchingChangeReport,
	buildRelativeCoreRow,
	type MatchingSnapshot
} from "../src/routes/demo/matching-changes/matchingChangeReport.js";

const ROOT = process.cwd();
const SONGS_PATH = path.join(ROOT, "static/data/songs.json");
const OUTPUT_PATH = path.join(
	ROOT,
	"src/routes/demo/matching-changes/matchingChangeReport.json"
);

const readSnapshot = (filePath: string): MatchingSnapshot =>
	JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));

const relativeCoreNames = coreProgressions
	.filter((core) => !matchesRomanNumeralsExactly(core))
	.map((core) => core.name);

const allExactCores: CoreProgression[] = coreProgressions.map((core) => ({
	...core,
	matchRomanNumeralsExactly: true
}));

const coverageByCoreName = (
	song: GroupedSong,
	cores: CoreProgression[]
): Map<string, number> =>
	matchSongV2(song, cores)
		.matches.filter((match) => match.isCoreProgression)
		.reduce(
			(byName, match) =>
				new Map(byName).set(
					match.name,
					(byName.get(match.name) ?? 0) + match.coveragePercent
				),
			new Map<string, number>()
		);

const buildRelativeCoreRows = () => {
	const songs = groupSongs(
		applyHandReviewedCorrections(
			JSON.parse(fs.readFileSync(SONGS_PATH, "utf8")) as SongInput[]
		)
	);
	const songCoverages = songs.map((song) => ({
		song,
		relative: coverageByCoreName(song, coreProgressions),
		exact: coverageByCoreName(song, allExactCores)
	}));
	return relativeCoreNames.map((name) =>
		buildRelativeCoreRow(
			name,
			songCoverages.map(({ song, relative, exact }) => ({
				songKey: song.songKey,
				title: song.title,
				artists: song.artists,
				exactPercent: exact.get(name) ?? 0,
				relativePercent: relative.get(name) ?? 0
			}))
		)
	);
};

const [beforePath, afterPath] = process.argv.slice(2);
const report = buildMatchingChangeReport(
	readSnapshot(beforePath),
	readSnapshot(afterPath),
	relativeCoreNames.length > 0 ? buildRelativeCoreRows() : []
);

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, "\t"));
console.log(
	`${report.cores.length} cores, ${report.clusters.length} clusters, ${report.relativeCores.length} relative cores → ${path.relative(ROOT, OUTPUT_PATH)}`
);
