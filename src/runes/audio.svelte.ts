import { untrack } from "svelte";

export const audio = $state({ muted: true, stops: 0 });

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
