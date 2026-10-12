import { linear } from "svelte/easing";
import { Tween } from "svelte/motion";
import {
	floatDuration,
	nextFloatingLocation,
	type FloatingChord,
	type Point
} from "./floatingChords.js";

export type Floater = {
	chord: FloatingChord;
	position: Tween<Point>;
};

export const createFloaters = (chords: FloatingChord[]): Floater[] =>
	chords.map((chord) => ({
		chord,
		position: new Tween(chord.start, { easing: linear })
	}));

const drift = (floater: Floater, signal: AbortSignal): void => {
	if (signal.aborted) return;
	const next = nextFloatingLocation(
		floater.position.target.x,
		floater.chord.radius
	);
	floater.position
		.set(next, { duration: floatDuration() })
		.then(() => drift(floater, signal));
};

const IMMEDIATE = { duration: 0 };

const freeze = (floater: Floater): void => {
	floater.position.set(floater.position.current, IMMEDIATE);
};

export const startDrifting = (floaters: Floater[]): (() => void) => {
	const controller = new AbortController();
	floaters.forEach((floater) => drift(floater, controller.signal));
	return () => {
		controller.abort();
		floaters.forEach(freeze);
	};
};
