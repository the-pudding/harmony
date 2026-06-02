import SequenceChartWorker from "./sequenceChart.worker.ts?worker";
import type { AbstractProgression } from "../chord-processing/types.js";
import {
	mergePartialGramStats,
	type PartialGramStats,
	type VariableGramStat
} from "./computeVariableGramStats.js";
import {
	buildChartSongIndex,
	splitChartSongIndexIntoChunks,
	type ChartSongIndexEntry
} from "./chartSongIndex.js";
import type { ChartChunkFilters } from "./matchChartCorpusChunk.js";
import {
	SEQUENCE_CHART_WORKER_CHUNK_MIN_SECTIONS,
	SEQUENCE_CHART_WORKER_POOL_MAX
} from "./constants.js";
import type {
	SequenceChartWorkerComputeMessage,
	SequenceChartWorkerInitMessage,
	SequenceChartWorkerResponse
} from "./sequenceChart.worker.js";

export type ChartComputeOptions = {
	topN: number;
	minNumChordsToCountAsAProgression: number;
	maxLen: number;
	aggregateRepeats: boolean;
	canonicalizeRotations: boolean;
};

export type ChartComputeRequest = {
	requestId: number;
	filters: ChartChunkFilters;
	searchAbstract: AbstractProgression | null;
	options: ChartComputeOptions;
};

type WorkerHandle = {
	worker: Worker;
	initDone: Promise<void>;
};

const resolveWorkerPoolSize = (sectionCount: number): number => {
	const hardwareLimit =
		typeof navigator !== "undefined" && navigator.hardwareConcurrency
			? navigator.hardwareConcurrency
			: 4;
	const cappedLimit = Math.min(hardwareLimit, SEQUENCE_CHART_WORKER_POOL_MAX);
	const minSectionsPerWorker = SEQUENCE_CHART_WORKER_CHUNK_MIN_SECTIONS;
	const sectionLimitedCount = Math.max(
		1,
		Math.min(cappedLimit, Math.ceil(sectionCount / minSectionsPerWorker))
	);

	return sectionLimitedCount;
};

const waitForWorkerMessage = <T extends SequenceChartWorkerResponse["type"]>(
	worker: Worker,
	expectedType: T,
	requestId?: number
): Promise<Extract<SequenceChartWorkerResponse, { type: T }>> =>
	new Promise((resolve, reject) => {
		const onMessage = (event: MessageEvent<SequenceChartWorkerResponse>) => {
			const response = event.data;
			if (response.type !== expectedType) return;
			if (requestId !== undefined && "requestId" in response && response.requestId !== requestId)
				return;

			worker.removeEventListener("message", onMessage);
			worker.removeEventListener("error", onError);
			resolve(response as Extract<SequenceChartWorkerResponse, { type: T }>);
		};

		const onError = (error: ErrorEvent) => {
			worker.removeEventListener("message", onMessage);
			worker.removeEventListener("error", onError);
			reject(error.error ?? new Error(error.message));
		};

		worker.addEventListener("message", onMessage);
		worker.addEventListener("error", onError);
	});

let workerHandles: WorkerHandle[] = [];

export const initSequenceChartWorkerPool = async (
	songs: ChartSongIndexEntry[]
): Promise<void> => {
	terminateSequenceChartWorkerPool();

	const poolSize = resolveWorkerPoolSize(songs.length);
	const chunks = splitChartSongIndexIntoChunks(songs, poolSize);

	workerHandles = chunks.map((songChunk) => {
		const worker = new SequenceChartWorker();
		const initMessage: SequenceChartWorkerInitMessage = {
			type: "INIT",
			chunk: songChunk
		};
		worker.postMessage(initMessage);
		const initDone = waitForWorkerMessage(worker, "INIT_DONE").then(() => undefined);
		return { worker, initDone };
	});

	await Promise.all(workerHandles.map(({ initDone }) => initDone));
};

export const initSequenceChartWorkerPoolFromSongs = async (
	songs: Parameters<typeof buildChartSongIndex>[0]
): Promise<void> => initSequenceChartWorkerPool(buildChartSongIndex(songs));

export const computeSequenceChartStats = async (
	request: ChartComputeRequest
): Promise<VariableGramStat[]> => {
	if (workerHandles.length === 0) return [];

	await Promise.all(workerHandles.map(({ initDone }) => initDone));

	const computeMessage: SequenceChartWorkerComputeMessage = {
		type: "COMPUTE",
		requestId: request.requestId,
		filters: request.filters,
		searchAbstract: request.searchAbstract,
		options: request.options
	};

	const partials = await Promise.all(
		workerHandles.map(async ({ worker }) => {
			worker.postMessage(computeMessage);
			const response = await waitForWorkerMessage(
				worker,
				"PARTIAL",
				request.requestId
			);
			return response.partial;
		})
	);

	return mergePartialGramStats(partials as PartialGramStats[], request.options);
};

export const terminateSequenceChartWorkerPool = (): void => {
	workerHandles.forEach(({ worker }) => worker.terminate());
	workerHandles = [];
};

export const isSequenceChartWorkerPoolReady = (): boolean => workerHandles.length > 0;
