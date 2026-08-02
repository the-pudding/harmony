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

export type CoverageWorkerInitMessage = {
	type: "INIT";
	songs: GroupedSong[];
};

export type CoverageWorkerComputeMessage = {
	type: "COMPUTE";
	requestId: number;
};

export type CoverageWorkerMessage =
	| CoverageWorkerInitMessage
	| CoverageWorkerComputeMessage;

export type CoverageWorkerInitDoneMessage = {
	type: "INIT_DONE";
};

export type CoverageWorkerResultMessage = {
	type: "RESULT";
	requestId: number;
	coverages: SongCoverageEntry[];
};

export type CoverageWorkerResponse =
	| CoverageWorkerInitDoneMessage
	| CoverageWorkerResultMessage;

const coreProgressions = coreProgressionsData;

let songs: GroupedSong[] = [];

const toProgressionCount =
	(isCore: boolean) =>
	(match: ProgressionWithMatchStats): SongProgressionCount => ({
		chordProgression: match.chordProgression,
		scale: match.scale,
		matchCount: match.matchCount,
		coveragePercent: match.coveragePercent,
		isCore
	});

const computeOneSong = (song: GroupedSong): SongCoverageEntry => {
	const selection = selectFinalProgressions(song, coreProgressions);
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

self.onmessage = (event: MessageEvent<CoverageWorkerMessage>) => {
	const message = event.data;

	if (message.type === "INIT") {
		songs = message.songs;
		const response: CoverageWorkerInitDoneMessage = { type: "INIT_DONE" };
		self.postMessage(response);
		return;
	}

	if (message.type === "COMPUTE") {
		const coverages = songs.map(computeOneSong);
		const response: CoverageWorkerResultMessage = {
			type: "RESULT",
			requestId: message.requestId,
			coverages
		};
		self.postMessage(response);
	}
};
