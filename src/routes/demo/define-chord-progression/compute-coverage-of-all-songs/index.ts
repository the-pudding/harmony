import CoverageWorker from "./worker.ts?worker";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import { buildProgressionMatchRates } from "../progression-matching-logic/progressionMatchAnalysis.js";
import type {
	CoverageWorkerInitMessage,
	CoverageWorkerComputeMessage,
	CoverageWorkerResponse,
	SongCoverageEntry,
	SongBiasOverride,
	SongProgressionCount
} from "./worker.js";

export type { SongCoverageEntry, SongBiasOverride, SongProgressionCount };

export type AllSongsCoverageResult = {
	songCoverages: SongCoverageEntry[];
	progressionMatchRates: Record<string, number>;
	progressionMatchCounts: Record<string, number>;
	biasOverrides: SongBiasOverride[];
};

const WORKER_POOL_MAX = 8;
const MIN_SONGS_PER_WORKER = 10;

type WorkerHandle = {
	worker: Worker;
	initDone: Promise<void>;
};

const resolveWorkerPoolSize = (songCount: number): number => {
	const hardwareLimit =
		typeof navigator !== "undefined" && navigator.hardwareConcurrency
			? navigator.hardwareConcurrency
			: 4;
	const cappedLimit = Math.min(hardwareLimit, WORKER_POOL_MAX);
	return Math.max(
		1,
		Math.min(cappedLimit, Math.ceil(songCount / MIN_SONGS_PER_WORKER))
	);
};

const splitIntoChunks = <T>(items: T[], count: number): T[][] =>
	Array.from({ length: count }, (_, i) => {
		const chunkSize = Math.ceil(items.length / count);
		return items.slice(i * chunkSize, (i + 1) * chunkSize);
	}).filter((chunk) => chunk.length > 0);

const waitForWorkerMessage = <T extends CoverageWorkerResponse["type"]>(
	worker: Worker,
	expectedType: T,
	requestId?: number
): Promise<Extract<CoverageWorkerResponse, { type: T }>> =>
	new Promise((resolve, reject) => {
		const onMessage = (event: MessageEvent<CoverageWorkerResponse>) => {
			const response = event.data;
			if (response.type !== expectedType) return;
			if (
				requestId !== undefined &&
				"requestId" in response &&
				response.requestId !== requestId
			)
				return;
			worker.removeEventListener("message", onMessage);
			worker.removeEventListener("error", onError);
			resolve(response as Extract<CoverageWorkerResponse, { type: T }>);
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

export const initCoverageWorkerPool = async (
	songs: GroupedSong[]
): Promise<void> => {
	terminateCoverageWorkerPool();

	const poolSize = resolveWorkerPoolSize(songs.length);
	const chunks = splitIntoChunks(songs, poolSize);

	workerHandles = chunks.map((chunk) => {
		const worker = new CoverageWorker();
		const initMessage: CoverageWorkerInitMessage = {
			type: "INIT",
			songs: chunk
		};
		worker.postMessage(initMessage);
		const initDone = waitForWorkerMessage(worker, "INIT_DONE").then(
			() => undefined
		);
		return { worker, initDone };
	});

	await Promise.all(workerHandles.map(({ initDone }) => initDone));
};

export const computeCoverageOfAllSongs = async (
	requestId: number
): Promise<AllSongsCoverageResult> => {
	if (workerHandles.length === 0) {
		return {
			songCoverages: [],
			progressionMatchRates: {},
			progressionMatchCounts: {},
			biasOverrides: []
		};
	}

	await Promise.all(workerHandles.map(({ initDone }) => initDone));

	const computeMessage: CoverageWorkerComputeMessage = {
		type: "COMPUTE",
		requestId
	};

	const chunkResults = await Promise.all(
		workerHandles.map(async ({ worker }) => {
			worker.postMessage(computeMessage);
			const response = await waitForWorkerMessage(worker, "RESULT", requestId);
			return response.coverages;
		})
	);

	const songCoverages = chunkResults.flat();
	const { progressionMatchRates, progressionMatchCounts } =
		buildProgressionMatchRates(
			songCoverages.map((s) => s.matchingProgressions),
			songCoverages.length
		);
	const biasOverrides = songCoverages.flatMap((s) => s.biasOverrides);

	return {
		songCoverages,
		progressionMatchRates,
		progressionMatchCounts,
		biasOverrides
	};
};

export const terminateCoverageWorkerPool = (): void => {
	workerHandles.forEach(({ worker }) => worker.terminate());
	workerHandles = [];
};

export const isCoverageWorkerPoolReady = (): boolean =>
	workerHandles.length > 0;

export const filterCoverageResultForProgressions = (
	result: AllSongsCoverageResult,
	chordProgressions: string[]
): AllSongsCoverageResult => {
	const progressionSet = new Set(chordProgressions);
	const songCoverages = result.songCoverages.filter((s) =>
		s.matchingProgressions.some((p) => progressionSet.has(p))
	);
	const filteredSongKeys = new Set(songCoverages.map((s) => s.songKey));
	return {
		songCoverages,
		progressionMatchRates: result.progressionMatchRates,
		progressionMatchCounts: result.progressionMatchCounts,
		biasOverrides: result.biasOverrides.filter((o) =>
			filteredSongKeys.has(o.songKey)
		)
	};
};
