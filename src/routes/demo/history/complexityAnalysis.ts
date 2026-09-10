import type { GroupedSong } from "../../../data/songBrowser.js";
import { isNonDiatonicToken } from "../../../chord-processing/diatonicQuality.js";
import { parseRomanToken } from "../../../chord-processing/romanNumerals.js";
import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import { decadeOf } from "./decadeSignatures.js";

// Mirrors the sample-size guards used elsewhere on this page.
const MIN_DECADE_SONG_COUNT = 20;

// -- Chord vocabulary & non-diatonic rate: per-song, per-token, no matching -

export type ChordComplexityDecadeRow = {
	decade: number;
	songCount: number;
	avgDistinctChords: number;
	nonDiatonicTokenPercent: number;
	songsWithNonDiatonicPercent: number;
};

// Distinct-chord counting cares about degree/quality/accidental, not
// extensions (7ths, sus, add) — "V7" and "V" are "the same chord" for this
// purpose, so canonicalize via the parsed token rather than the raw string.
const canonicalChordKey = (token: string): string | null => {
	const parsed = parseRomanToken(token);
	if (!parsed) return null;
	return `${parsed.flat ? "b" : ""}${parsed.sharp ? "#" : ""}${parsed.degree}-${parsed.quality}`;
};

export const computeChordComplexityHistory = (
	songs: readonly GroupedSong[]
): ChordComplexityDecadeRow[] => {
	const byDecade = new Map<
		number,
		{
			songCount: number;
			distinctChordsSum: number;
			tokenCount: number;
			nonDiatonicTokenCount: number;
			songsWithNonDiatonic: number;
		}
	>();

	for (const song of songs) {
		if (song.year === undefined) continue;
		const decade = decadeOf(song.year);
		if (!byDecade.has(decade)) {
			byDecade.set(decade, {
				songCount: 0,
				distinctChordsSum: 0,
				tokenCount: 0,
				nonDiatonicTokenCount: 0,
				songsWithNonDiatonic: 0
			});
		}
		const bucket = byDecade.get(decade)!;

		const chordSet = new Set<string>();
		let songHasNonDiatonic = false;
		let songTokenCount = 0;

		for (const section of song.sections) {
			for (const token of section.romanTokens) {
				songTokenCount++;
				const key = canonicalChordKey(token);
				if (key) chordSet.add(key);
				if (isNonDiatonicToken(token, section.scale)) {
					bucket.nonDiatonicTokenCount++;
					songHasNonDiatonic = true;
				}
			}
		}

		if (songTokenCount === 0) continue;

		bucket.songCount++;
		bucket.distinctChordsSum += chordSet.size;
		bucket.tokenCount += songTokenCount;
		if (songHasNonDiatonic) bucket.songsWithNonDiatonic++;
	}

	return [...byDecade.entries()]
		.sort(([a], [b]) => a - b)
		.flatMap(([decade, bucket]): ChordComplexityDecadeRow[] => {
			if (bucket.songCount < MIN_DECADE_SONG_COUNT) return [];
			return [
				{
					decade,
					songCount: bucket.songCount,
					avgDistinctChords: bucket.distinctChordsSum / bucket.songCount,
					nonDiatonicTokenPercent:
						bucket.tokenCount > 0
							? (bucket.nonDiatonicTokenCount / bucket.tokenCount) * 100
							: 0,
					songsWithNonDiatonicPercent:
						(bucket.songsWithNonDiatonic / bucket.songCount) * 100
				}
			];
		});
};

// -- Distinct progressions per song: needs the matcher's output ------------

export type ProgressionCountDecadeRow = {
	decade: number;
	songCount: number;
	avgDistinctProgressions: number;
};

export const computeProgressionCountHistory = (
	songCoverages: readonly SongCoverageEntry[],
	songByKey: ReadonlyMap<string, GroupedSong>
): ProgressionCountDecadeRow[] => {
	const byDecade = new Map<number, { songCount: number; progressionSum: number }>();

	for (const entry of songCoverages) {
		const song = songByKey.get(entry.songKey);
		if (!song || song.year === undefined) continue;
		const decade = decadeOf(song.year);
		if (!byDecade.has(decade)) byDecade.set(decade, { songCount: 0, progressionSum: 0 });
		const bucket = byDecade.get(decade)!;
		bucket.songCount++;
		bucket.progressionSum += entry.progressionCounts.length;
	}

	return [...byDecade.entries()]
		.sort(([a], [b]) => a - b)
		.flatMap(([decade, bucket]): ProgressionCountDecadeRow[] => {
			if (bucket.songCount < MIN_DECADE_SONG_COUNT) return [];
			return [
				{
					decade,
					songCount: bucket.songCount,
					avgDistinctProgressions: bucket.progressionSum / bucket.songCount
				}
			];
		});
};
