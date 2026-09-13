import {
	parseSongTitleAndSectionLabel,
	resolveSongKey
} from "../chord-processing/songIdentity.js";
import type { SongInput } from "../chord-processing/types.js";
import { romanTokensToProgressionInKey } from "../chord-processing/scales.js";
import { handCorrectedSongs } from "./hand-corrected-songs.js";
import type {
	CorrectedSongContents,
	SongKeyAdjustment
} from "./hand-corrected-songs.js";
import { applySongKeyAdjustment } from "./applySongKeyAdjustment.js";

export const applyHandReviewedCorrections = (
	songs: SongInput[]
): SongInput[] => {
	const fullCorrections = new Map(
		handCorrectedSongs.flatMap((song) =>
			song.correctedSongContents
				? [[song.id, song.correctedSongContents] as const]
				: []
		)
	);
	const keyAdjustments = new Map(
		handCorrectedSongs.flatMap((song) =>
			song.keyAdjustment ? [[song.id, song.keyAdjustment] as const] : []
		)
	);

	if (fullCorrections.size === 0 && keyAdjustments.size === 0) return songs;

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

	const fullCorrectionKeys = new Set(fullCorrections.keys());
	const withoutFullCorrections = songs.filter(
		(s) => !fullCorrectionKeys.has(resolveSongKey(s))
	);

	const withKeyAdjustments = withoutFullCorrections.map((song) => {
		const adjustment = keyAdjustments.get(resolveSongKey(song));
		return adjustment ? applySongKeyAdjustment(song, adjustment) : song;
	});

	const replacements = [...fullCorrections.entries()].flatMap(
		([id, contents]) => {
			const meta = metadataByKey.get(id);
			if (!meta) return [];
			return correctedSongContentsToSongInputs(
				id,
				meta.baseTitle,
				meta.artists,
				meta.year,
				contents
			);
		}
	);

	return [...withKeyAdjustments, ...replacements];
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

export type { SongKeyAdjustment };
