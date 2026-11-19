import { untrack } from "svelte";
import { easeCubicInOut } from "d3";
import {
	beginTransition,
	copyChannels,
	createChannels,
	stepTransition,
	type Channels
} from "./transitionMath.js";

// Where every song should be, by song index: x and y (0–1 across the plot;
// NaN = not placed, so it fades out where it is), alpha (0 = hidden), mix
// (0 = star white, 1 = region color) and an optional stagger (0–1 per song; see STAGGER_SPAN).
export type TransitionTarget = Channels & { stagger?: Float32Array | null };

// How songs move to a target: over durationMs, after holding still for
// delayMs (e.g. while hexes fade out), or at once when instant.
export type TransitionTiming = {
	durationMs: number;
	instant?: boolean;
	delayMs?: number;
};

// Animates every song's x, y and alpha from what's drawn to each new
// target, calling onFrame after every step. Positions live in preallocated
// typed arrays mutated in place, outside Svelte's graph; onFrame does the
// redrawing. Only `settled` is reactive, and it's written only when a
// transition starts or ends.
//
// - The first target (and any target for a new number of songs) appears at
//   once, as does any target timed `instant`.
// - A new target mid-flight starts from where songs are drawn, so fast
//   changes never jump.
// - timing(next, previous) is asked how to move each time a target arrives
//   that changes what's drawn (not for the first target or a new song
//   count), with the target before it (null at first), so callers can tell
//   apart what changed (e.g. a window resize jumps). Its delayMs holds
//   songs where they are before they move; a new target during the delay
//   restarts it.
export const createTransition = <Target extends TransitionTarget>(input: {
	readonly target: Target | null;
	timing: (next: Target, previous: Target | null) => TransitionTiming;
	onFrame: () => void;
}) => {
	let current = createChannels(0);
	let from = createChannels(0);
	let to = createChannels(0);
	let startAt = new Float32Array(0);
	let frame = 0;
	let settled = $state(true);
	// Bumped when songs come to rest at new positions (a transition settling
	// or an instant jump), never mid-flight, so caches of resting positions
	// (hex bins) can key on it.
	let positionsVersion = 0;
	let previousTarget: Target | null = null;
	// How far through the latest transition the clock is, 0–1 (1 at rest).
	// Songs with a stagger start later; this is the whole transition, for
	// things that fade with it (guides).
	let progress = 1;

	const finish = () => {
		positionsVersion++;
		settled = true;
	};

	const resize = (count: number) => {
		current = createChannels(count);
		current.x.fill(NaN);
		current.y.fill(NaN);
		from = createChannels(count);
		to = createChannels(count);
		startAt = new Float32Array(count);
	};

	const retarget = (target: Target) => {
		cancelAnimationFrame(frame);
		const previous = previousTarget;
		previousTarget = target;
		const count = target.x.length;
		const fresh = current.x.length !== count;
		if (fresh) resize(count);

		const changed = beginTransition(
			current,
			target,
			target.stagger ?? null,
			from,
			to,
			startAt
		);
		if (!changed) {
			if (!settled) finish();
			progress = 1;
			return;
		}
		const timing = fresh ? null : input.timing(target, previous);
		if (!timing || timing.instant) {
			copyChannels(to, current);
			progress = 1;
			finish();
			input.onFrame();
			return;
		}

		settled = false;
		progress = 0;
		const durationMs = Math.max(1, timing.durationMs);
		const startedAt = performance.now() + Math.max(0, timing.delayMs ?? 0);
		const step = () => {
			const elapsed = performance.now() - startedAt;
			if (elapsed < 0) {
				frame = requestAnimationFrame(step);
				return;
			}
			const t = Math.min(1, elapsed / durationMs);
			progress = t;
			stepTransition(from, to, current, startAt, t, easeCubicInOut);
			if (t >= 1) finish();
			input.onFrame();
			if (t < 1) frame = requestAnimationFrame(step);
		};
		if (startedAt > performance.now()) {
			frame = requestAnimationFrame(step);
		} else {
			step();
		}
	};

	$effect(() => {
		const target = input.target;
		if (target) untrack(() => retarget(target));
	});
	$effect(() => () => cancelAnimationFrame(frame));

	return {
		// What's drawn now, by song index; mutated in place every frame.
		get x(): Float32Array {
			return current.x;
		},
		get y(): Float32Array {
			return current.y;
		},
		get alpha(): Float32Array {
			return current.alpha;
		},
		// How much each song's color is its region color (the rest is star).
		get mix(): Float32Array {
			return current.mix;
		},
		get settled(): boolean {
			return settled;
		},
		// Not reactive: read it while drawing.
		get progress(): number {
			return progress;
		},
		get positionsVersion(): number {
			return positionsVersion;
		}
	};
};
