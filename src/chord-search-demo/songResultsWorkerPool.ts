import SongResultsWorker from "./songResults.worker.ts?worker";
import type {
	AbstractProgression,
	ParsedProgressionChord
} from "../chord-processing/types.js";
import { toEffectiveSearchProgression } from "../chord-processing/match-chord-progressions/index.js";
import { assembleGroupedSongResults } from "./assembleGroupedSongResults.js";
import { buildAnnualMatchCounts } from "./chord-progression-search-results/buildAnnualMatchCounts.js";
import type { AnnualMatchCount } from "./chord-progression-search-results/buildAnnualMatchCounts.js";
import type { GroupedSongSearchResult } from "../chord-processing/types.js";
import {
	SEQUENCE_CHART_WORKER_CHUNK_MIN_SECTIONS,
	SEQUENCE_CHART_WORKER_POOL_MAX
} from "./constants.js";
import { mergeSongResultsPartials } from "./mergeSongResultsPartials.js";
import type { SongResultsChunkFilters } from "./matchSongResultsChunk.js";
import {
	buildSongResultsCorpusState,
	splitSongResultsIndexIntoChunks,
	type SongResultsCorpusState
} from "./songResultsIndex.js";
import type { SongInput } from "../chord-processing/types.js";
import type {
	SongResultsWorkerComputeMessage,
	SongResultsWorkerInitMessage,
	SongResultsWorkerResponse
} from "./songResults.worker.js";

export type SongResultsComputeParams = {
	filters: SongResultsChunkFilters;
	searchAbstract: AbstractProgression | null;
	searchProgression: ParsedProgressionChord[];
	ignoreSlashBass: boolean;
	matchOptions: {
		fuzzySearch: boolean;
		matchAtBeginningOnly: boolean;
		matchAtLeastTwice: boolean;
	};
};

export type SongResultsComputeOutput = {
	groupedResults: GroupedSongSearchResult[];
	annualMatchCounts: AnnualMatchCount[];
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

const waitForWorkerMessage = <T extends SongResultsWorkerResponse["type"]>(
	worker: Worker,
	expectedType: T,
	version?: number
): Promise<Extract<SongResultsWorkerResponse, { type: T }>> =>
	new Promise((resolve, reject) => {
		const onMessage = (event: MessageEvent<SongResultsWorkerResponse>) => {
			const response = event.data;
			if (response.type !== expectedType) return;
			if (
				version !== undefined &&
				"version" in response &&
				response.version !== version
			)
				return;

			worker.removeEventListener("message", onMessage);
			worker.removeEventListener("error", onError);
			resolve(response as Extract<SongResultsWorkerResponse, { type: T }>);
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
let corpusState: SongResultsCorpusState | null = null;

export const initSongResultsWorkerPool = async (
	songs: SongInput[]
): Promise<void> => {
	terminateSongResultsWorkerPool();

	corpusState = buildSongResultsCorpusState(songs);
	const poolSize = resolveWorkerPoolSize(corpusState.workerIndex.length);
	const chunks = splitSongResultsIndexIntoChunks(
		corpusState.workerIndex,
		poolSize
	);

	workerHandles = chunks.map((songChunk) => {
		const worker = new SongResultsWorker();
		const initMessage: SongResultsWorkerInitMessage = {
			type: "INIT",
			chunk: songChunk
		};
		worker.postMessage(initMessage);
		const initDone = waitForWorkerMessage(worker, "INIT_DONE").then(
			() => undefined
		);
		return { worker, initDone };
	});

	await Promise.all(workerHandles.map(({ initDone }) => initDone));
};

export const computeSongResults = async (
	version: number,
	params: SongResultsComputeParams
): Promise<SongResultsComputeOutput> => {
	if (workerHandles.length === 0 || !corpusState) {
		return { groupedResults: [], annualMatchCounts: [] };
	}

	await Promise.all(workerHandles.map(({ initDone }) => initDone));

	const computeMessage: SongResultsWorkerComputeMessage = {
		type: "COMPUTE",
		version,
		filters: params.filters,
		searchAbstract: params.searchAbstract
	};

	const partials = await Promise.all(
		workerHandles.map(async ({ worker }) => {
			worker.postMessage(computeMessage);
			const response = await waitForWorkerMessage(worker, "PARTIAL", version);
			return response.partial;
		})
	);

	const merged = mergeSongResultsPartials(partials);
	const effectiveSearchProgression = toEffectiveSearchProgression(
		params.searchProgression,
		params.ignoreSlashBass
	);
	const groupedResults = assembleGroupedSongResults(
		merged,
		corpusState.sectionsBySongKey,
		effectiveSearchProgression,
		params.filters.hasSearchChords,
		params.matchOptions
	);

	return {
		groupedResults,
		annualMatchCounts: buildAnnualMatchCounts(groupedResults)
	};
};

export const terminateSongResultsWorkerPool = (): void => {
	workerHandles.forEach(({ worker }) => worker.terminate());
	workerHandles = [];
	corpusState = null;
};

export const isSongResultsWorkerPoolReady = (): boolean =>
	workerHandles.length > 0;
