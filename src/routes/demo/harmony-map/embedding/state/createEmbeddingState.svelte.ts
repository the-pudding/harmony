import { onDestroy } from "svelte";
import type { SongCoverageEntry } from "../../../define-chord-progression/compute-coverage-of-all-songs/index.js";
import {
	buildFeatureAxesCoords,
	buildProgressionVocabulary,
	buildSongVectors,
	DEFAULT_SONG_VECTOR_OPTIONS,
	toMatrix,
	type SongVectorOptions,
	type SongVectorSet
} from "../vectors/index.js";
import {
	reduceOffMainThread,
	terminateReduceWorker,
	type ComponentLoading,
	type Coords,
	type EmbeddingMethod,
	type ReductionResult
} from "../reducers/index.js";

export type EmbeddingStatus = "idle" | "computing" | "ready";

export type EmbeddingResult = {
	coordsByKey: Map<string, Coords>;
	componentLoadings: ComponentLoading[][] | null;
	explainedVariance: number[] | null;
};

const EMPTY_RESULT: EmbeddingResult = {
	coordsByKey: new Map(),
	componentLoadings: null,
	explainedVariance: null
};

type EmbeddingStateConfig = {
	getEntries: () => SongCoverageEntry[] | null;
	initialMethod: EmbeddingMethod;
	onMethodChange?: (method: EmbeddingMethod) => void;
};

const toEmbeddingResult = (
	result: ReductionResult,
	songKeys: readonly string[]
): EmbeddingResult => ({
	coordsByKey: new Map(
		result.coords.map((coords, index) => [songKeys[index], coords])
	),
	componentLoadings: result.componentLoadings,
	explainedVariance: result.explainedVariance
});

const withOnlyCurrentDataset = (
	cache: Map<string, EmbeddingResult>,
	datasetToken: string
): Map<string, EmbeddingResult> =>
	new Map(
		[...cache.entries()].filter(([key]) => key.startsWith(`${datasetToken}|`))
	);

export const createEmbeddingState = (config: EmbeddingStateConfig) => {
	let method = $state<EmbeddingMethod>(config.initialMethod);
	let options = $state<SongVectorOptions>(DEFAULT_SONG_VECTOR_OPTIONS);
	let resultCache = $state(new Map<string, EmbeddingResult>());
	let status = $state<EmbeddingStatus>("idle");

	let datasetSequence = 0;

	const songs = $derived(config.getEntries() ?? []);
	const vocabulary = $derived(buildProgressionVocabulary(songs));

	const dataset = $derived.by(
		(): { token: string; vectorSet: SongVectorSet } => ({
			token: `dataset-${++datasetSequence}`,
			vectorSet: buildSongVectors(songs, vocabulary, options)
		})
	);

	const cacheKey = $derived(`${dataset.token}|${method}`);

	const cacheResult = (key: string, result: EmbeddingResult) => {
		resultCache = withOnlyCurrentDataset(resultCache, dataset.token).set(
			key,
			result
		);
	};

	$effect(() => {
		const key = cacheKey;
		if (resultCache.has(key)) {
			status = "ready";
			return;
		}

		const currentMethod = method;
		const currentSongs = songs;
		const { vectorSet } = dataset;

		if (currentSongs.length === 0) {
			status = "idle";
			return;
		}

		if (currentMethod === "feature") {
			cacheResult(key, {
				...EMPTY_RESULT,
				coordsByKey: buildFeatureAxesCoords(currentSongs)
			});
			return;
		}

		status = "computing";
		let active = true;

		void reduceOffMainThread(currentMethod, toMatrix(vectorSet.vectors))
			.then((reduction) => {
				if (!active) return;
				cacheResult(
					key,
					toEmbeddingResult(
						reduction,
						vectorSet.vectors.map((vector) => vector.songKey)
					)
				);
			})
			.catch(() => {
				if (active) status = "idle";
			});

		return () => {
			active = false;
		};
	});

	onDestroy(() => terminateReduceWorker());

	const setMethod = (nextMethod: EmbeddingMethod) => {
		if (nextMethod === method) return;
		method = nextMethod;
		config.onMethodChange?.(nextMethod);
	};

	const setOptions = (nextOptions: SongVectorOptions) => {
		options = nextOptions;
	};

	return {
		get method() {
			return method;
		},
		get options() {
			return options;
		},
		get status() {
			return status;
		},
		get vocabulary() {
			return vocabulary;
		},
		get vectorSet() {
			return dataset.vectorSet;
		},
		get result() {
			return resultCache.get(cacheKey) ?? EMPTY_RESULT;
		},
		setMethod,
		setOptions
	};
};

export type EmbeddingState = ReturnType<typeof createEmbeddingState>;
