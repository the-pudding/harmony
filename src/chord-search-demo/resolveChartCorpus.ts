import type { SongInput } from "../chord-processing/types.js";
import type { ChartSection } from "./computeVariableGramStats.js";
import { matchesYearRange, type YearRangeFilter } from "./yearRangeFilter.js";

const songKeyFromId = (id: string | undefined): string => {
	if (!id) return "unknown";
	const parts = id.split("__");
	return parts.length >= 2 ? `${parts[0]}__${parts[1]}` : id;
};

const toChartSection = (song: SongInput): ChartSection | null => {
	if (!song.romanTokens?.length) return null;

	return {
		romanTokens: song.romanTokens,
		songKey: song.songKey ?? songKeyFromId(song.id)
	};
};

export type ChartCorpusFilters = {
	hasSearchChords: boolean;
	titleFilter: string;
	selectedArtist: string;
	yearRange: YearRangeFilter | null;
	getMatchingSongIds: () => Set<string>;
};

export const resolveChartCorpus = (
	songs: SongInput[],
	{
		hasSearchChords,
		titleFilter,
		selectedArtist,
		yearRange,
		getMatchingSongIds
	}: ChartCorpusFilters
): ChartSection[] => {
	const normalizedTitle = titleFilter.trim().toLowerCase();
	const matchingIds = hasSearchChords ? getMatchingSongIds() : null;

	return songs
		.filter((song) => {
			if (matchingIds && !matchingIds.has(song.id ?? "")) return false;
			if (selectedArtist && !song.artists.includes(selectedArtist))
				return false;
			if (!matchesYearRange(song.year, yearRange)) return false;
			if (
				normalizedTitle &&
				!song.title.toLowerCase().includes(normalizedTitle)
			)
				return false;
			return true;
		})
		.map(toChartSection)
		.filter((section): section is ChartSection => section !== null);
};
