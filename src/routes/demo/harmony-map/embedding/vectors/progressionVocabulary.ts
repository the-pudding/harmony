import type { SongProgressionCount } from "../../../define-chord-progression/compute-coverage-of-all-songs/index.js";
import { MIN_GAP_DOCUMENT_FREQUENCY } from "./constants.js";

export type SongProgressionCounts = {
	songKey: string;
	progressionCounts: SongProgressionCount[];
};

export type ProgressionVocabularyEntry = {
	chordProgression: string;
	index: number;
	isCore: boolean;
	documentFrequency: number;
};

export type ProgressionVocabulary = {
	entries: ProgressionVocabularyEntry[];
	indexByChordProgression: Map<string, number>;
	documentCount: number;
};

type ProgressionStats = { isCore: boolean; documentFrequency: number };

const accumulateDocumentFrequencies = (
	songs: readonly SongProgressionCounts[]
): Map<string, ProgressionStats> =>
	songs.reduce((stats, song) => {
		const seenInSong = new Set<string>();
		song.progressionCounts.forEach(({ chordProgression, isCore }) => {
			if (seenInSong.has(chordProgression)) return;
			seenInSong.add(chordProgression);
			const previous = stats.get(chordProgression);
			stats.set(chordProgression, {
				isCore: (previous?.isCore ?? false) || isCore,
				documentFrequency: (previous?.documentFrequency ?? 0) + 1
			});
		});
		return stats;
	}, new Map<string, ProgressionStats>());

const byCoreThenFrequency = (
	first: Omit<ProgressionVocabularyEntry, "index">,
	second: Omit<ProgressionVocabularyEntry, "index">
): number =>
	Number(second.isCore) - Number(first.isCore) ||
	second.documentFrequency - first.documentFrequency ||
	first.chordProgression.localeCompare(second.chordProgression);

export const buildProgressionVocabulary = (
	songs: readonly SongProgressionCounts[],
	minGapDocumentFrequency: number = MIN_GAP_DOCUMENT_FREQUENCY
): ProgressionVocabulary => {
	const stats = accumulateDocumentFrequencies(songs);

	const entries = [...stats.entries()]
		.map(([chordProgression, { isCore, documentFrequency }]) => ({
			chordProgression,
			isCore,
			documentFrequency
		}))
		.filter(
			(entry) =>
				entry.isCore || entry.documentFrequency >= minGapDocumentFrequency
		)
		.sort(byCoreThenFrequency)
		.map((entry, index) => ({ ...entry, index }));

	return {
		entries,
		indexByChordProgression: new Map(
			entries.map((entry) => [entry.chordProgression, entry.index])
		),
		documentCount: songs.length
	};
};
