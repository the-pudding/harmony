import { inverseDocumentFrequency, type SongVector } from "./songVectors.js";
import {
	countGramsForSong,
	type ChordNgramVocabulary,
	type NgramSongInput
} from "./chordNgramVocabulary.js";

const l2Normalize = (values: number[]): number[] => {
	const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
	return norm === 0 ? values : values.map((value) => value / norm);
};

// Same TF-IDF + L2-normalize formula as the standard progression vectors
// (songVectors.ts), just over the chord-gram vocabulary instead of the
// named-progression one — independent of core-progressions.ts entirely.
export const buildChordNgramVectors = (
	songs: readonly NgramSongInput[],
	vocabulary: ChordNgramVocabulary
): SongVector[] => {
	const inverseDocumentFrequencies = vocabulary.entries.map((entry) =>
		inverseDocumentFrequency(vocabulary.documentCount, entry.documentFrequency)
	);

	return songs.map((song) => {
		const gramCounts = countGramsForSong(song);
		const counts = vocabulary.entries.map(
			(entry) => gramCounts.get(entry.gram) ?? 0
		);
		const scaled = counts.map((count, index) => count * inverseDocumentFrequencies[index]);
		return {
			songKey: song.songKey,
			counts,
			weighted: l2Normalize(scaled)
		};
	});
};
