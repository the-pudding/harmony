import type { AbstractProgression } from "../chord-processing/types.js";
import type { ChartChunkFilters } from "./matchChartCorpusChunk.js";
import {
	computePartialGramStats,
	type PartialGramStats,
	type SearchGramFilter,
	type VariableGramStat
} from "./computeVariableGramStats.js";
import { matchChartCorpusChunk } from "./matchChartCorpusChunk.js";
import type { ChartSongIndexEntry } from "./chartSongIndex.js";

export type SequenceChartWorkerInitMessage = {
	type: "INIT";
	chunk: ChartSongIndexEntry[];
};

export type SequenceChartWorkerComputeMessage = {
	type: "COMPUTE";
	requestId: number;
	filters: ChartChunkFilters;
	searchAbstract: AbstractProgression | null;
	options: {
		topN: number;
		minNumChordsToCountAsAProgression: number;
		maxLen: number;
		aggregateRepeats: boolean;
		canonicalizeRotations: boolean;
	};
};

export type SequenceChartWorkerMessage =
	| SequenceChartWorkerInitMessage
	| SequenceChartWorkerComputeMessage;

export type SequenceChartWorkerInitDoneMessage = {
	type: "INIT_DONE";
};

export type SequenceChartWorkerPartialMessage = {
	type: "PARTIAL";
	requestId: number;
	partial: PartialGramStats;
};

export type SequenceChartWorkerResponse =
	| SequenceChartWorkerInitDoneMessage
	| SequenceChartWorkerPartialMessage;

let chunk: ChartSongIndexEntry[] = [];

self.onmessage = (event: MessageEvent<SequenceChartWorkerMessage>) => {
	const message = event.data;

	if (message.type === "INIT") {
		chunk = message.chunk;
		const response: SequenceChartWorkerInitDoneMessage = { type: "INIT_DONE" };
		self.postMessage(response);
		return;
	}

	if (message.type === "COMPUTE") {
		const corpus = matchChartCorpusChunk(
			chunk,
			message.filters,
			message.searchAbstract
		);
		const searchGramFilter: SearchGramFilter | null =
			message.filters.hasSearchChords && message.searchAbstract
				? {
						searchAbstract: message.searchAbstract,
						fuzzySearch: message.filters.fuzzySearch,
						matchAtBeginningOnly: message.filters.matchAtBeginningOnly
					}
				: null;
		const partial = computePartialGramStats(
			corpus,
			message.options,
			searchGramFilter
		);
		const response: SequenceChartWorkerPartialMessage = {
			type: "PARTIAL",
			requestId: message.requestId,
			partial
		};
		self.postMessage(response);
	}
};

export type { VariableGramStat };
