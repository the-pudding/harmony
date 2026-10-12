import { beatsPerMinuteOf, fitChordGrid } from "./beatGrid.js";
import { resolveChordBeats, type ChordBeatTimings } from "./chordBeats.js";
import {
	chordKeysOf,
	sectionChordIndices,
	type SongSectionChords
} from "./chordTimeline.js";
import { roundToMilliseconds } from "./songTime.js";

const BPM_DECIMALS = 2;

export const migrateLegacyChordStartTimes = (
	startSecondsByChordKey: Record<string, number>,
	sections: SongSectionChords[]
): ChordBeatTimings | null => {
	const [firstSection] = sections;
	if (!firstSection) return null;

	const chordKeys = chordKeysOf(sections);
	const grid = fitChordGrid(
		sectionChordIndices(sections, firstSection.id).flatMap((index) => {
			const seconds = startSecondsByChordKey[chordKeys[index]];
			return seconds === undefined ? [] : [{ index, seconds }];
		})
	);
	if (!grid) return null;

	return {
		startSeconds: roundToMilliseconds(grid.offsetSeconds),
		beatsPerMinute: Number(beatsPerMinuteOf(grid).toFixed(BPM_DECIMALS)),
		endSongAtBeat: null,
		chordBeats: resolveChordBeats(chordKeys.length, [])
	};
};
