export const WAVEFORM_VIEWBOX_HEIGHT = 2;

const WAVEFORM_CENTER = WAVEFORM_VIEWBOX_HEIGHT / 2;
const SILENT_PEAK = 0;

const maxAbsoluteSample = (samples: Float32Array): number =>
	samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), SILENT_PEAK);

const bucketPeak = (
	channels: Float32Array[],
	bucketIndex: number,
	samplesPerBucket: number
): number =>
	channels.reduce(
		(max, channel) =>
			Math.max(
				max,
				maxAbsoluteSample(
					channel.subarray(
						Math.floor(bucketIndex * samplesPerBucket),
						Math.floor((bucketIndex + 1) * samplesPerBucket)
					)
				)
			),
		SILENT_PEAK
	);

export const computeWaveformPeaks = (
	channels: Float32Array[],
	bucketCount: number
): number[] => {
	const sampleCount = channels[0]?.length ?? 0;
	if (sampleCount === 0 || bucketCount <= 0) return [];

	const samplesPerBucket = sampleCount / bucketCount;
	const peaks = Array.from({ length: bucketCount }, (_, bucketIndex) =>
		bucketPeak(channels, bucketIndex, samplesPerBucket)
	);
	const loudestPeak = peaks.reduce(
		(max, peak) => Math.max(max, peak),
		SILENT_PEAK
	);
	return loudestPeak === SILENT_PEAK
		? peaks
		: peaks.map((peak) => peak / loudestPeak);
};

export const cropPeaksToFraction = (
	peaks: number[],
	fraction: number
): number[] => peaks.slice(0, Math.ceil(peaks.length * fraction));

const pointsToPath = (points: [number, number][]): string =>
	points.map(([x, y]) => `${x} ${y}`).join("L");

export const waveformAreaPath = (peaks: number[]): string => {
	if (peaks.length === 0) return "";
	const top = peaks.map((peak, index): [number, number] => [
		index,
		WAVEFORM_CENTER - peak * WAVEFORM_CENTER
	]);
	const bottom = peaks
		.map((peak, index): [number, number] => [
			index,
			WAVEFORM_CENTER + peak * WAVEFORM_CENTER
		])
		.toReversed();
	return `M${pointsToPath([...top, ...bottom])}Z`;
};
