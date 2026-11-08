import { untrack } from "svelte";

export type ChordColorSegment = {
	startFraction: number;
	endFraction: number;
	chordColor: string;
};

export const audio = $state({
	muted: true,
	stops: 0,
	clipProgressFraction: 0,
	chordColorSegments: [] as ChordColorSegment[]
});

export const AUDIO_VOLUME = 0.3;

// a Svelte attachment for <audio>/<video>: {@attach attachAudio}. Applies the
// app's volume and keeps the element following the global mute toggle.
export const attachAudio = (el: HTMLMediaElement) => {
	el.volume = AUDIO_VOLUME;
	el.muted = audio.muted;
};

// for audio created in script rather than markup; the caller keeps its own
// `muted` in sync (see RomanNumerals)
export const createAudio = (src: string) => {
	const el = new Audio(src);
	attachAudio(el);
	return el;
};

// a click into blank space on the article stops and resets anything playing
export const stopAllAudio = () => audio.stops++;

// call during component init; runs fn on every stopAllAudio()
export const onStopAll = (fn: () => void) => {
	let first = true;
	$effect(() => {
		audio.stops;
		if (first) {
			first = false;
			return;
		}
		untrack(fn);
	});
};
