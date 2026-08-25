import type { ScaleName } from "../../../../../chord-processing/scales.js";

// Bigrams and trigrams only — long enough to capture real chord-to-chord
// motion (ii→V, V→I), short enough to keep the vocabulary small and the
// signal about immediate transitions rather than whole progressions.
export const NGRAM_MIN_LENGTH = 2;
export const NGRAM_MAX_LENGTH = 3;

// Matches the existing MIN_GAP_DOCUMENT_FREQUENCY precedent for gap-fill
// progressions — a gram that only ever occurs in a couple of songs is noise,
// not a real recurring transition.
export const MIN_NGRAM_DOCUMENT_FREQUENCY = 4;

export type NgramSongSection = { romanTokens: string[]; scale: ScaleName };
export type NgramSongInput = { songKey: string; sections: NgramSongSection[] };

export type ChordNgramVocabularyEntry = {
	gram: string;
	index: number;
	documentFrequency: number;
};

export type ChordNgramVocabulary = {
	entries: ChordNgramVocabularyEntry[];
	indexByGram: Map<string, number>;
	documentCount: number;
};

// Scale-qualified so a major "I-IV" and a minor "i-iv" (case already
// distinguishes quality, but not scale context) never collide, and so
// direction is preserved — "ii-V" and "V-ii" are different grams, since
// chord direction is real harmonic information a bag-of-grams shouldn't
// throw away.
const gramsForSection = (section: NgramSongSection): string[] => {
	const { romanTokens, scale } = section;
	const grams: string[] = [];
	for (let length = NGRAM_MIN_LENGTH; length <= NGRAM_MAX_LENGTH; length++) {
		for (let start = 0; start + length <= romanTokens.length; start++) {
			grams.push(`${scale}:${romanTokens.slice(start, start + length).join("-")}`);
		}
	}
	return grams;
};

export const countGramsForSong = (song: NgramSongInput): Map<string, number> => {
	const counts = new Map<string, number>();
	for (const section of song.sections) {
		for (const gram of gramsForSection(section)) {
			counts.set(gram, (counts.get(gram) ?? 0) + 1);
		}
	}
	return counts;
};

export const buildChordNgramVocabulary = (
	songs: readonly NgramSongInput[],
	minDocumentFrequency: number = MIN_NGRAM_DOCUMENT_FREQUENCY
): ChordNgramVocabulary => {
	const documentFrequency = new Map<string, number>();
	for (const song of songs) {
		for (const gram of countGramsForSong(song).keys()) {
			documentFrequency.set(gram, (documentFrequency.get(gram) ?? 0) + 1);
		}
	}

	const entries = [...documentFrequency.entries()]
		.filter(([, frequency]) => frequency >= minDocumentFrequency)
		.sort(
			(first, second) => second[1] - first[1] || first[0].localeCompare(second[0])
		)
		.map(([gram, frequency], index) => ({
			gram,
			index,
			documentFrequency: frequency
		}));

	return {
		entries,
		indexByGram: new Map(entries.map((entry) => [entry.gram, entry.index])),
		documentCount: songs.length
	};
};
