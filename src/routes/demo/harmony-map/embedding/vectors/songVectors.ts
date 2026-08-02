import {
	DEFAULT_SONG_VECTOR_OPTIONS,
	type ProgressionWeighting,
	type SongVectorOptions
} from "./constants.js";
import type {
	ProgressionVocabulary,
	SongProgressionCounts
} from "./progressionVocabulary.js";

export type SongVector = {
	songKey: string;
	counts: number[];
	weighted: number[];
};

export type SongVectorSet = {
	vectors: SongVector[];
	vectorBySongKey: Map<string, SongVector>;
	inverseDocumentFrequencies: number[];
	options: SongVectorOptions;
};

const termWeight = (
	matchCount: number,
	weighting: ProgressionWeighting
): number => (weighting === "binary" ? (matchCount > 0 ? 1 : 0) : matchCount);

export const inverseDocumentFrequency = (
	documentCount: number,
	documentFrequency: number
): number => Math.log((documentCount + 1) / (documentFrequency + 1)) + 1;

const buildInverseDocumentFrequencies = (
	vocabulary: ProgressionVocabulary
): number[] =>
	vocabulary.entries.map((entry) =>
		inverseDocumentFrequency(vocabulary.documentCount, entry.documentFrequency)
	);

// Sibling variants of one named core progression share a vocabulary index, so
// their occurrences sum into a single dimension rather than splitting across two.
const occurrencesByIndex = (
	song: SongProgressionCounts,
	vocabulary: ProgressionVocabulary
): Map<number, number> =>
	song.progressionCounts.reduce((counts, { chordProgression, matchCount }) => {
		const index = vocabulary.indexByChordProgression.get(chordProgression);
		if (index === undefined) return counts;
		return counts.set(index, (counts.get(index) ?? 0) + matchCount);
	}, new Map<number, number>());

const l2Normalized = (values: number[]): number[] => {
	const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
	return norm === 0 ? values : values.map((value) => value / norm);
};

const buildSongVector = (
	song: SongProgressionCounts,
	vocabulary: ProgressionVocabulary,
	inverseDocumentFrequencies: number[],
	options: SongVectorOptions
): SongVector => {
	const occurrences = occurrencesByIndex(song, vocabulary);
	const counts = vocabulary.entries.map(({ index }) =>
		termWeight(occurrences.get(index) ?? 0, options.weighting)
	);
	const scaled = options.useTfIdf
		? counts.map((count, index) => count * inverseDocumentFrequencies[index])
		: counts;

	return {
		songKey: song.songKey,
		counts,
		weighted: options.l2Normalize ? l2Normalized(scaled) : scaled
	};
};

export const buildSongVectors = (
	songs: readonly SongProgressionCounts[],
	vocabulary: ProgressionVocabulary,
	options: SongVectorOptions = DEFAULT_SONG_VECTOR_OPTIONS
): SongVectorSet => {
	const inverseDocumentFrequencies =
		buildInverseDocumentFrequencies(vocabulary);
	const vectors = songs.map((song) =>
		buildSongVector(song, vocabulary, inverseDocumentFrequencies, options)
	);

	return {
		vectors,
		vectorBySongKey: new Map(vectors.map((vector) => [vector.songKey, vector])),
		inverseDocumentFrequencies,
		options
	};
};

export const toMatrix = (vectors: readonly SongVector[]): number[][] =>
	vectors.map((vector) => vector.weighted);
