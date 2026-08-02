import {
	formatChordName,
	hasDistinctBass,
	noteNameToPitchClass
} from "../chord-processing/index.js";
import { NOTE_NAMES } from "../chord-processing/chord-classifier/notes.js";
import {
	parseSongTitleAndSectionLabel,
	resolveSongKey
} from "../chord-processing/songIdentity.js";
import {
	SCALE_INTERVALS,
	type ScaleName
} from "../chord-processing/scale-intervals.js";
import type {
	ParsedProgressionChord,
	ProgressionChordInput,
	SongDataSource,
	SongInput
} from "../chord-processing/types.js";

export type SongSection = {
	label: string | null;
	chords: string[];
	romanTokens: string[];
	parsedProgression: ParsedProgressionChord[];
	keyLabel: string | null;
	scale: ScaleName;
};

export type GroupedSong = {
	songKey: string;
	title: string;
	artists: string[];
	year?: number;
	source?: SongDataSource;
	keyLabel: string | null;
	sections: SongSection[];
};

const MAJOR_TONIC_ROMAN = "I";
const MINOR_TONIC_ROMAN = "i";
const DEFAULT_SECTION_SCALE: ScaleName = "major";

export const humanizeScale = (scale: string): string =>
	scale.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

const isValidScaleName = (scale: string): scale is ScaleName =>
	scale in SCALE_INTERVALS;

const inferScaleFromRomanTokens = (romanTokens: string[]): ScaleName => {
	for (const token of romanTokens) {
		if (token === MAJOR_TONIC_ROMAN) return "major";
		if (token === MINOR_TONIC_ROMAN) return "minor";
	}
	return DEFAULT_SECTION_SCALE;
};

export const resolveSectionScale = (
	scale: string | undefined,
	romanTokens: string[]
): ScaleName =>
	scale && isValidScaleName(scale)
		? scale
		: inferScaleFromRomanTokens(romanTokens);

export const sectionKeyLabel = (
	key: string | undefined,
	scale: string | undefined,
	romanTokens: string[],
	parsedProgression: ParsedProgressionChord[]
): string | null => {
	if (key && scale) return `${key} ${humanizeScale(scale)}`;
	return inferKeyLabel(romanTokens, parsedProgression);
};

export const inferKeyLabel = (
	romanTokens: string[],
	parsedProgression: ParsedProgressionChord[]
): string | null => {
	for (let index = 0; index < romanTokens.length; index++) {
		const token = romanTokens[index];
		const chord = parsedProgression[index];
		if (!chord) continue;
		if (token === MAJOR_TONIC_ROMAN) {
			return `${NOTE_NAMES[chord.rootPitchClass]} major`;
		}
		if (token === MINOR_TONIC_ROMAN) {
			return `${NOTE_NAMES[chord.rootPitchClass]} minor`;
		}
	}
	return null;
};

const parseChord = (chord: ProgressionChordInput): ParsedProgressionChord => {
	const rootPitchClass = noteNameToPitchClass(chord.noteName);
	const bassPitchClass = chord.bassNoteName
		? noteNameToPitchClass(chord.bassNoteName)
		: undefined;
	const structured = hasDistinctBass({ rootPitchClass, bassPitchClass })
		? { rootPitchClass, suffix: chord.suffix, bassPitchClass }
		: { rootPitchClass, suffix: chord.suffix };
	return { ...structured, display: formatChordName(structured) };
};

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
				source: song.source,
				keyLabel: null,
				sections: []
			});
		}
		const parsedProgression = song.progression.map(parseChord);
		const romanTokens = song.romanTokens ?? [];
		const scale = resolveSectionScale(song.scale, romanTokens);
		map.get(key)!.sections.push({
			label: sectionLabel,
			chords: parsedProgression.map((c) => c.display),
			romanTokens,
			parsedProgression,
			keyLabel: sectionKeyLabel(
				song.key,
				song.scale,
				romanTokens,
				parsedProgression
			),
			scale
		});
	}
	return [...map.values()].map((song) => {
		const sections = [...song.sections].sort(
			(a, b) => sectionRank(a.label) - sectionRank(b.label)
		);
		const distinctKeyLabels = [
			...new Set(
				sections
					.map((section) => section.keyLabel)
					.filter((label): label is string => label !== null)
			)
		];
		const keyLabel =
			distinctKeyLabels.length === 0
				? null
				: distinctKeyLabels.length === 1
					? distinctKeyLabels[0]
					: `[${distinctKeyLabels.join(", ")}]`;
		return { ...song, sections, keyLabel };
	});
};

