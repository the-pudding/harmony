import { matchSongResultsChunk } from "./matchSongResultsChunk.js";
import type { SongResultsWorkerEntry } from "./songResultsIndex.js";
import type { AbstractProgression } from "../chord-processing/types.js";
import type { SongResultsChunkFilters } from "./matchSongResultsChunk.js";
import type { SongResultsPartial } from "./matchSongResultsChunk.js";

export type SongResultsWorkerInitMessage = {
	type: "INIT";
	chunk: SongResultsWorkerEntry[];
};

export type SongResultsWorkerComputeMessage = {
	type: "COMPUTE";
	version: number;
	filters: SongResultsChunkFilters;
	searchAbstract: AbstractProgression | null;
};

export type SongResultsWorkerMessage =
	| SongResultsWorkerInitMessage
	| SongResultsWorkerComputeMessage;

export type SongResultsWorkerInitDoneMessage = {
	type: "INIT_DONE";
};

export type SongResultsWorkerPartialMessage = {
	type: "PARTIAL";
	version: number;
	partial: SongResultsPartial;
};

export type SongResultsWorkerResponse =
	| SongResultsWorkerInitDoneMessage
	| SongResultsWorkerPartialMessage;

let chunk: SongResultsWorkerEntry[] = [];

self.onmessage = (event: MessageEvent<SongResultsWorkerMessage>) => {
	const message = event.data;

	if (message.type === "INIT") {
		chunk = message.chunk;
		const response: SongResultsWorkerInitDoneMessage = { type: "INIT_DONE" };
		self.postMessage(response);
		return;
	}

	if (message.type === "COMPUTE") {
		const partial = matchSongResultsChunk(
			chunk,
			message.filters,
			message.searchAbstract
		);
		const response: SongResultsWorkerPartialMessage = {
			type: "PARTIAL",
			version: message.version,
			partial
		};
		self.postMessage(response);
	}
};
