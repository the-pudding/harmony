import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import { hashString } from "../../../../utils/hashString.js";

export const COVERAGE_CACHE_SCHEMA_VERSION = 3;

const progressionFingerprint = (progressions: CoreProgression[]): string =>
	progressions
		.map(
			(p) =>
				`${p.name}:${JSON.stringify(p.chordProgression)}:${p.scale}:${p.matchRomanNumeralsExactly ?? false}`
		)
		.join("|");

const songCorpusFingerprint = (songs: GroupedSong[]): string =>
	[...songs]
		.sort((a, b) => a.songKey.localeCompare(b.songKey))
		.map((s) => {
			const totalTokens = s.sections.reduce(
				(n, sec) => n + sec.romanTokens.length,
				0
			);
			return `${s.songKey}:${s.sections.length}:${totalTokens}`;
		})
		.join("|");

export const buildCoverageCacheKey = async (
	progressions: CoreProgression[],
	songs: GroupedSong[]
): Promise<string> => {
	const input = [
		String(COVERAGE_CACHE_SCHEMA_VERSION),
		progressionFingerprint(progressions),
		songCorpusFingerprint(songs)
	].join("||");
	return hashString(input);
};
