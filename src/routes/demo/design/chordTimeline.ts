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
	index: number;
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

export const sectionChordIndices = (
	sections: SongSectionChords[],
	sectionId: string
): number[] => {
	const sectionIndex = sections.findIndex(
		(section) => section.id === sectionId
	);
	if (sectionIndex === -1) return [];
	const offset = sectionChordOffsets(sections)[sectionIndex];
	return sections[sectionIndex].chords.map(
		(_, chordIndex) => offset + chordIndex
	);
};

const groupContaining = (
	groups: SectionChordGroup[],
	chordIndex: number
): SectionChordGroup | undefined =>
	groups.find(
		(group) =>
			chordIndex >= group.startIndex &&
			chordIndex < group.startIndex + group.length
	);

const SONG_END_FRACTION = 1;

const clipGroupToChordCount = (
	group: SectionChordGroup,
	chordCount: number
): SectionChordGroup[] =>
	group.startIndex < chordCount
		? [
				{
					...group,
					length: Math.min(group.length, chordCount - group.startIndex)
				}
			]
		: [];

export const truncateSectionsToChordCount = (
	sections: SongSectionChords[],
	chordCount: number
): SongSectionChords[] => {
	const offsets = sectionChordOffsets(sections);
	return sections.flatMap((section, sectionIndex) => {
		const keptChordCount = Math.min(
			section.chords.length,
			chordCount - offsets[sectionIndex]
		);
		if (keptChordCount <= 0) return [];
		return [
			{
				...section,
				chords: section.chords.slice(0, keptChordCount),
				groups: section.groups.flatMap((group) =>
					clipGroupToChordCount(group, keptChordCount)
				)
			}
		];
	});
};

const chordKeyOf = (section: SongSectionChords, chordIndex: number): string =>
	`${section.id}-${chordIndex}`;

export const chordKeysOf = (sections: SongSectionChords[]): string[] =>
	sections.flatMap((section) =>
		section.chords.map((_, chordIndex) => chordKeyOf(section, chordIndex))
	);

export const evenlySpacedFraction = (index: number, count: number): number =>
	index / count;

export const buildChordTimeline = (
	sections: SongSectionChords[],
	chordStartFractions: number[]
): ChordTimeline => {
	if (chordStartFractions.length === 0) return EMPTY_TIMELINE;

	const offsets = sectionChordOffsets(sections);
	const startFractionOf = (flatIndex: number): number =>
		chordStartFractions[flatIndex] ?? SONG_END_FRACTION;
	const spanOf = (startIndex: number, length: number): FractionSpan => ({
		startFraction: startFractionOf(startIndex),
		endFraction: startFractionOf(startIndex + length)
	});

	return {
		chords: sections.flatMap((section, sectionIndex) =>
			section.chords.map((chord, chordIndex) => ({
				key: chordKeyOf(section, chordIndex),
				index: offsets[sectionIndex] + chordIndex,
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

export const buildEvenlySpacedChordTimeline = (
	sections: SongSectionChords[]
): ChordTimeline => {
	const chordCount = chordKeysOf(sections).length;
	return buildChordTimeline(
		sections,
		Array.from({ length: chordCount }, (_, index) =>
			evenlySpacedFraction(index, chordCount)
		)
	);
};

export const isActiveAt = (
	span: FractionSpan,
	progressFraction: number
): boolean =>
	progressFraction >= span.startFraction && progressFraction < span.endFraction;

export const progressFractionOf = (
	currentTime: number,
	duration: number
): number =>
	Number.isFinite(duration) && duration > 0
		? Math.min(currentTime / duration, 1)
		: 0;
