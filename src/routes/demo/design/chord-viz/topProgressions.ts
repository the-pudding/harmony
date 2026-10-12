import { rollups } from "d3";
import coreProgressions from "../../../../data/core-progressions.js";
import { toneOfRomanToken, type ChordTone } from "./diatonicChords.js";

type ProgressionMatch = {
	name: string;
	chordProgression: string;
	isCore: boolean;
};

type SongMatches = {
	progressionCounts: readonly ProgressionMatch[];
};

export type ProgressionToken = { roman: string; tone: ChordTone };

export type TopProgression = {
	name: string;
	label: string;
	tokens: ProgressionToken[];
	songCount: number;
};

export const TOP_PROGRESSIONS_LIMIT = 30;
const PROGRESSION_SEPARATOR = "-";

export const ROW_CHORD_RADIUS = 18;
const ROW_CHORD_SPACING = 0.85;
const ROW_PADDING = 6;
const ROW_CHORD_STEP = 2 * ROW_CHORD_RADIUS * ROW_CHORD_SPACING;
export const ROW_HEIGHT = 2 * (ROW_CHORD_RADIUS + ROW_PADDING);
export const ROW_CENTER_Y = ROW_HEIGHT / 2;

export const rowChordCenterX = (index: number): number =>
	ROW_PADDING + ROW_CHORD_RADIUS + index * ROW_CHORD_STEP;

export const rowWidthFor = (chordCount: number): number =>
	rowChordCenterX(chordCount - 1) + ROW_CHORD_RADIUS + ROW_PADDING;

const coreSpellingByName = new Map(
	coreProgressions.map((progression) => [
		progression.name,
		[progression.chordProgression].flat()[0]
	])
);

export const progressionTokensOf = (
	chordProgression: string
): ProgressionToken[] =>
	chordProgression.split(PROGRESSION_SEPARATOR).map((roman) => ({
		roman,
		tone: toneOfRomanToken(roman)
	}));

const uniqueMatchesOf = (song: SongMatches): ProgressionMatch[] => [
	...new Map(
		song.progressionCounts.map((match) => [match.name, match])
	).values()
];

const spellingOf = (match: ProgressionMatch): string =>
	match.isCore
		? (coreSpellingByName.get(match.name) ?? match.chordProgression)
		: match.chordProgression;

export const buildTopProgressions = (
	songs: readonly SongMatches[],
	limit: number = TOP_PROGRESSIONS_LIMIT
): TopProgression[] =>
	rollups(
		songs.flatMap(uniqueMatchesOf),
		(matches) => ({ match: matches[0], songCount: matches.length }),
		(match) => match.name
	)
		.map(([name, { match, songCount }]) => {
			const spelling = spellingOf(match);
			return {
				name,
				label: match.isCore ? name : spelling,
				tokens: progressionTokensOf(spelling),
				songCount
			};
		})
		.sort((a, b) => b.songCount - a.songCount || a.label.localeCompare(b.label))
		.slice(0, limit);
