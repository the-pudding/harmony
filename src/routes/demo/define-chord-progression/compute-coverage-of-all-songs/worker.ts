import coreProgressionsData from "$data/core-progressions.js";
import type { GroupedSong } from "../../progressions/songBrowser.js";
import { selectFinalProgressions } from "../progression-matching-logic/finalProgressionSelection.js";

export type SongCoverageEntry = {
	songKey: string;
	title: string;
	artists: string[];
	coveragePercent: number;
	matchingProgressions: string[];
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
	const selection = selectFinalProgressions(song, coreProgressions);
	return {
		songKey: song.songKey,
		title: song.title,
		artists: song.artists,
		coveragePercent: selection.explainedPercent,
		matchingProgressions: selection.coreSelected.map((m) => m.chordProgression)
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
