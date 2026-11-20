import { untrack } from "svelte";
import { easeCubicInOut } from "d3";
import {
	beginTransition,
	copyChannels,
	createChannels,
	stepCrossfade,
	stepTransition,
	type Channels
} from "./transitionMath.js";

// Per-song targets by song index: x, y (0–1 across the plot; NaN = not
// placed, fades out in place), alpha, mix (0 = star white, 1 = region color),
// plus optional stagger (0–1 per song) and staggerWindow.
export type TransitionTarget = Channels & {
	stagger?: Float32Array | null;
	staggerWindow?: number | null;
};

// delayMs holds songs still before moving; crossfade (reduced motion) fades
// instead of flying; staggered false ignores the target's stagger.
export type TransitionTiming = {
	durationMs: number;
	instant?: boolean;
	delayMs?: number;
	staggered?: boolean;
	crossfade?: boolean;
};

// Animates songs to each new target, calling onFrame per step. Channels are
// typed arrays mutated in place outside Svelte's graph; only `settled` is
// reactive. The first target, a new song count, or `instant` timing appears
// at once. A new target mid-flight starts from where songs are drawn.
// timing(next, previous) is asked for each target that changes what's drawn.
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
	// Bumped when songs come to rest at new positions, never mid-flight.
	let positionsVersion = 0;
	let previousTarget: Target | null = null;
	// Whole-transition progress, 0–1 (1 at rest), ignoring per-song stagger.
	let progress = 1;
	let window: number | null = null;

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

		window = target.stagger ? (target.staggerWindow ?? null) : null;
		const changed = beginTransition(
			current,
			target,
			target.stagger ?? null,
			from,
			to,
			startAt,
			window
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

		const crossfade = timing.crossfade === true;
		if (timing.staggered === false || crossfade) {
			startAt.fill(0);
			window = null;
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
			if (crossfade) stepCrossfade(from, to, current, t);
			else {
				stepTransition(from, to, current, startAt, t, easeCubicInOut, window);
			}
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
		get x(): Float32Array {
			return current.x;
		},
		get y(): Float32Array {
			return current.y;
		},
		get alpha(): Float32Array {
			return current.alpha;
		},
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
