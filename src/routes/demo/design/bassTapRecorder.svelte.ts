import { nextBassTap, type BassTap } from "./bassTaps.js";

type BassTapRecorderOptions = {
	getChordStartSeconds: () => number[];
	onRecordingStart: () => void;
	onChordTap: (tap: BassTap) => void;
};

export const createBassTapRecorder = ({
	getChordStartSeconds,
	onRecordingStart,
	onChordTap
}: BassTapRecorderOptions) => {
	let recording = $state(false);
	let lastTap = $state.raw<BassTap | null>(null);

	const start = () => {
		lastTap = null;
		recording = true;
		onRecordingStart();
	};

	const stop = () => {
		recording = false;
	};

	const toggle = () => (recording ? stop() : start());

	const tap = (seconds: number) => {
		if (!recording) return;
		const next = nextBassTap(lastTap, seconds, getChordStartSeconds());
		if (!next) return;
		lastTap = next;
		onChordTap(next);
	};

	return {
		get recording() {
			return recording;
		},
		get lastTap() {
			return lastTap;
		},
		toggle,
		tap
	};
};
