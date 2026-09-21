import { onDestroy } from "svelte";
import type { GroupedSong } from "../../../../../data/songBrowser.js";
import type { SongCoverageEntry } from "../../../define-chord-progression/compute-coverage-of-all-songs/index.js";
import {
	buildBlendedMatrix,
	buildChordNgramVectors,
	buildChordNgramVocabulary,
	buildFeatureAxesCoords,
	buildProgressionContentVectors,
	buildProgressionVocabulary,
	buildSongVectors,
	computeMajornessScore,
	DEFAULT_BLEND_WEIGHTS,
	DEFAULT_SONG_VECTOR_OPTIONS,
	EMPTY_SONG_VECTOR_SET,
	GLOBAL_STRUCTURE_NEIGHBOR_COUNT,
	GROUP_BLEND_WEIGHTS,
	dominantGroupName,
	progressionGroupProfileByName,
	toMatrix,
	type BlendWeights,
	type NgramSongInput,
	type SongVectorOptions,
	type SongVectorSet
} from "../vectors/index.js";
import {
	alignCoordsToReferenceByAngleSearch,
	orientCoords,
	PROGRESSION_REFERENCE_METHOD,
	reduceOffMainThread,
	terminateReduceWorker,
	PCA_COMPONENT_COUNT_3D,
	UMAP_COMPONENT_COUNT_2D,
	UMAP_COMPONENT_COUNT_3D,
	type ComponentLoading,
	type Coords,
	type EmbeddingDimension,
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
	alignmentRotationDegrees: number | null;
};

const EMPTY_RESULT: EmbeddingResult = {
	coordsByKey: new Map(),
	componentLoadings: null,
	explainedVariance: null,
	alignmentRotationDegrees: null
};

const METHODS_ALIGNED_TO_PROGRESSION = new Set<EmbeddingMethod>([
	"ngram",
	"blend"
]);

const progressionCacheKeyFor = (
	datasetToken: string,
	currentDimension: EmbeddingDimension
): string => `${datasetToken}|${PROGRESSION_REFERENCE_METHOD}|${currentDimension}|`;

type EmbeddingStateConfig = {
	getEntries: () => SongCoverageEntry[] | null;
	getSongs: () => GroupedSong[];
	getCoverageCacheKey: () => string | null;
	initialMethod: EmbeddingMethod;
	initialBlendWeights?: BlendWeights;
	onMethodChange?: (method: EmbeddingMethod) => void;
	onBlendWeightsChange?: (weights: BlendWeights) => void;
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
	songKeys: readonly string[],
	alignmentRotationDegrees: number | null = null
): EmbeddingResult => ({
	coordsByKey: new Map(
		result.coords.map((coords, index) => [songKeys[index], coords])
	),
	componentLoadings: result.componentLoadings,
	explainedVariance: result.explainedVariance,
	alignmentRotationDegrees
});

const withOnlyCurrentDataset = (
	cache: Map<string, EmbeddingResult>,
	datasetToken: string
): Map<string, EmbeddingResult> =>
	new Map(
		[...cache.entries()].filter(([key]) => key.startsWith(`${datasetToken}|`))
	);

const reducerComponentCount = (targetDimension: EmbeddingDimension): number =>
	targetDimension === 3 ? PCA_COMPONENT_COUNT_3D : UMAP_COMPONENT_COUNT_2D;

const persistEmbedding = async (
	coverageCacheKey: string | null,
	currentMethod: EmbeddingMethod,
	currentDimension: EmbeddingDimension,
	currentOptions: SongVectorOptions,
	currentBlendWeights: BlendWeights | undefined,
	key: string,
	result: EmbeddingResult,
	cacheResult: (key: string, result: EmbeddingResult) => void
) => {
	cacheResult(key, result);
	if (coverageCacheKey !== null) {
		const idbKey = await buildEmbeddingCacheKey(
			coverageCacheKey,
			currentMethod,
			currentOptions,
			currentDimension,
			currentBlendWeights
		);
		void setCachedEmbedding(idbKey, result);
	}
};

// Each song's dominant editorial group as an integer index for supervised UMAP.
// Songs without a core group match get -1 (treated as "unknown" by umap-js).
const supervisedLabel = (song: SongCoverageEntry): number => {
	const groupName = dominantGroupName(song.progressionCounts);
	if (!groupName) return -1;
	return progressionGroupProfileByName.get(groupName)?.index ?? -1;
};

export const EMBEDDING_COMPUTING_STEPS = ["Building vectors…", "Running UMAP…"] as const;

