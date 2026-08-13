import type { GroupedSong } from "../../../../data/songBrowser.js";
import {
	computeSongCoverage,
	type SongBiasOverride,
	type SongProgressionCount,
	type SongCoverageEntry
} from "./computeSongCoverage.js";

export type { SongBiasOverride, SongProgressionCount, SongCoverageEntry };

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

let songs: GroupedSong[] = [];

self.onmessage = (event: MessageEvent<CoverageWorkerMessage>) => {
	const message = event.data;

	if (message.type === "INIT") {
		songs = message.songs;
		const response: CoverageWorkerInitDoneMessage = { type: "INIT_DONE" };
		self.postMessage(response);
		return;
	}

	if (message.type === "COMPUTE") {
		const coverages = songs.map(computeSongCoverage);
		const response: CoverageWorkerResultMessage = {
			type: "RESULT",
			requestId: message.requestId,
			coverages
		};
		self.postMessage(response);
	}
};
