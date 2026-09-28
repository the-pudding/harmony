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
import reviewedCorrections from "./reviewed-corrections.json";
import { applySongKeyAdjustment } from "./applySongKeyAdjustment.js";

// Corrections captured through the /demo/review tool (see
// src/routes/demo/review/) — same shape as handCorrectedSongs, but keyed by
// songKey (the id) instead of an array, and written by the tool rather than
// hand-typed. Kept as a separate file/source rather than merged into
// hand-corrected-songs.ts at write time, so the review tool never
// programmatically edits hand-authored source.
type ReviewedCorrectionEntry = {
	correctedSongContents?: CorrectedSongContents;
	keyAdjustment?: SongKeyAdjustment;
	technicalNotes?: string;
};
const reviewedCorrectionEntries = Object.entries(
	reviewedCorrections as Record<string, ReviewedCorrectionEntry>
).map(([id, entry]) => ({ id, ...entry }));

export const applyHandReviewedCorrections = (
	songs: SongInput[]
): SongInput[] => {
	// Review-tool entries are concatenated last, so a `new Map(...)` below
	// keeps them as the winner over a hand-corrected-songs.ts entry for the
	// same songKey — the more recently made decision wins.
	const allCorrections = [...handCorrectedSongs, ...reviewedCorrectionEntries];
	const fullCorrections = new Map(
		allCorrections.flatMap((song) =>
			song.correctedSongContents
				? [[song.id, song.correctedSongContents] as const]
				: []
		)
	);
	const keyAdjustments = new Map(
		allCorrections.flatMap((song) =>
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
