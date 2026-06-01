import { buildGroupedSongResult } from "../chord-processing/match-chord-progressions/index.js";
import type {
	GroupedSongSearchResult,
	ParsedProgressionChord,
	PreparedSong,
	SubProgressionMatch
} from "../chord-processing/types.js";
import type { SongResultsPartial } from "./matchSongResultsChunk.js";

export const assembleGroupedSongResults = (
	merged: SongResultsPartial,
	sectionsBySongKey: Map<string, PreparedSong[]>,
	searchProgression: ParsedProgressionChord[],
	hasChords: boolean,
	matchOptions: {
		fuzzySearch: boolean;
		matchAtBeginningOnly: boolean;
		matchAtLeastTwice: boolean;
	}
): GroupedSongSearchResult[] => {
	const sectionMatchCache = new Map<string, SubProgressionMatch[]>(
		merged.sectionMatches.map(({ id, matches }) => [id, matches])
	);

	return merged.matchedSongKeys.map((songKey) =>
		buildGroupedSongResult(
			songKey,
			sectionsBySongKey.get(songKey) ?? [],
			hasChords,
			sectionMatchCache,
			searchProgression,
			matchOptions
		)
	);
};
