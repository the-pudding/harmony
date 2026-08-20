import coreProgressionsData from "$data/core-progressions.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "../progression-matching-logic/finalProgressionSelection.js";
import type { SectionStartBiasOverride } from "../progression-matching-logic/greedyProgressionSelection.js";
import type { ProgressionWithMatchStats } from "../progression-matching-logic/progressionMatchAnalysis.js";
import type { ScaleName } from "../../../../chord-processing/scales.js";

export type SongBiasOverride = SectionStartBiasOverride & {
	songKey: string;
	title: string;
	artists: string[];
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
	const selection = selectFinalProgressions(song, coreProgressionsData);
	return {
		songKey: song.songKey,
		title: song.title,
		artists: song.artists,
		coveragePercent: selection.explainedPercent,
		matchingProgressions: selection.coreSelected.map((m) => m.chordProgression),
		progressionCounts: [
			...selection.coreSelected.map(toProgressionCount(true)),
			...selection.gapSelected.map(toProgressionCount(false))
		],
		biasOverrides: selection.biasOverrides.map((override) => ({
			...override,
			songKey: song.songKey,
			title: song.title,
			artists: song.artists
		}))
	};
};
