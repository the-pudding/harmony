import type { SongProgressionCount } from "../../../../routes/demo/define-chord-progression/compute-coverage-of-all-songs/index.js";
import { MIN_GAP_DOCUMENT_FREQUENCY } from "./constants.js";
import { coreProgressionIdentityForName } from "./coreProgressionIdentity.js";

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

type ProgressionStats = {
	isCore: boolean;
	documentFrequency: number;
	// Every literal spelling observed for this canonical name (authored
	// variants plus triad-folded or other matcher output) — all must map to
	// the same vocabulary dimension.
	observedSpellings: Set<string>;
};

// Grouped by canonical name (see SongProgressionCount.name) rather than
// literal spelling, so differently-spelled matches of the same core count
// once for document frequency and share one embedding axis.
const accumulateDocumentFrequencies = (
	songs: readonly SongProgressionCounts[]
): Map<string, ProgressionStats> =>
	songs.reduce((stats, song) => {
		const seenInSong = new Set<string>();
		song.progressionCounts.forEach(({ chordProgression, name, isCore }) => {
			if (!seenInSong.has(name)) {
				seenInSong.add(name);
				const previous = stats.get(name);
				stats.set(name, {
					isCore: (previous?.isCore ?? false) || isCore,
					documentFrequency: (previous?.documentFrequency ?? 0) + 1,
					observedSpellings: previous?.observedSpellings ?? new Set()
				});
			}
			stats.get(name)!.observedSpellings.add(chordProgression);
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
		.map(([name, { isCore, documentFrequency, observedSpellings }]) => {
			const identity = coreProgressionIdentityForName(name);
			const variants = [
				...new Set([...(identity?.variants ?? []), ...observedSpellings])
			];
			return {
				chordProgression: identity?.canonicalKey ?? name,
				name,
				variants,
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
		// Every listed variant resolves to the same dimension, so callers can
		// look up by whichever spelling the matcher selected for a song.
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
