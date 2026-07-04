import { parseSongTitleAndSectionLabel, resolveSongKey } from "../chord-processing/songIdentity.js";
import type { ProgressionChordInput, SongInput } from "../chord-processing/types.js";
import { handReviewedSongs } from "./hand-reviewed-songs.js";
import type { CorrectedSongContents } from "./hand-reviewed-songs.js";

const NOTE_NAME_PATTERN = /^([A-G][#b]?)/;

const SHORT_SUFFIX_TO_CANONICAL: Record<string, string> = {
	"": "major",
	m: "minor",
	m7: "minor7",
	m9: "minor9",
	mmaj7: "minor maj7",
	maj7: "maj7",
	maj9: "maj9",
	"7": "7",
	"9": "9",
	"7sus4": "7sus4",
	sus2: "sus2",
	sus4: "sus4",
	add9: "add9",
	"6": "6",
	"6/9": "6/9",
	dim: "diminished",
	dim7: "dim7",
	m7b5: "m7b5",
	aug: "augmented"
};

const parseChordString = (chord: string): ProgressionChordInput => {
	const [rootAndSuffix, bassName] = chord.split("/");
	const noteMatch = rootAndSuffix.match(NOTE_NAME_PATTERN);
	if (!noteMatch) throw new Error(`Cannot parse chord: "${chord}"`);
	const noteName = noteMatch[1];
	const shortSuffix = rootAndSuffix.slice(noteName.length);
	const suffix = SHORT_SUFFIX_TO_CANONICAL[shortSuffix];
	if (suffix === undefined)
		throw new Error(`Unknown chord suffix "${shortSuffix}" in "${chord}"`);
	return bassName ? { noteName, suffix, bassNoteName: bassName } : { noteName, suffix };
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
		progression: section.chords.map(parseChordString),
		romanTokens: section.chords
	}));
