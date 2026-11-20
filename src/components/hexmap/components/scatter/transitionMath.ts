// Transition math on typed arrays mutated in place, so frames allocate nothing.

// One value per song, by song index. mix: 0 = star white, 1 = region color.
export type Channels = {
	x: Float32Array;
	y: Float32Array;
	alpha: Float32Array;
	mix: Float32Array;
};

export type Easing = (t: number) => number;

// Latest start, as a fraction of the transition, for stagger[i] = 1.
export const STAGGER_SPAN = 0.4;

// With a window, every song runs over the same fraction of the transition,
// so a front sweeps across the songs.
export const staggerStart = (stagger: number, window: number | null): number =>
	stagger * (window === null ? STAGGER_SPAN : 1 - window);

export const createChannels = (count: number): Channels => ({
	x: new Float32Array(count),
	y: new Float32Array(count),
	alpha: new Float32Array(count),
	mix: new Float32Array(count)
});

export const copyChannels = (source: Channels, into: Channels): void => {
	into.x.set(source.x);
	into.y.set(source.y);
	into.alpha.set(source.alpha);
	into.mix.set(source.mix);
};

// Writes endpoints into from/to and each song's start fraction into startAt.
// A song the target doesn't place (NaN) fades out in place; a song with no
// position yet fades in at its target. Returns whether anything will move.
export const beginTransition = (
	current: Channels,
	target: Channels,
	stagger: Float32Array | null,
	from: Channels,
	to: Channels,
	startAt: Float32Array,
	window: number | null = null
): boolean => {
	let changed = false;
	for (let i = 0; i < current.x.length; i++) {
		const placed = !Number.isNaN(target.x[i]) && !Number.isNaN(target.y[i]);
		const hasPosition = !Number.isNaN(current.x[i]);
		to.x[i] = placed ? target.x[i] : current.x[i];
		to.y[i] = placed ? target.y[i] : current.y[i];
		to.alpha[i] = placed ? target.alpha[i] : 0;
		from.x[i] = hasPosition ? current.x[i] : to.x[i];
		from.y[i] = hasPosition ? current.y[i] : to.y[i];
		from.alpha[i] = current.alpha[i];
		to.mix[i] = target.mix[i];
		from.mix[i] = hasPosition ? current.mix[i] : to.mix[i];
		startAt[i] = stagger ? staggerStart(clamp01(stagger[i]), window) : 0;
		if (
			from.x[i] !== to.x[i] ||
			from.y[i] !== to.y[i] ||
			from.alpha[i] !== to.alpha[i] ||
			from.mix[i] !== to.mix[i]
		) {
			changed = true;
		}
	}
	return changed;
};

// Writes each song's value at t (0–1) into current.
export const stepTransition = (
	from: Channels,
	to: Channels,
	current: Channels,
	startAt: Float32Array,
	t: number,
	easing: Easing,
	window: number | null = null
): void => {
	const count = current.x.length;
	if (t >= 1) {
		copyChannels(to, current);
		return;
	}
	for (let i = 0; i < count; i++) {
		const start = startAt[i];
		const local =
			window !== null
				? (t - start) / window
				: start === 0
					? t
					: (t - start) / (1 - start);
		const eased = local <= 0 ? 0 : local >= 1 ? 1 : easing(local);
		current.x[i] = from.x[i] + (to.x[i] - from.x[i]) * eased;
		current.y[i] = from.y[i] + (to.y[i] - from.y[i]) * eased;
		current.alpha[i] = from.alpha[i] + (to.alpha[i] - from.alpha[i]) * eased;
		current.mix[i] = from.mix[i] + (to.mix[i] - from.mix[i]) * eased;
	}
};

// Reduced-motion stepTransition: a moving song fades out in place, then in at
// its destination; a stationary one fades to its new alpha.
export const stepCrossfade = (
	from: Channels,
	to: Channels,
	current: Channels,
	t: number
): void => {
	if (t >= 1) {
		copyChannels(to, current);
		return;
	}
	const count = current.x.length;
	for (let i = 0; i < count; i++) {
		if (from.x[i] === to.x[i] && from.y[i] === to.y[i]) {
			current.x[i] = to.x[i];
			current.y[i] = to.y[i];
			current.alpha[i] = from.alpha[i] + (to.alpha[i] - from.alpha[i]) * t;
			current.mix[i] = from.mix[i] + (to.mix[i] - from.mix[i]) * t;
			continue;
		}
		const leaving = t < 0.5;
		const side = leaving ? from : to;
		current.x[i] = side.x[i];
		current.y[i] = side.y[i];
		current.mix[i] = side.mix[i];
		current.alpha[i] = side.alpha[i] * Math.abs(1 - 2 * t);
	}
};

const clamp01 = (value: number): number =>
	Number.isNaN(value) ? 0 : Math.min(1, Math.max(0, value));

// A single value (e.g. an opacity) after elapsedMs moving straight toward
// target: rising by 1 every riseMs, falling by 1 every fallMs.
export const stepFade = (
	current: number,
	target: number,
	elapsedMs: number,
	riseMs: number,
	fallMs: number
): number =>
	target > current
		? Math.min(target, current + elapsedMs / Math.max(1, riseMs))
		: Math.max(target, current - elapsedMs / Math.max(1, fallMs));
