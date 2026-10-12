import { BEATS_PER_CHORD, secondsPerBeatAt } from "./beatGrid.js";
import { SONG_START_SECONDS } from "./songTime.js";

export type BeatAlignment = {
	startSeconds: number;
	beatsPerMinute: number;
};

export type ChordBeatTimings = BeatAlignment & {
	endSongAtBeat: number | null;
	chordBeats: number[];
};

export const DEFAULT_BEATS_PER_MINUTE = 120;
export const BEAT_SNAP = 1;
export const MIN_BEATS_BETWEEN_CHORDS = 1;

const FIRST_BEAT = 0;

export const beatToSeconds = (alignment: BeatAlignment, beat: number): number =>
	alignment.startSeconds + beat * secondsPerBeatAt(alignment.beatsPerMinute);

export const secondsToBeat = (
	alignment: BeatAlignment,
	seconds: number
): number =>
	(seconds - alignment.startSeconds) /
	secondsPerBeatAt(alignment.beatsPerMinute);

const snapBeat = (beat: number): number =>
	Math.round(beat / BEAT_SNAP) * BEAT_SNAP;

export const resolveChordBeats = (
	chordCount: number,
	savedBeats: (number | undefined)[]
): number[] =>
	Array.from({ length: chordCount }, (_, index) => index).reduce<number[]>(
		(beats, index) => {
			const previous = beats[index - 1];
			const preferred =
				savedBeats[index] ??
				(previous === undefined ? FIRST_BEAT : previous + BEATS_PER_CHORD);
			const earliest =
				previous === undefined
					? FIRST_BEAT
					: previous + MIN_BEATS_BETWEEN_CHORDS;
			return [...beats, Math.max(preferred, earliest)];
		},
		[]
	);

export const moveChordBeat = (
	beats: number[],
	movedIndex: number,
	targetBeat: number
): number[] => {
	const movedBeat = Math.max(
		snapBeat(targetBeat),
		FIRST_BEAT + movedIndex * MIN_BEATS_BETWEEN_CHORDS
	);
	return beats.map((beat, index) => {
		const orderedLimit =
			movedBeat + (index - movedIndex) * MIN_BEATS_BETWEEN_CHORDS;
		if (index < movedIndex) return Math.min(beat, orderedLimit);
		if (index > movedIndex) return Math.max(beat, orderedLimit);
		return movedBeat;
	});
};

export const chordStartSeconds = (timings: ChordBeatTimings): number[] =>
	timings.chordBeats.map((beat) => beatToSeconds(timings, beat));

export const beatGridSeconds = (
	alignment: BeatAlignment,
	duration: number
): number[] => {
	const secondsPerBeat = secondsPerBeatAt(alignment.beatsPerMinute);
	const firstBeat = Math.ceil(
		(SONG_START_SECONDS - alignment.startSeconds) / secondsPerBeat
	);
	const lastBeat = Math.floor(
		(duration - alignment.startSeconds) / secondsPerBeat
	);
	return Array.from({ length: Math.max(lastBeat - firstBeat + 1, 0) }, (_, i) =>
		beatToSeconds(alignment, firstBeat + i)
	);
};

export const chordCountBeforeBeat = (
	chordBeats: number[],
	endBeat: number | null
): number =>
	endBeat === null
		? chordBeats.length
		: chordBeats.filter((beat) => beat < endBeat).length;

export const isSameChordBeats = (a: number[], b: number[]): boolean =>
	a.length === b.length && a.every((beat, index) => beat === b[index]);
