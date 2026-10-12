import { evenlySpacedFraction } from "./chordTimeline.js";

export type ChordStartTimes = Record<string, number>;

export const MIN_CHORD_GAP_SECONDS = 0.05;

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const TIMESTAMP_DECIMALS = 2;
const TIMESTAMP_SECONDS_WIDTH = "00.".length + TIMESTAMP_DECIMALS;
export const SONG_START_SECONDS = 0;

const roundToMilliseconds = (seconds: number): number =>
	Math.round(seconds * MILLISECONDS_PER_SECOND) / MILLISECONDS_PER_SECOND;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

export const resolveChordStartTimes = (
	chordKeys: string[],
	preferredStartTimes: ChordStartTimes,
	duration: number
): number[] =>
	chordKeys.reduce<number[]>((startTimes, key, index) => {
		const preferred =
			preferredStartTimes[key] ??
			evenlySpacedFraction(index, chordKeys.length) * duration;
		const previous = startTimes[index - 1] ?? SONG_START_SECONDS;
		return [...startTimes, Math.max(preferred, previous)];
	}, []);

export const moveChordStartTime = (
	startTimes: number[],
	movedIndex: number,
	targetSeconds: number,
	duration: number
): number[] => {
	const earliest = movedIndex * MIN_CHORD_GAP_SECONDS;
	const latest =
		duration - (startTimes.length - movedIndex) * MIN_CHORD_GAP_SECONDS;
	const movedStart = clamp(targetSeconds, earliest, latest);

	return startTimes.map((startTime, index) => {
		const orderedLimit =
			movedStart + (index - movedIndex) * MIN_CHORD_GAP_SECONDS;
		if (index < movedIndex) return Math.min(startTime, orderedLimit);
		if (index > movedIndex) return Math.max(startTime, orderedLimit);
		return movedStart;
	});
};

export const toChordStartTimesRecord = (
	chordKeys: string[],
	startTimes: number[]
): ChordStartTimes =>
	Object.fromEntries(
		chordKeys.map((key, index) => [key, roundToMilliseconds(startTimes[index])])
	);

export const formatTimestamp = (seconds: number): string => {
	const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
	const remainingSeconds = (seconds % SECONDS_PER_MINUTE)
		.toFixed(TIMESTAMP_DECIMALS)
		.padStart(TIMESTAMP_SECONDS_WIDTH, "0");
	return `${minutes}:${remainingSeconds}`;
};
