import coreProgressionsData from "$data/core-progressions.js";
import type { GroupedSong } from "../../progressions/songBrowser.js";
import { computeProgressionMatches } from "../progression-matching-logic/progressionMatchAnalysis.js";
import { computeRecurringProgressionMatches } from "../progression-matching-logic/recurringProgressionAnalysis.js";
import { selectCoreProgressions } from "../progression-matching-logic/coreProgressionSelection.js";
import { selectNonCoreProgressions } from "../progression-matching-logic/recurringProgressionSelection.js";
import { coveragePercent } from "../progression-matching-logic/greedyProgressionSelection.js";

export type SongCoverageEntry = {
	songKey: string;
	title: string;
	artists: string[];
	coveragePercent: number;
};

export type CoverageWorkerInitMessage = {
	type: "INIT";
	songs: GroupedSong[];
};

export type CoverageWorkerComputeMessage = {
	type: "COMPUTE";
	requestId: number;
};

export type CoverageWorkerMessage = CoverageWorkerInitMessage | CoverageWorkerComputeMessage;

export type CoverageWorkerInitDoneMessage = {
	type: "INIT_DONE";
};

export type CoverageWorkerResultMessage = {
	type: "RESULT";
	requestId: number;
	coverages: SongCoverageEntry[];
};

export type CoverageWorkerResponse = CoverageWorkerInitDoneMessage | CoverageWorkerResultMessage;

const coreProgressions = coreProgressionsData;

let songs: GroupedSong[] = [];

const computeOneSong = (song: GroupedSong): SongCoverageEntry => {
	const coreMatches = computeProgressionMatches(song, coreProgressions);
	const recurring = computeRecurringProgressionMatches(song);
	const coreSelection = selectCoreProgressions(song, coreMatches);
	const recurringSelection = selectNonCoreProgressions(song, recurring, coreSelection.coverage);
	return {
		songKey: song.songKey,
		title: song.title,
		artists: song.artists,
		coveragePercent: Math.round(coveragePercent(song, recurringSelection.coverage))
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
