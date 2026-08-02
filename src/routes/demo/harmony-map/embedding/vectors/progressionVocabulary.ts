import type { SongProgressionCount } from "../../../define-chord-progression/compute-coverage-of-all-songs/index.js";
import { MIN_GAP_DOCUMENT_FREQUENCY } from "./constants.js";
import {
	canonicalProgressionKey,
	coreProgressionIdentityFor
} from "./coreProgressionIdentity.js";

export type SongProgressionCounts = {
	songKey: string;
	progressionCounts: SongProgressionCount[];
};

export type ProgressionVocabularyEntry = {
	chordProgression: string;
	name: string;
	variants: string[];
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

// Sibling variants of one named core progression share a dimension, so a song
// matching both I-V-vi-IV and I-V-vi counts once here and sums its occurrences
// in songVectors — otherwise one musical idea would split across two axes and
// each half would look artificially rare to IDF.
const accumulateDocumentFrequencies = (
	songs: readonly SongProgressionCounts[]
): Map<string, ProgressionStats> =>
	songs.reduce((stats, song) => {
		const seenInSong = new Set<string>();
		song.progressionCounts.forEach(({ chordProgression, isCore }) => {
			const key = canonicalProgressionKey(chordProgression);
			if (seenInSong.has(key)) return;
			seenInSong.add(key);
			const previous = stats.get(key);
			stats.set(key, {
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
		.map(([chordProgression, { isCore, documentFrequency }]) => {
			const identity = coreProgressionIdentityFor(chordProgression);
			return {
				chordProgression,
				name: identity?.name ?? "",
				variants: identity?.variants ?? [chordProgression],
				isCore,
				documentFrequency
			};
		})
		.filter(
			(entry) =>
				entry.isCore || entry.documentFrequency >= minGapDocumentFrequency
		)
		.sort(byCoreThenFrequency)
		.map((entry, index) => ({ ...entry, index }));

	return {
		entries,
		// Every variant resolves to its shared dimension, so callers can look up
		// by whichever variant the matcher happened to select.
		indexByChordProgression: new Map(
			entries.flatMap((entry) =>
				entry.variants.map((variant): [string, number] => [
					variant,
					entry.index
				])
			)
		),
		documentCount: songs.length
	};
};
