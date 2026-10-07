import type { CoreProgression } from "$data/core-progressions.js";
import { applyHandReviewedCorrections } from "$data/applyHandReviewedCorrections.js";
import {
	groupSongs,
	type SongSection
} from "$data/songBrowser.js";
import { formatRomanTokenFromParsed } from "../../../chord-processing/romanNumerals.js";
import { parseSongTitleAndSectionLabel } from "../../../chord-processing/songIdentity.js";
import type { SongInput } from "../../../chord-processing/types.js";
import { collapseAdjacentRepeatedChords } from "../define-chord-progression/progression-matching-logic/collapsedProgression.js";
import {
	buildColoredHighlightSegments,
	type ChordAnnotation
} from "../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
import { matchSongV2 } from "../match-algo-v2/match-algo-v2-logic/matchSongV2.js";
import { DEFAULT_WEIGHTS } from "../match-algo-v2/match-algo-v2-logic/weights.js";
import type { SectionChordGroup, SongSectionChords } from "./chordTimeline.js";

const SINGLE_CHORD_RUN_LENGTH = 1;

const sectionChordGroups = (
	section: SongSection,
	sectionIndex: number,
	annotations: ChordAnnotation[]
): SectionChordGroup[] => {
	const runLengthByStart = new Map(
		collapseAdjacentRepeatedChords(section.parsedProgression).originalRanges.map(
			(range) => [range.start, range.length]
		)
	);
	return buildColoredHighlightSegments(section, sectionIndex, annotations).flatMap(
		(segment) => {
			if (segment.palette === null) return [];
			const startIndex = segment.indices[0];
			const lastRunStart = segment.indices[segment.indices.length - 1];
			const lastRunLength =
				runLengthByStart.get(lastRunStart) ?? SINGLE_CHORD_RUN_LENGTH;
			return [
				{
					startIndex,
					length: lastRunStart + lastRunLength - startIndex,
					palette: segment.palette,
					chordProgression: segment.chordProgression,
					isStrictSubset: segment.isStrictSubset
				}
			];
		}
	);
};

const sectionChords = (section: SongSection): SongSectionChords["chords"] =>
	section.chords.map((name, position) => ({
		name,
		roman: formatRomanTokenFromParsed(
			section.romanTokens[position],
			section.parsedProgression[position]
		)
	}));

const labelOccurrenceIndex = (
	labels: (string | null)[],
	index: number
): number => labels.slice(0, index).filter((label) => label === labels[index]).length;

const groupedSectionIndexForOccurrence = (
	sections: SongSection[],
	label: string | null,
	occurrenceIndex: number
): number | undefined =>
	sections.flatMap((section, sectionIndex) =>
		section.label === label ? [sectionIndex] : []
	)[occurrenceIndex];

export const buildMatchedSongSections = (
	songInputs: SongInput[],
	coreProgressions: CoreProgression[]
): SongSectionChords[] => {
	const correctedInputs = applyHandReviewedCorrections(songInputs);
	const [groupedSong] = groupSongs(correctedInputs);
	if (!groupedSong) return [];

	const { annotations } = matchSongV2(
		groupedSong,
		coreProgressions,
		DEFAULT_WEIGHTS
	);

	const inputLabels = correctedInputs.map(
		(input) => parseSongTitleAndSectionLabel(input.title).sectionLabel
	);

	return inputLabels.flatMap((sectionLabel, inputIndex) => {
		const sectionIndex = groupedSectionIndexForOccurrence(
			groupedSong.sections,
			sectionLabel,
			labelOccurrenceIndex(inputLabels, inputIndex)
		);
		if (sectionIndex === undefined) return [];
		const section = groupedSong.sections[sectionIndex];
		return [
			{
				id: `${groupedSong.songKey}-section-${inputIndex}`,
				name: sectionLabel ?? "",
				chords: sectionChords(section),
				groups: sectionChordGroups(section, sectionIndex, annotations)
			}
		];
	});
};
