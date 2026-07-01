import {
	formatChordName,
	hasDistinctBass,
	noteNameToPitchClass
} from "../../../chord-processing/index.js";
import {
	parseSongTitleAndSectionLabel,
	resolveSongKey
} from "../../../chord-processing/songIdentity.js";
import type {
	ProgressionChordInput,
	SongInput
} from "../../../chord-processing/types.js";

export type SongSection = {
	label: string | null;
	chords: string[];
};

export type GroupedSong = {
	songKey: string;
	title: string;
	artists: string[];
	year?: number;
	sections: SongSection[];
};

export type Top10Song = {
	title: string;
	artists: string[];
	year: number;
};

const chordDisplayName = (chord: ProgressionChordInput): string => {
	const rootPitchClass = noteNameToPitchClass(chord.noteName);
	const bassPitchClass = chord.bassNoteName
		? noteNameToPitchClass(chord.bassNoteName)
		: undefined;
	return hasDistinctBass({ rootPitchClass, bassPitchClass })
		? formatChordName({ rootPitchClass, suffix: chord.suffix, bassPitchClass })
		: formatChordName({ rootPitchClass, suffix: chord.suffix });
};

// Order sections the way they'd appear in a lead sheet, not alphabetically.
const SECTION_RANK_PATTERNS: Array<(label: string) => boolean> = [
	(s) => s.startsWith("intro"),
	(s) => s.startsWith("verse"),
	(s) => s.startsWith("pre-chorus"),
	(s) => s.startsWith("chorus"),
	(s) => s.startsWith("bridge"),
	(s) => s.startsWith("solo"),
	(s) => s.startsWith("instrumental"),
	(s) => s.startsWith("pre-outro"),
	(s) => s.startsWith("outro")
];

const sectionRank = (label: string | null): number => {
	if (!label) return SECTION_RANK_PATTERNS.length;
	const lower = label.toLowerCase();
	const idx = SECTION_RANK_PATTERNS.findIndex((fn) => fn(lower));
	return idx === -1 ? SECTION_RANK_PATTERNS.length : idx;
};

export const groupSongs = (songs: SongInput[]): GroupedSong[] => {
	const map = new Map<string, GroupedSong>();
	for (const song of songs) {
		const key = resolveSongKey(song);
		const { baseTitle, sectionLabel } = parseSongTitleAndSectionLabel(
			song.title
		);
		if (!map.has(key)) {
			map.set(key, {
				songKey: key,
				title: baseTitle,
				artists: song.artists,
				year: song.year,
				sections: []
			});
		}
		map.get(key)!.sections.push({
			label: sectionLabel,
			chords: song.progression.map(chordDisplayName)
		});
	}
	return [...map.values()].map((song) => ({
		...song,
		sections: [...song.sections].sort(
			(a, b) => sectionRank(a.label) - sectionRank(b.label)
		)
	}));
};

// A minimal CSV line parser that handles quoted fields containing commas (e.g. multi-artist credits).
const parseCsvLine = (line: string): string[] => {
	const fields: string[] = [];
	let current = "";
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (inQuotes) {
			if (char === '"') inQuotes = false;
			else current += char;
		} else if (char === '"') {
			inQuotes = true;
		} else if (char === ",") {
			fields.push(current);
			current = "";
		} else {
			current += char;
		}
	}
	fields.push(current);
	return fields;
};

export const parseTop10SongsCsv = (text: string): Top10Song[] =>
	text
		.trim()
		.split("\n")
		.slice(1)
		.map((line) => {
			const [title, artists, year] = parseCsvLine(line);
			return {
				title: title.trim(),
				artists: artists.split(",").map((artist) => artist.trim()),
				year: Number(year)
			};
		});

const matchKey = (title: string, artists: string[]): string =>
	`${title.trim().toLowerCase()}::${artists
		.map((artist) => artist.trim().toLowerCase())
		.join(",")}`;

export const buildTop10MatchKeys = (top10Songs: Top10Song[]): Set<string> =>
	new Set(top10Songs.map((song) => matchKey(song.title, song.artists)));

export const isPopularRecentSong = (
	song: GroupedSong,
	top10Keys: Set<string>
): boolean => top10Keys.has(matchKey(song.title, song.artists));
