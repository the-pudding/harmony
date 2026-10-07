import type { ChordHighlightPalette } from "../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";

export type SectionChordGroup = {
	startIndex: number;
	length: number;
	palette: ChordHighlightPalette;
	chordProgression: string | null;
	isStrictSubset: boolean;
};

export type SongSectionChords = {
	id: string;
	name: string;
	chords: { name: string; roman: string }[];
	groups: SectionChordGroup[];
};

type FractionSpan = {
	startFraction: number;
	endFraction: number;
};

export type TimelineChord = FractionSpan & {
	key: string;
	name: string;
	roman: string;
	palette: ChordHighlightPalette | null;
};

export type TimelineGroup = FractionSpan & {
	key: string;
	palette: ChordHighlightPalette;
	chordProgression: string | null;
	isStrictSubset: boolean;
};

export type TimelineSection = FractionSpan & {
	key: string;
	name: string;
};

export type ChordTimeline = {
	chords: TimelineChord[];
	groups: TimelineGroup[];
	sections: TimelineSection[];
};

const EMPTY_TIMELINE: ChordTimeline = { chords: [], groups: [], sections: [] };

const sectionChordOffsets = (sections: SongSectionChords[]): number[] =>
	sections.reduce<number[]>(
		(offsets, section, index) =>
			index === 0
				? [0]
				: [...offsets, offsets[index - 1] + sections[index - 1].chords.length],
		[]
	);

const groupContaining = (
	groups: SectionChordGroup[],
	chordIndex: number
): SectionChordGroup | undefined =>
	groups.find(
		(group) =>
			chordIndex >= group.startIndex &&
			chordIndex < group.startIndex + group.length
	);

export const buildEvenlySpacedChordTimeline = (
	sections: SongSectionChords[]
): ChordTimeline => {
	const totalChordCount = sections.reduce(
		(total, section) => total + section.chords.length,
		0
	);
	if (totalChordCount === 0) return EMPTY_TIMELINE;

	const offsets = sectionChordOffsets(sections);
	const spanOf = (startIndex: number, length: number): FractionSpan => ({
		startFraction: startIndex / totalChordCount,
		endFraction: (startIndex + length) / totalChordCount
	});

	return {
		chords: sections.flatMap((section, sectionIndex) =>
			section.chords.map((chord, chordIndex) => ({
				key: `${section.id}-${chordIndex}`,
				name: chord.name,
				roman: chord.roman,
				palette: groupContaining(section.groups, chordIndex)?.palette ?? null,
				...spanOf(offsets[sectionIndex] + chordIndex, 1)
			}))
		),
		groups: sections.flatMap((section, sectionIndex) =>
			section.groups.map((group) => ({
				key: `${section.id}-group-${group.startIndex}`,
				palette: group.palette,
				chordProgression: group.chordProgression,
				isStrictSubset: group.isStrictSubset,
				...spanOf(offsets[sectionIndex] + group.startIndex, group.length)
			}))
		),
		sections: sections.map((section, sectionIndex) => ({
			key: section.id,
			name: section.name,
			...spanOf(offsets[sectionIndex], section.chords.length)
		}))
	};
};

export const isActiveAt = (span: FractionSpan, progressFraction: number): boolean =>
	progressFraction >= span.startFraction && progressFraction < span.endFraction;

export const progressFractionOf = (
	currentTime: number,
	duration: number
): number =>
	Number.isFinite(duration) && duration > 0
		? Math.min(currentTime / duration, 1)
		: 0;
