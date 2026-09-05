import coreProgressionsData from "$data/core-progressions.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import { matchSongV2 } from "../../match-algo-v2/match-algo-v2-logic/matchSongV2.js";
import { DEFAULT_WEIGHTS } from "../../match-algo-v2/match-algo-v2-logic/weights.js";
import type { ProgressionWithMatchStats } from "../progression-matching-logic/progressionMatchAnalysis.js";
import type { ScaleName } from "../../../../chord-processing/scales.js";

export type SongBiasOverride = {
	songKey: string;
	title: string;
	artists: string[];
	winnerProgression: string;
	leaderProgression: string;
	sacrificedPercent: number;
};

export type SongProgressionCount = {
	chordProgression: string;
	scale: ScaleName;
	matchCount: number;
	chorusMatchCount: number;
	coveragePercent: number;
	isCore: boolean;
};

export type SongCoverageEntry = {
	songKey: string;
	title: string;
	artists: string[];
	coveragePercent: number;
	matchingProgressions: string[];
	progressionCounts: SongProgressionCount[];
	biasOverrides: SongBiasOverride[];
};

const toProgressionCount =
	(isCore: boolean) =>
	(match: ProgressionWithMatchStats): SongProgressionCount => ({
		chordProgression: match.chordProgression,
		scale: match.scale,
		matchCount: match.matchCount,
		chorusMatchCount: match.chorusMatchCount ?? 0,
		coveragePercent: match.coveragePercent,
		isCore
	});

export const computeSongCoverage = (song: GroupedSong): SongCoverageEntry => {
	const result = matchSongV2(song, coreProgressionsData, DEFAULT_WEIGHTS);
	const coreMatches = result.matches.filter((match) => match.isCoreProgression);
	const gapMatches = result.matches.filter((match) => !match.isCoreProgression);
	return {
		songKey: song.songKey,
		title: song.title,
		artists: song.artists,
		coveragePercent: result.explainedPercent,
		matchingProgressions: coreMatches.map((match) => match.chordProgression),
		progressionCounts: [
			...coreMatches.map(toProgressionCount(true)),
			...gapMatches.map(toProgressionCount(false))
		],
		biasOverrides: []
	};
};
