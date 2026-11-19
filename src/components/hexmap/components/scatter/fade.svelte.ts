import { untrack } from "svelte";
import { stepFade } from "./transitionMath.js";

// One value (e.g. the hexes' opacity) moving straight toward its target,
// rising over riseMs and falling over fallMs, calling onFrame after every
// step. It starts at its first target. Like the transition, the value
// isn't reactive: onFrame does the redrawing.
export const createFade = (input: {
	readonly target: number;
	readonly riseMs: number;
	readonly fallMs: number;
	onFrame: () => void;
}) => {
	let current = untrack(() => input.target);
	let frame = 0;

	$effect(() => {
		const target = input.target;
		cancelAnimationFrame(frame);
		if (current === target) return;
		let last = performance.now();
		const step = () => {
			const now = performance.now();
			current = untrack(() =>
				stepFade(current, target, now - last, input.riseMs, input.fallMs)
			);
			last = now;
			input.onFrame();
			if (current !== target) frame = requestAnimationFrame(step);
		};
		frame = requestAnimationFrame(step);
	});
	$effect(() => () => cancelAnimationFrame(frame));

	return {
		// Not reactive: read it while drawing.
		get current(): number {
			return current;
		}
	};
};
