import {
	DEFAULT_BEATS_PER_MINUTE,
	resolveChordBeats,
	type BeatAlignment,
	type ChordBeatTimings
} from "./chordBeats.js";
import {
	chordKeysOf,
	sectionChordIndices,
	type SongSectionChords
} from "./chordTimeline.js";
import { SONG_START_SECONDS } from "./songTime.js";

export type ChordBeatsFile = BeatAlignment & {
	sections: { name: string; chordBeats: number[] }[];
};

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

const isSectionEntry = (value: unknown): boolean =>
	typeof value === "object" &&
	value !== null &&
	Array.isArray((value as { chordBeats?: unknown }).chordBeats) &&
	(value as { chordBeats: unknown[] }).chordBeats.every(isFiniteNumber);

export const isChordBeatsFile = (value: unknown): value is ChordBeatsFile => {
	if (typeof value !== "object" || value === null) return false;
	const file = value as Record<string, unknown>;
	return (
		isFiniteNumber(file.startSeconds) &&
		isFiniteNumber(file.beatsPerMinute) &&
		file.beatsPerMinute > 0 &&
		Array.isArray(file.sections) &&
		file.sections.every(isSectionEntry)
	);
};

export const toChordBeatsFile = (
	timings: ChordBeatTimings,
	sections: SongSectionChords[]
): ChordBeatsFile => ({
	startSeconds: timings.startSeconds,
	beatsPerMinute: timings.beatsPerMinute,
	sections: sections.map((section) => ({
		name: section.name,
		chordBeats: sectionChordIndices(sections, section.id).map(
			(index) => timings.chordBeats[index]
		)
	}))
});

export const fromChordBeatsFile = (
	value: unknown,
	sections: SongSectionChords[]
): ChordBeatTimings => {
	const chordCount = chordKeysOf(sections).length;
	if (!isChordBeatsFile(value))
		return {
			startSeconds: SONG_START_SECONDS,
			beatsPerMinute: DEFAULT_BEATS_PER_MINUTE,
			chordBeats: resolveChordBeats(chordCount, [])
		};

	return {
		startSeconds: value.startSeconds,
		beatsPerMinute: value.beatsPerMinute,
		chordBeats: resolveChordBeats(
			chordCount,
			sections.flatMap((section, sectionIndex) =>
				section.chords.map(
					(_, chordIndex) =>
						value.sections[sectionIndex]?.chordBeats[chordIndex]
				)
			)
		)
	};
};
