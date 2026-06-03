import type {
	GroupedSongSearchResult,
	SubProgressionMatch
} from "../chord-processing/types.js";

export const PCT_OF_SONG_DOMAIN = [0, 100] as const;
export const PCT_OF_SONG_DOMAIN_MIN = PCT_OF_SONG_DOMAIN[0];
export const PCT_OF_SONG_DOMAIN_MAX = PCT_OF_SONG_DOMAIN[1];

export type PctOfSongRangeFilter = readonly [minPct: number, maxPct: number];

export type SongChordMatchStats = {
	matchingChordCount: number;
	totalChordCount: number;
};

export const matchingChordIndicesFromMatches = (
	matches: SubProgressionMatch[]
): Set<number> => {
	const indices = new Set<number>();
	for (const { start, length } of matches) {
		for (let chordIndex = start; chordIndex < start + length; chordIndex++) {
			indices.add(chordIndex);
		}
	}
	return indices;
};

export const matchingChordCountFromMatches = (
	matches: SubProgressionMatch[]
): number => matchingChordIndicesFromMatches(matches).size;

export const pctOfSongFromCounts = (
	matchingChordCount: number,
	totalChordCount: number
): number =>
	totalChordCount > 0 ? (matchingChordCount / totalChordCount) * 100 : 0;

export const pctOfSongFromGroupedResult = (
	result: GroupedSongSearchResult
): number => {
	let matchingChordTotal = 0;
	let totalChordTotal = 0;

	for (const section of result.sections) {
		if (section.matches.length === 0) continue;

		const totalChordCount = section.parsedProgression.length;
		matchingChordTotal += matchingChordCountFromMatches(section.matches);
		totalChordTotal += totalChordCount;
	}

	return pctOfSongFromCounts(matchingChordTotal, totalChordTotal);
};

export const toPlainPctOfSongRange = (
	pctRange: PctOfSongRangeFilter | null
): PctOfSongRangeFilter | null => {
	if (!pctRange) return null;

	const [minPct, maxPct] = pctRange;
	return [minPct, maxPct];
};

export const clampPctOfSongRange = (
	range: PctOfSongRangeFilter
): PctOfSongRangeFilter => {
	const [rawMin, rawMax] = range;
	const minPct = Math.max(
		PCT_OF_SONG_DOMAIN_MIN,
		Math.min(rawMin, rawMax, PCT_OF_SONG_DOMAIN_MAX)
	);
	const maxPct = Math.min(
		PCT_OF_SONG_DOMAIN_MAX,
		Math.max(rawMin, rawMax, PCT_OF_SONG_DOMAIN_MIN)
	);
	return [minPct, maxPct] as const;
};

export const matchesPctOfSongRange = (
	pct: number,
	pctRange: PctOfSongRangeFilter | null | undefined
): boolean => {
	if (pctRange == null) return true;

	const [minPct, maxPct] = pctRange;
	return pct >= minPct && pct <= maxPct;
};
