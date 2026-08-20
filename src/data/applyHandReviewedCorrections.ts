import {
	parseSongTitleAndSectionLabel,
	resolveSongKey
} from "../chord-processing/songIdentity.js";
import type { SongInput } from "../chord-processing/types.js";
import { romanTokensToProgressionInKey } from "../chord-processing/scales.js";
import { handCorrectedSongs } from "./hand-corrected-songs.js";
import type { CorrectedSongContents } from "./hand-corrected-songs.js";

export const applyHandReviewedCorrections = (
	songs: SongInput[]
): SongInput[] => {
	const corrections = new Map(
		handCorrectedSongs.map((song) => [song.id, song.correctedSongContents])
	);

	if (corrections.size === 0) return songs;

	const metadataByKey = new Map<
		string,
		{ baseTitle: string; artists: string[]; year?: number }
	>();
	for (const song of songs) {
		const key = resolveSongKey(song);
		if (!metadataByKey.has(key)) {
			const { baseTitle } = parseSongTitleAndSectionLabel(song.title);
			metadataByKey.set(key, {
				baseTitle,
				artists: song.artists,
				year: song.year
			});
		}
	}

	const correctedKeys = new Set(corrections.keys());
	const filtered = songs.filter((s) => !correctedKeys.has(resolveSongKey(s)));

	const replacements = [...corrections.entries()].flatMap(([id, contents]) => {
		const meta = metadataByKey.get(id);
		if (!meta) return [];
		return correctedSongContentsToSongInputs(
			id,
			meta.baseTitle,
			meta.artists,
			meta.year,
			contents
		);
	});

	return [...filtered, ...replacements];
};

export const correctedSongContentsToSongInputs = (
	songId: string,
	baseTitle: string,
	artists: string[],
	year: number | undefined,
	contents: CorrectedSongContents
): SongInput[] =>
	contents.sections.map((section) => ({
		id: `${songId}__${section.name.toLowerCase().replace(/\s+/g, "-")}`,
		songKey: songId,
		title: `${baseTitle} (${section.name})`,
		artists,
		year,
		key: section.key,
		scale: section.scale,
		progression: romanTokensToProgressionInKey(
			section.romanTokens,
			section.key,
			section.scale
		),
		romanTokens: section.romanTokens
	}));
