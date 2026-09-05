import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import { trickySongsToMatchCorrectly } from "../../../../data/hand-reviewed-songs.js";
import { computeSongAlgoMetrics, type SongAlgoMetrics } from "./algoMetrics.js";
import {
	aggregateCorpusComparison,
	type CorpusComparison
} from "./compareCorpus.js";
import {
	getCachedV1MatchResult,
	getCachedV2MatchResult
} from "./matchResultCache.js";
import type { MatchWeights } from "./weights.js";

export const SONGS_PER_COMPARE_CHUNK = 12;
const YIELD_MS = 0;

export type SongPairMetrics = {
	songKey: string;
	v1: SongAlgoMetrics;
	v2: SongAlgoMetrics;
};

const yieldToMain = (): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, YIELD_MS);
	});

export const prioritizeSongsForComparison = (
	songs: GroupedSong[],
	priorityKeys: readonly string[]
): GroupedSong[] => {
	const priority = new Set(priorityKeys);
	return [
		...songs.filter((song) => priority.has(song.songKey)),
		...songs.filter((song) => !priority.has(song.songKey))
	];
};

const emptyComparison = (): CorpusComparison =>
	aggregateCorpusComparison([]);

export const createAlgoComparisonState = () => {
	let pairs = $state<SongPairMetrics[]>([]);
	let computedCount = $state(0);
	let totalCount = $state(0);
	let isComputing = $state(false);
	let requestId = 0;

	const comparison = $derived(
		pairs.length === 0 ? emptyComparison() : aggregateCorpusComparison(pairs)
	);

	const progressPercent = $derived(
		totalCount === 0 ? 0 : (computedCount / totalCount) * 100
	);

	const compute = async (
		songs: GroupedSong[],
		coreProgressions: CoreProgression[],
		weights: MatchWeights
	): Promise<void> => {
		const currentRequest = ++requestId;
		const ordered = prioritizeSongsForComparison(
			songs,
			trickySongsToMatchCorrectly.map((entry) => entry.id)
		);
		pairs = [];
		computedCount = 0;
		totalCount = ordered.length;
		isComputing = ordered.length > 0;

		const runChunk = async (
			offset: number,
			accumulated: SongPairMetrics[]
		): Promise<void> => {
			if (currentRequest !== requestId) return;
			if (offset >= ordered.length) {
				isComputing = false;
				return;
			}
			const chunk = ordered.slice(offset, offset + SONGS_PER_COMPARE_CHUNK);
			const chunkPairs = chunk.map((song) => {
				const v1 = computeSongAlgoMetrics(
					song,
					getCachedV1MatchResult(song, coreProgressions)
				);
				const v2 = computeSongAlgoMetrics(
					song,
					getCachedV2MatchResult(song, coreProgressions, weights)
				);
				return { songKey: song.songKey, v1, v2 };
			});
			const nextPairs = [...accumulated, ...chunkPairs];
			pairs = nextPairs;
			computedCount = nextPairs.length;
			await yieldToMain();
			await runChunk(offset + SONGS_PER_COMPARE_CHUNK, nextPairs);
		};

		await runChunk(0, []);
	};

	const cancel = (): void => {
		requestId += 1;
		isComputing = false;
	};

	return {
		get pairs() {
			return pairs;
		},
		get comparison() {
			return comparison;
		},
		get computedCount() {
			return computedCount;
		},
		get totalCount() {
			return totalCount;
		},
		get isComputing() {
			return isComputing;
		},
		get progressPercent() {
			return progressPercent;
		},
		compute,
		cancel
	};
};
