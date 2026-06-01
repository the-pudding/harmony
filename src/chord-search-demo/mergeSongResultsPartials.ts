import type { SongResultsPartial } from "./matchSongResultsChunk.js";

export const mergeSongResultsPartials = (
	partials: SongResultsPartial[]
): SongResultsPartial => {
	const matchedSongKeys: string[] = [];
	const seenSongKeys = new Set<string>();
	const sectionMatches: SongResultsPartial["sectionMatches"] = [];

	for (const partial of partials) {
		sectionMatches.push(...partial.sectionMatches);

		for (const songKey of partial.matchedSongKeys) {
			if (seenSongKeys.has(songKey)) continue;
			seenSongKeys.add(songKey);
			matchedSongKeys.push(songKey);
		}
	}

	return { matchedSongKeys, sectionMatches };
};
