export type SongSectionChords = {
	id: string;
	name: string;
	chords: { name: string; roman: string }[];
};

export type TimelineChord = {
	key: string;
	name: string;
	roman: string;
	startFraction: number;
	endFraction: number;
};

export type TimelineSection = {
	key: string;
	name: string;
	startFraction: number;
	endFraction: number;
};

export type ChordTimeline = {
	chords: TimelineChord[];
	sections: TimelineSection[];
};

const sectionChordOffsets = (sections: SongSectionChords[]): number[] =>
	sections.reduce<number[]>(
		(offsets, section, index) =>
			index === 0
				? [0]
				: [...offsets, offsets[index - 1] + sections[index - 1].chords.length],
		[]
	);

export const buildEvenlySpacedChordTimeline = (
	sections: SongSectionChords[]
): ChordTimeline => {
	const totalChordCount = sections.reduce(
		(total, section) => total + section.chords.length,
		0
	);
	if (totalChordCount === 0) return { chords: [], sections: [] };

	const fractionAt = (chordIndex: number): number =>
		chordIndex / totalChordCount;
	const offsets = sectionChordOffsets(sections);

	return {
		chords: sections.flatMap((section, sectionIndex) =>
			section.chords.map((chord, chordIndex) => {
				const songChordIndex = offsets[sectionIndex] + chordIndex;
				return {
					key: `${section.id}-${chordIndex}`,
					name: chord.name,
					roman: chord.roman,
					startFraction: fractionAt(songChordIndex),
					endFraction: fractionAt(songChordIndex + 1)
				};
			})
		),
		sections: sections.map((section, sectionIndex) => ({
			key: section.id,
			name: section.name,
			startFraction: fractionAt(offsets[sectionIndex]),
			endFraction: fractionAt(offsets[sectionIndex] + section.chords.length)
		}))
	};
};

export const isActiveAt = (
	span: { startFraction: number; endFraction: number },
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
