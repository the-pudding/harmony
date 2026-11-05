export const SONG_START_SECONDS = 0;

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const TIMESTAMP_DECIMALS = 2;
const TIMESTAMP_SECONDS_WIDTH = "00.".length + TIMESTAMP_DECIMALS;

export const roundToMilliseconds = (seconds: number): number =>
	Math.round(seconds * MILLISECONDS_PER_SECOND) / MILLISECONDS_PER_SECOND;

export const formatTimestamp = (seconds: number): string => {
	const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
	const remainingSeconds = (seconds % SECONDS_PER_MINUTE)
		.toFixed(TIMESTAMP_DECIMALS)
		.padStart(TIMESTAMP_SECONDS_WIDTH, "0");
	return `${minutes}:${remainingSeconds}`;
};
