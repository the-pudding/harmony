import type { SongProgressionCount } from "../../../define-chord-progression/compute-coverage-of-all-songs/index.js";
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
	// Every literal spelling actually observed for this name, including
	// un-authored rotations (e.g. "V-IV-I" for "sweet home mixolydian") —
	// matching is tonic-rotation-invariant, so a song's own literal
	// chordProgression string doesn't always match one of the progression's
	// authored `variants`, but it must still resolve to this dimension.
	observedSpellings: Set<string>;
};

// Grouped by canonical name (rotation-proof — see SongProgressionCount.name)
// rather than literal spelling, so a song matching two differently-spelled
// occurrences of the same named progression counts once here and sums its
// occurrences in songVectors — otherwise one musical idea would split across
// multiple axes and each fragment would look artificially rare to IDF.
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
		// Every variant (authored or an observed rotation) resolves to its
		// shared dimension, so callers can look up by whichever spelling the
		// matcher happened to select for a given song.
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
