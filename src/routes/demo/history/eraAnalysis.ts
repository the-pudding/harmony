import type { GroupedSong } from "../../../data/songBrowser.js";
import { parseRomanToken } from "../../../chord-processing/romanNumerals.js";
import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import { decadeOf } from "./decadeSignatures.js";
import { toCalendarYear } from "../../../data/songYear.js";

// Also applied per calendar year by computeProgressionYearHistories.
const MIN_DECADE_SONG_COUNT = 15;

export type EraDecadeRow = {
	decade: number;
	songCount: number;
	matchedPercent: number;
};

// A song built entirely on the "blues" triad — nothing but major I, IV, V,
// no other degree and no accidental anywhere in the song.
const isPureBluesShape = (song: GroupedSong): boolean => {
	let sawAnyChord = false;
	for (const section of song.sections) {
		for (const token of section.romanTokens) {
			const parsed = parseRomanToken(token);
			if (!parsed) continue;
			sawAnyChord = true;
			if (parsed.flat || parsed.sharp) return false;
			if (parsed.quality !== "maj") return false;
			if (![1, 4, 5].includes(parsed.degree)) return false;
		}
	}
	return sawAnyChord;
};

export const computeBluesEraHistory = (
	songs: readonly GroupedSong[]
): EraDecadeRow[] => {
	const byDecade = new Map<number, { songCount: number; pureBluesCount: number }>();

	for (const song of songs) {
		if (song.year === undefined) continue;
		const decade = decadeOf(song.year);
		if (!byDecade.has(decade)) byDecade.set(decade, { songCount: 0, pureBluesCount: 0 });
		const bucket = byDecade.get(decade)!;
		bucket.songCount++;
		if (isPureBluesShape(song)) bucket.pureBluesCount++;
	}

	return [...byDecade.entries()]
		.sort(([a], [b]) => a - b)
		.flatMap(([decade, bucket]): EraDecadeRow[] => {
			if (bucket.songCount < MIN_DECADE_SONG_COUNT) return [];
			return [
				{
					decade,
					songCount: bucket.songCount,
					matchedPercent: (bucket.pureBluesCount / bucket.songCount) * 100
				}
			];
		});
};

// % of songs matching any of the given canonical core-progression names (see
// SongCoverageEntry.matchingProgressions) — e.g. a single named progression
// like "doo wop", or a whole family like the axis-of-awesome rotations.
export const computeNamedProgressionEraHistory = (
	songCoverages: readonly SongCoverageEntry[],
	songByKey: ReadonlyMap<string, GroupedSong>,
	progressionNames: ReadonlySet<string>
): EraDecadeRow[] => {
	const byDecade = new Map<number, { songCount: number; matchedCount: number }>();

	for (const entry of songCoverages) {
		const song = songByKey.get(entry.songKey);
		if (!song || song.year === undefined) continue;
		const decade = decadeOf(song.year);
		if (!byDecade.has(decade)) byDecade.set(decade, { songCount: 0, matchedCount: 0 });
		const bucket = byDecade.get(decade)!;
		bucket.songCount++;
		if (entry.matchingProgressions.some((name) => progressionNames.has(name))) {
			bucket.matchedCount++;
		}
	}

	return [...byDecade.entries()]
		.sort(([a], [b]) => a - b)
		.flatMap(([decade, bucket]): EraDecadeRow[] => {
			if (bucket.songCount < MIN_DECADE_SONG_COUNT) return [];
			return [
				{
					decade,
					songCount: bucket.songCount,
					matchedPercent: (bucket.matchedCount / bucket.songCount) * 100
				}
			];
		});
};

export type EraYearRow = {
	year: number;
	songCount: number;
	matchedPercent: number;
};

// % of each calendar year's songs matching each of many individual
// progressions, in one pass over the corpus — one series per name, each over
// the same set of qualifying years (0% where it never appears).
export const computeProgressionYearHistories = (
	songCoverages: readonly SongCoverageEntry[],
	songByKey: ReadonlyMap<string, GroupedSong>,
	progressionNames: readonly string[]
): Map<string, EraYearRow[]> => {
	const wanted = new Set(progressionNames);
	const songCountByYear = new Map<number, number>();
	const matchedCountByName = new Map<string, Map<number, number>>(
		progressionNames.map((name) => [name, new Map()])
	);

	for (const entry of songCoverages) {
		const song = songByKey.get(entry.songKey);
		if (!song || song.year === undefined) continue;
		const year = toCalendarYear(song.year);
		songCountByYear.set(year, (songCountByYear.get(year) ?? 0) + 1);
		for (const name of new Set(entry.matchingProgressions)) {
			if (!wanted.has(name)) continue;
			const byYear = matchedCountByName.get(name)!;
			byYear.set(year, (byYear.get(year) ?? 0) + 1);
		}
	}

	const years = [...songCountByYear.entries()]
		.filter(([, songCount]) => songCount >= MIN_DECADE_SONG_COUNT)
		.sort(([a], [b]) => a - b);

	return new Map(
		[...matchedCountByName.entries()].map(([name, byYear]) => [
			name,
			years.map(([year, songCount]) => ({
				year,
				songCount,
				matchedPercent: ((byYear.get(year) ?? 0) / songCount) * 100
			}))
		])
	);
};
