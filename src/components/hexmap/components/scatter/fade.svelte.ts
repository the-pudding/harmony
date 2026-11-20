import { untrack } from "svelte";
import { stepFade } from "./transitionMath.js";

// A value moving linearly to its target over riseMs/fallMs, calling onFrame each step.
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
		get current(): number {
			return current;
		}
	};
};
