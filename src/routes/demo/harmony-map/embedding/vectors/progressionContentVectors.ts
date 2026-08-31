import {
	CHORUS_MATCH_WEIGHT,
	DEFAULT_SONG_VECTOR_OPTIONS,
	MIN_GAP_DOCUMENT_FREQUENCY,
	type SongVectorOptions
} from "./constants.js";
import {
	inverseDocumentFrequency,
	type SongVector,
	type SongVectorSet
} from "./songVectors.js";
import type { SongProgressionCounts } from "./progressionVocabulary.js";
import { progressionContentKeys } from "./progressionContent.js";

type ContentVocabularyEntry = {
	key: string;
	index: number;
	documentFrequency: number;
};

type ContentVocabulary = {
	entries: ContentVocabularyEntry[];
	indexByKey: Map<string, number>;
	documentCount: number;
};

const buildContentVocabulary = (
	songs: readonly SongProgressionCounts[],
	minDocumentFrequency: number = MIN_GAP_DOCUMENT_FREQUENCY
): ContentVocabulary => {
	const documentFrequency = new Map<string, number>();

	for (const song of songs) {
		// Count each key once per song regardless of how many progressions produce it.
		const keysInSong = new Set<string>();
		for (const { chordProgression, scale } of song.progressionCounts) {
			for (const key of progressionContentKeys(chordProgression, scale)) {
				keysInSong.add(key);
			}
		}
		for (const key of keysInSong) {
			documentFrequency.set(key, (documentFrequency.get(key) ?? 0) + 1);
		}
	}

	const entries = [...documentFrequency.entries()]
		.filter(([, freq]) => freq >= minDocumentFrequency)
		.sort(([, a], [, b]) => b - a)
		.map(([key, freq], index) => ({ key, index, documentFrequency: freq }));

	return {
		entries,
		indexByKey: new Map(entries.map((e) => [e.key, e.index])),
		documentCount: songs.length
	};
};

const l2Normalize = (values: number[]): number[] => {
	const norm = Math.sqrt(values.reduce((s, v) => s + v * v, 0));
	return norm === 0 ? values : values.map((v) => v / norm);
};

const termWeight = (count: number, weighting: string): number =>
	weighting === "binary" ? (count > 0 ? 1 : 0) : count;

// Accumulates content key counts for one song, respecting chorus weighting.
// Unlike the progression identity vectors where each dimension is a named
// progression, each dimension here is a shared content key (e.g. a cyclic gram
// or degree-set token) that multiple progressions can contribute to, so songs
// with similar harmonic motion naturally get similar vectors.
const buildContentVector = (
	song: SongProgressionCounts,
	vocabulary: ContentVocabulary,
	idfs: number[],
	options: SongVectorOptions
): SongVector => {
	const rawCounts = new Map<number, number>();

	for (const {
		chordProgression,
		scale,
		matchCount,
		chorusMatchCount
	} of song.progressionCounts) {
		const effective =
			matchCount +
			(options.weightChorus ? chorusMatchCount * (CHORUS_MATCH_WEIGHT - 1) : 0);
		for (const key of progressionContentKeys(chordProgression, scale)) {
			const idx = vocabulary.indexByKey.get(key);
			if (idx === undefined) continue;
			rawCounts.set(idx, (rawCounts.get(idx) ?? 0) + effective);
		}
	}

	const counts = vocabulary.entries.map(({ index }) =>
		termWeight(rawCounts.get(index) ?? 0, options.weighting)
	);
	const scaled = options.useTfIdf
		? counts.map((c, i) => c * (idfs[i] ?? 1))
		: counts;

	return {
		songKey: song.songKey,
		counts,
		weighted: options.l2Normalize ? l2Normalize(scaled) : scaled
	};
};

export const buildProgressionContentVectors = (
	songs: readonly SongProgressionCounts[],
	options: SongVectorOptions = DEFAULT_SONG_VECTOR_OPTIONS
): SongVectorSet => {
	const vocabulary = buildContentVocabulary(songs);
	const idfs = vocabulary.entries.map((e) =>
		inverseDocumentFrequency(vocabulary.documentCount, e.documentFrequency)
	);
	const vectors = songs.map((song) =>
		buildContentVector(song, vocabulary, idfs, options)
	);
	return {
		vectors,
		vectorBySongKey: new Map(vectors.map((v) => [v.songKey, v])),
		inverseDocumentFrequencies: idfs,
		options
	};
};