export const createEmbeddingState = (config: EmbeddingStateConfig) => {
	let method = $state<EmbeddingMethod>(config.initialMethod);
	let dimension = $state<EmbeddingDimension>(2);
	let options = $state<SongVectorOptions>(DEFAULT_SONG_VECTOR_OPTIONS);
	let blendWeights = $state<BlendWeights>(
		config.initialBlendWeights ?? DEFAULT_BLEND_WEIGHTS
	);
	let resultCache = $state(new Map<string, EmbeddingResult>());
	let status = $state<EmbeddingStatus>("idle");
	let computingStep = $state<string | null>(null);

	let datasetSequence = 0;

	const songs = $derived(config.getEntries() ?? []);
	const vocabulary = $derived(buildProgressionVocabulary(songs));

	const dataset = $derived.by(
		(): { token: string; vectorSet: SongVectorSet } => ({
			token: `dataset-${++datasetSequence}`,
			vectorSet: buildSongVectors(songs, vocabulary, options)
		})
	);

	// Only blend method includes weights in the cache key; content method uses
	// only the standard options and does not read blendWeights.
	const blendCacheComponent = $derived(
		method === "blend" ? JSON.stringify(blendWeights) : ""
	);
	const cacheKey = $derived(
		`${dataset.token}|${method}|${dimension}|${blendCacheComponent}`
	);

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
		const currentDimension = dimension;
		const currentSongs = songs;
		const { token: datasetToken, vectorSet } = dataset;
		const coverageCacheKey = config.getCoverageCacheKey();
		const currentBlendWeights = blendWeights;
		const currentOptions = options;

		if (currentSongs.length === 0) {
			status = "idle";
			return;
		}

		let active = true;

		const blendWeightsForCache =
			currentMethod === "blend" ? currentBlendWeights : undefined;

		void (async () => {
			const ensureProgressionCoords = async (): Promise<Map<
				string,
				Coords
			> | null> => {
				const progressionKey = progressionCacheKeyFor(
					datasetToken,
					currentDimension
				);
				const fromMemory = resultCache.get(progressionKey);
				if (fromMemory) return fromMemory.coordsByKey;

				if (coverageCacheKey !== null) {
					const idbKey = await buildEmbeddingCacheKey(
						coverageCacheKey,
						PROGRESSION_REFERENCE_METHOD,
						currentOptions,
						currentDimension,
						undefined
					);
					if (!active) return null;
					const cached = await getCachedEmbedding(idbKey);
					if (!active) return null;
					if (cached) {
						cacheResult(progressionKey, {
							...cached,
							alignmentRotationDegrees: cached.alignmentRotationDegrees ?? 0
						});
						return cached.coordsByKey;
					}
				}

				const matrix = toMatrix(vectorSet.vectors);
				const songKeys = vectorSet.vectors.map((vector) => vector.songKey);
				try {
					const reduction = await reduceOffMainThread(
						"umap",
						matrix,
						reducerComponentCount(currentDimension)
					);
					if (!active) return null;
					const progressionResult = toEmbeddingResult(reduction, songKeys, 0);
					await persistEmbedding(
						coverageCacheKey,
						PROGRESSION_REFERENCE_METHOD,
						currentDimension,
						currentOptions,
						undefined,
						progressionKey,
						progressionResult,
						cacheResult
					);
					return progressionResult.coordsByKey;
				} catch {
					return null;
				}
			};

			const alignToProgressionIfNeeded = async (
				coordsByKey: Map<string, Coords>
			): Promise<Pick<EmbeddingResult, "coordsByKey" | "alignmentRotationDegrees">> => {
				if (
					currentDimension !== 2 ||
					!METHODS_ALIGNED_TO_PROGRESSION.has(currentMethod)
				) {
					return {
						coordsByKey,
						alignmentRotationDegrees:
							currentMethod === PROGRESSION_REFERENCE_METHOD ? 0 : null
					};
				}

				const referenceCoords = await ensureProgressionCoords();
				if (!active || referenceCoords === null) {
					return { coordsByKey, alignmentRotationDegrees: null };
				}

				const aligned = alignCoordsToReferenceByAngleSearch(
					coordsByKey,
					referenceCoords
				);
				return {
					coordsByKey: aligned.coordsByKey,
					alignmentRotationDegrees: aligned.rotationDegrees
				};
			};

			if (coverageCacheKey !== null) {
				const idbKey = await buildEmbeddingCacheKey(
					coverageCacheKey,
					currentMethod,
					currentOptions,
					currentDimension,
					blendWeightsForCache
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
				if (currentDimension === 2) {
					const result: EmbeddingResult = {
						...EMPTY_RESULT,
						coordsByKey: buildFeatureAxesCoords(currentSongs)
					};
					await persistEmbedding(
						coverageCacheKey,
						currentMethod,
						currentDimension,
						currentOptions,
						undefined,
						key,
						result,
						cacheResult
					);
					return;
				}

				status = "computing";
				const featureCoords = buildFeatureAxesCoords(currentSongs);
				const matrix = toMatrix(vectorSet.vectors);
				void reduceOffMainThread("pca", matrix, 1)
					.then(async (reduction) => {
						if (!active) return;
						const coordsByKey = new Map(
							vectorSet.vectors.map((vector, index) => {
								const axes = featureCoords.get(vector.songKey);
								return [
									vector.songKey,
									{
										x: axes?.x ?? 0,
										y: axes?.y ?? 0,
										z: reduction.coords[index]?.x ?? 0
									}
								];
							})
						);
						const result: EmbeddingResult = { ...EMPTY_RESULT, coordsByKey };
						await persistEmbedding(
							coverageCacheKey,
							currentMethod,
							currentDimension,
							currentOptions,
							undefined,
							key,
							result,
							cacheResult
						);
					})
					.catch(() => {
						if (active) status = "idle";
					});
				return;
			}

			if (currentMethod === "scaleSplit") {
				status = "computing";
				const ngramInputs = config.getSongs().map(toNgramInput);
				const ngramVocabulary = buildChordNgramVocabulary(ngramInputs);
				const ngramVectors = buildChordNgramVectors(
					ngramInputs,
					ngramVocabulary
				);
				const majornessBySongKey = new Map(
					ngramInputs.map((input) => [
						input.songKey,
						computeMajornessScore(input)
					])
				);
				const umapComponentCount = UMAP_COMPONENT_COUNT_2D;

				void reduceOffMainThread(
					"umap",
					ngramVectors.map((vector) => vector.weighted),
					umapComponentCount
				)
					.then(async (reduction) => {
						if (!active) return;
						const coordsByKey = new Map(
							ngramVectors.map((vector, index) => {
								const umapCoords = reduction.coords[index];
								return [
									vector.songKey,
									currentDimension === 3
										? {
												x: majornessBySongKey.get(vector.songKey) ?? 0,
												y: umapCoords?.x ?? 0,
												z: umapCoords?.y ?? 0
											}
										: {
												x: majornessBySongKey.get(vector.songKey) ?? 0,
												y: umapCoords?.x ?? 0
											}
								];
							})
						);
						const result: EmbeddingResult = { ...EMPTY_RESULT, coordsByKey };
						await persistEmbedding(
							coverageCacheKey,
							currentMethod,
							currentDimension,
							currentOptions,
							undefined,
							key,
							result,
							cacheResult
						);
					})
					.catch(() => {
						if (active) status = "idle";
					});
				return;
			}

		if (currentMethod === "content") {
			status = "computing";
			computingStep = EMBEDDING_COMPUTING_STEPS[0];
			const contentVectors = buildProgressionContentVectors(
				currentSongs,
				currentOptions
			);
			computingStep = EMBEDDING_COMPUTING_STEPS[1];
			void reduceOffMainThread(
				"umap",
				contentVectors.vectors.map((v) => v.weighted),
				reducerComponentCount(currentDimension),
				{
					nNeighbors: GLOBAL_STRUCTURE_NEIGHBOR_COUNT
				}
			)
				.then(async (reduction) => {
					if (!active) return;
					computingStep = null;
					const songKeys = contentVectors.vectors.map((v) => v.songKey);
					const rawCoords = new Map(
						songKeys.map((key, i) => [
							key,
							reduction.coords[i] ?? { x: 0, y: 0 }
						])
					);
					const featureAxesCoords = buildFeatureAxesCoords(currentSongs);
					const coordsByKey =
						currentDimension === 2
							? orientCoords(rawCoords, featureAxesCoords)
							: rawCoords;
					const result: EmbeddingResult = { ...EMPTY_RESULT, coordsByKey };
					await persistEmbedding(
						coverageCacheKey,
						currentMethod,
						currentDimension,
						currentOptions,
						undefined,
						key,
						result,
						cacheResult
					);
				})
				.catch(() => {
					if (active) {
						status = "idle";
						computingStep = null;
					}
				});
			return;
		}

		// blend blends four user-weighted feature families via UMAP; groupBlend
		// is a fixed point in that same weight space (identity + group share
		// only) — content vectors are skipped there since their weight is 0.
		if (currentMethod === "blend" || currentMethod === "groupBlend") {
			status = "computing";
			computingStep = EMBEDDING_COMPUTING_STEPS[0];
			const activeBlendWeights =
				currentMethod === "groupBlend" ? GROUP_BLEND_WEIGHTS : currentBlendWeights;
			const contentVectors =
				activeBlendWeights.content > 0
					? buildProgressionContentVectors(currentSongs, currentOptions)
					: EMPTY_SONG_VECTOR_SET;
			const { matrix, songKeys } = buildBlendedMatrix(
				currentSongs,
				vectorSet,
				contentVectors,
				activeBlendWeights
			);
			const supervisedLabels =
				activeBlendWeights.groupPull > 0
					? currentSongs.map(supervisedLabel)
					: undefined;
			computingStep = EMBEDDING_COMPUTING_STEPS[1];
			void reduceOffMainThread(
				"umap",
				matrix,
				reducerComponentCount(currentDimension),
				{
					nNeighbors: GLOBAL_STRUCTURE_NEIGHBOR_COUNT,
					supervisedLabels,
					supervisedWeight: activeBlendWeights.groupPull
				}
			)
				.then(async (reduction) => {
					if (!active) return;
					computingStep = null;
					const rawCoords = new Map(
						songKeys.map((key, i) => [
							key,
							reduction.coords[i] ?? { x: 0, y: 0 }
						])
					);
					const featureOrientedCoords =
						currentMethod === "groupBlend" && currentDimension === 2
							? orientCoords(rawCoords, buildFeatureAxesCoords(currentSongs))
							: rawCoords;
					const aligned = await alignToProgressionIfNeeded(featureOrientedCoords);
					if (!active) return;
					const result: EmbeddingResult = {
						...EMPTY_RESULT,
						coordsByKey: aligned.coordsByKey,
						alignmentRotationDegrees: aligned.alignmentRotationDegrees
					};
					await persistEmbedding(
						coverageCacheKey,
						currentMethod,
						currentDimension,
						currentOptions,
						currentMethod === "blend" ? currentBlendWeights : undefined,
						key,
						result,
						cacheResult
					);
				})
				.catch(() => {
					if (active) {
						status = "idle";
						computingStep = null;
					}
				});
			return;
		}

			// All remaining methods reduce via UMAP or PCA over some matrix.
			// ngram builds its own independent vocabulary from raw chord sequences.
			let reducerMethod: ReducerMethod = "umap";
			let matrix: number[][];
			let songKeys: string[];

			if (currentMethod === "ngram") {
				const ngramInputs = config.getSongs().map(toNgramInput);
				const ngramVocabulary = buildChordNgramVocabulary(ngramInputs);
				const ngramVectors = buildChordNgramVectors(
					ngramInputs,
					ngramVocabulary
				);
				matrix = ngramVectors.map((vector) => vector.weighted);
				songKeys = ngramVectors.map((vector) => vector.songKey);
			} else {
				reducerMethod = currentMethod;
				matrix = toMatrix(vectorSet.vectors);
				songKeys = vectorSet.vectors.map((vector) => vector.songKey);
			}

			status = "computing";

			void reduceOffMainThread(
				reducerMethod,
				matrix,
				reducerComponentCount(currentDimension)
			)
				.then(async (reduction) => {
					if (!active) return;
					const rawResult = toEmbeddingResult(reduction, songKeys);
					const aligned = await alignToProgressionIfNeeded(rawResult.coordsByKey);
					if (!active) return;
					const result: EmbeddingResult = {
						...rawResult,
						coordsByKey: aligned.coordsByKey,
						alignmentRotationDegrees:
							currentMethod === PROGRESSION_REFERENCE_METHOD
								? 0
								: aligned.alignmentRotationDegrees
					};
					await persistEmbedding(
						coverageCacheKey,
						currentMethod,
						currentDimension,
						currentOptions,
						undefined,
						key,
						result,
						cacheResult
					);
				})
				.catch(() => {
					if (active) status = "idle";
				});
		})();

		return () => {
			active = false;
			computingStep = null;
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

	const setDimension = (nextDimension: EmbeddingDimension) => {
		if (nextDimension === dimension) return;
		dimension = nextDimension;
	};

	const setBlendWeights = (nextWeights: BlendWeights) => {
		blendWeights = nextWeights;
		config.onBlendWeightsChange?.(nextWeights);
	};

	return {
		get method() {
			return method;
		},
		get dimension() {
			return dimension;
		},
		get options() {
			return options;
		},
		get blendWeights() {
			return blendWeights;
		},
		get status() {
			return status;
		},
		get computingStep() {
			return computingStep;
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
		setDimension,
		setOptions,
		setBlendWeights
	};
};;

export type EmbeddingState = ReturnType<typeof createEmbeddingState>;
