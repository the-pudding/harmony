export const BEATS_PER_CHORD = 2;

const SECONDS_PER_MINUTE = 60;
const MIN_FIT_SAMPLES = 2;

export type ChordGrid = {
	offsetSeconds: number;
	secondsPerChord: number;
};

type ChordTimeSample = {
	index: number;
	seconds: number;
};

const sum = (values: number[]): number =>
	values.reduce((total, value) => total + value, 0);

export const secondsPerBeatAt = (beatsPerMinute: number): number =>
	SECONDS_PER_MINUTE / beatsPerMinute;

export const fitChordGrid = (samples: ChordTimeSample[]): ChordGrid | null => {
	if (samples.length < MIN_FIT_SAMPLES) return null;

	const count = samples.length;
	const indices = samples.map((sample) => sample.index);
	const seconds = samples.map((sample) => sample.seconds);
	const indexSum = sum(indices);
	const secondsSum = sum(seconds);
	const denominator =
		count * sum(indices.map((index) => index * index)) - indexSum ** 2;
	if (denominator === 0) return null;

	const secondsPerChord =
		(count * sum(samples.map((sample) => sample.index * sample.seconds)) -
			indexSum * secondsSum) /
		denominator;
	if (secondsPerChord <= 0) return null;

	return {
		offsetSeconds: (secondsSum - secondsPerChord * indexSum) / count,
		secondsPerChord
	};
};

export const beatsPerMinuteOf = (grid: ChordGrid): number =>
	(SECONDS_PER_MINUTE * BEATS_PER_CHORD) / grid.secondsPerChord;
