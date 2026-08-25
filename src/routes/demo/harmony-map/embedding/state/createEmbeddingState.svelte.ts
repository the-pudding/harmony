import { onDestroy } from "svelte";
import type { GroupedSong } from "../../../../../data/songBrowser.js";
import type { SongCoverageEntry } from "../../../define-chord-progression/compute-coverage-of-all-songs/index.js";
import {
	buildChordNgramVectors,
	buildChordNgramVocabulary,
	buildFeatureAxesCoords,
	buildProgressionVocabulary,
	buildSongVectors,
	computeMajornessScore,
	DEFAULT_SONG_VECTOR_OPTIONS,
	groupShareVectorForSong,
	toMatrix,
	type NgramSongInput,
	type SongVectorOptions,
	type SongVectorSet
} from "../vectors/index.js";
import {
	reduceOffMainThread,
	terminateReduceWorker,
	type ComponentLoading,
	type Coords,
	type EmbeddingMethod,
	type ReducerMethod,
	type ReductionResult
} from "../reducers/index.js";
import { buildEmbeddingCacheKey } from "./embeddingCacheKey.js";
import {
	getCachedEmbedding,
	setCachedEmbedding
} from "./embeddingResultCache.js";

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
	getSongs: () => GroupedSong[];
	getCoverageCacheKey: () => string | null;
	initialMethod: EmbeddingMethod;
	onMethodChange?: (method: EmbeddingMethod) => void;
};

const toNgramInput = (song: GroupedSong): NgramSongInput => ({
	songKey: song.songKey,
	sections: song.sections.map((section) => ({
		romanTokens: section.romanTokens,
		scale: section.scale
	}))
});

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
		const coverageCacheKey = config.getCoverageCacheKey();

		if (currentSongs.length === 0) {
			status = "idle";
			return;
		}

		let active = true;

		void (async () => {
			if (coverageCacheKey !== null) {
				const idbKey = await buildEmbeddingCacheKey(
					coverageCacheKey,
					currentMethod,
					options
				);
				if (!active) return;

				const cached = await getCachedEmbedding(idbKey);
				if (!active) return;

				if (cached) {
					cacheResult(key, cached);
					return;
				}
			}

			if (currentMethod === "feature") {
				const result: EmbeddingResult = {
					...EMPTY_RESULT,
					coordsByKey: buildFeatureAxesCoords(currentSongs)
				};
				cacheResult(key, result);
				if (coverageCacheKey !== null) {
					const idbKey = await buildEmbeddingCacheKey(
						coverageCacheKey,
						currentMethod,
						options
					);
					void setCachedEmbedding(idbKey, result);
				}
				return;
			}

			if (currentMethod === "scaleSplit") {
				status = "computing";
				const ngramInputs = config.getSongs().map(toNgramInput);
				const ngramVocabulary = buildChordNgramVocabulary(ngramInputs);
				const ngramVectors = buildChordNgramVectors(ngramInputs, ngramVocabulary);
				const majornessBySongKey = new Map(
					ngramInputs.map((input) => [
						input.songKey,
						computeMajornessScore(input)
					])
				);

				void reduceOffMainThread(
					"umap",
					ngramVectors.map((vector) => vector.weighted)
				)
					.then(async (reduction) => {
						if (!active) return;
						// Horizontal position is the deliberate majorness score;
						// vertical keeps only one of UMAP's two natural axes, since
						// the other is spoken for by scale.
						const coordsByKey = new Map(
							ngramVectors.map((vector, index) => [
								vector.songKey,
								{
									x: majornessBySongKey.get(vector.songKey) ?? 0,
									y: reduction.coords[index]?.x ?? 0
								}
							])
						);
						const result: EmbeddingResult = { ...EMPTY_RESULT, coordsByKey };
						cacheResult(key, result);
						if (coverageCacheKey !== null) {
							const idbKey = await buildEmbeddingCacheKey(
								coverageCacheKey,
								currentMethod,
								options
							);
							void setCachedEmbedding(idbKey, result);
						}
					})
					.catch(() => {
						if (active) status = "idle";
					});
				return;
			}

			// Every remaining method reduces via UMAP or PCA over some matrix —
			// they differ only in how that matrix is built. groupBlend reuses the
			// standard per-progression vectors already built above; ngram builds
			// its own independent vocabulary from raw chord sequences, so it
			// needs the underlying GroupedSong data instead.
			let reducerMethod: ReducerMethod = "umap";
			let matrix: number[][];
			let songKeys: string[];

			if (currentMethod === "groupBlend") {
				matrix = currentSongs.map((song) =>
					groupShareVectorForSong(song.progressionCounts)
				);
				songKeys = currentSongs.map((song) => song.songKey);
			} else if (currentMethod === "ngram") {
				const ngramInputs = config.getSongs().map(toNgramInput);
				const ngramVocabulary = buildChordNgramVocabulary(ngramInputs);
				const ngramVectors = buildChordNgramVectors(ngramInputs, ngramVocabulary);
				matrix = ngramVectors.map((vector) => vector.weighted);
				songKeys = ngramVectors.map((vector) => vector.songKey);
			} else {
				reducerMethod = currentMethod;
				matrix = toMatrix(vectorSet.vectors);
				songKeys = vectorSet.vectors.map((vector) => vector.songKey);
			}

			status = "computing";

			void reduceOffMainThread(reducerMethod, matrix)
				.then(async (reduction) => {
					if (!active) return;
					const result = toEmbeddingResult(reduction, songKeys);
					cacheResult(key, result);
					if (coverageCacheKey !== null) {
						const idbKey = await buildEmbeddingCacheKey(
							coverageCacheKey,
							currentMethod,
							options
						);
						void setCachedEmbedding(idbKey, result);
					}
				})
				.catch(() => {
					if (active) status = "idle";
				});
		})();

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
