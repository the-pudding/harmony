import type { SongSection } from "$data/songBrowser.js";
import { formatChordName } from "../../../chord-processing/formatChordDisplay.js";
import type { StructuredChord } from "../../../chord-processing/types.js";

// The corpus's chords for a song, to read from while recording. Sections
// with the same chords are listed once, under all their labels.
export type ChordSheetSection = {
	labels: string[];
	chords: StructuredChord[];
};

const UNLABELED_SECTION = "untitled";

const chordsId = (chords: StructuredChord[]): string =>
	chords.map(formatChordName).join(" ");

export const buildChordSheet = (sections: SongSection[]): ChordSheetSection[] =>
	sections.reduce<ChordSheetSection[]>((sheet, section) => {
		const label = section.label ?? UNLABELED_SECTION;
		const chords = section.parsedProgression.map(
			({ rootPitchClass, suffix, bassPitchClass }) =>
				bassPitchClass === undefined
					? { rootPitchClass, suffix }
					: { rootPitchClass, suffix, bassPitchClass }
		);
		const same = sheet.find(
			(entry) => chordsId(entry.chords) === chordsId(chords)
		);
		if (!same) return [...sheet, { labels: [label], chords }];
		return sheet.map((entry) =>
			entry === same ? { ...entry, labels: [...entry.labels, label] } : entry
		);
	}, []);
