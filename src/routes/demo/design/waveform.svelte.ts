import { computeWaveformPeaks } from "./waveformPeaks.js";

const DECODE_SAMPLE_RATE = 22050;
const DECODE_CONTEXT_LENGTH = 1;
const PEAKS_PER_SECOND = 50;

const decodeAudio = async (
	audioSrc: string,
	signal: AbortSignal
): Promise<AudioBuffer> => {
	const response = await fetch(audioSrc, { signal });
	const context = new OfflineAudioContext({
		length: DECODE_CONTEXT_LENGTH,
		sampleRate: DECODE_SAMPLE_RATE
	});
	return context.decodeAudioData(await response.arrayBuffer());
};

const channelsOf = (buffer: AudioBuffer): Float32Array[] =>
	Array.from({ length: buffer.numberOfChannels }, (_, channelIndex) =>
		buffer.getChannelData(channelIndex)
	);

const loadWaveformPeaks = async (
	audioSrc: string,
	signal: AbortSignal
): Promise<number[]> => {
	const buffer = await decodeAudio(audioSrc, signal);
	return computeWaveformPeaks(
		channelsOf(buffer),
		Math.ceil(buffer.duration * PEAKS_PER_SECOND)
	);
};

export const createWaveform = (getAudioSrc: () => string) => {
	let peaks = $state<number[] | null>(null);

	$effect(() => {
		const controller = new AbortController();
		loadWaveformPeaks(getAudioSrc(), controller.signal)
			.then((loadedPeaks) => {
				if (!controller.signal.aborted) peaks = loadedPeaks;
			})
			.catch((error: unknown) => {
				if (!controller.signal.aborted) console.error(error);
			});
		return () => controller.abort();
	});

	return {
		get peaks() {
			return peaks;
		}
	};
};
