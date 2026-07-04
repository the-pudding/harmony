import { parseSongTitleAndSectionLabel, resolveSongKey } from "../chord-processing/songIdentity.js";
import type { ProgressionChordInput, SongInput } from "../chord-processing/types.js";
import { romanTokensToParsedProgression } from "../chord-processing/romanNumerals.js";
import { NOTE_NAMES } from "../chord-processing/chord-classifier/notes.js";
import { handReviewedSongs } from "./hand-reviewed-songs.js";
import type { CorrectedSongContents } from "./hand-reviewed-songs.js";

const romanTokensToProgression = (
	tokens: string[]
): ProgressionChordInput[] => {
	const parsed = romanTokensToParsedProgression(tokens);
	if (!parsed)
		throw new Error(`Cannot parse roman tokens: ${tokens.join(", ")}`);
	return parsed.map(({ rootPitchClass, suffix }) => ({
		noteName: NOTE_NAMES[rootPitchClass],
		suffix
	}));
};

export const applyHandReviewedCorrections = (songs: SongInput[]): SongInput[] => {
	const corrections = new Map(
		handReviewedSongs
			.filter((r) => r.correctedSongContents !== undefined)
			.map((r) => [r.id, r.correctedSongContents!])
	);

	if (corrections.size === 0) return songs;

	const metadataByKey = new Map<string, { baseTitle: string; artists: string[]; year?: number }>();
	for (const song of songs) {
		const key = resolveSongKey(song);
		if (!metadataByKey.has(key)) {
			const { baseTitle } = parseSongTitleAndSectionLabel(song.title);
			metadataByKey.set(key, { baseTitle, artists: song.artists, year: song.year });
		}
	}

	const correctedKeys = new Set(corrections.keys());
	const filtered = songs.filter((s) => !correctedKeys.has(resolveSongKey(s)));

	const replacements = [...corrections.entries()].flatMap(([id, contents]) => {
		const meta = metadataByKey.get(id);
		if (!meta) return [];
		return correctedSongContentsToSongInputs(id, meta.baseTitle, meta.artists, meta.year, contents);
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
		id: `${songId}__${section.label.toLowerCase().replace(/\s+/g, "-")}`,
		songKey: songId,
		title: `${baseTitle} (${section.label})`,
		artists,
		year,
		progression: romanTokensToProgression(section.romanTokens),
		romanTokens: section.romanTokens
	}));
