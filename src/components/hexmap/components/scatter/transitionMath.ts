// The pure math behind the map's transitions (see transition.svelte.ts):
// every song's x, y and alpha move from where they were to where they're
// going, as typed arrays mutated in place, so a frame allocates nothing.

// One value per song, by song index, for each animated channel.
export type Channels = {
	x: Float32Array;
	y: Float32Array;
	alpha: Float32Array;
};

export type Easing = (t: number) => number;

// With a stagger, song i starts this fraction of the way into the
// transition at most (stagger[i] = 1), then runs over the rest of it.
export const STAGGER_SPAN = 0.4;

export const createChannels = (count: number): Channels => ({
	x: new Float32Array(count),
	y: new Float32Array(count),
	alpha: new Float32Array(count)
});

export const copyChannels = (source: Channels, into: Channels): void => {
	into.x.set(source.x);
	into.y.set(source.y);
	into.alpha.set(source.alpha);
};

// Sets up a transition from what's drawn now (current) to target, writing
// its endpoints into from and to and each song's start time into startAt
// (a fraction of the duration). A song the target doesn't place (NaN x or
// y) stays where it is and fades out; a song with no position yet starts
// at its target (so it fades in there rather than flying in). Returns
// whether anything will move.
export const beginTransition = (
	current: Channels,
	target: Channels,
	stagger: Float32Array | null,
	from: Channels,
	to: Channels,
	startAt: Float32Array
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
		startAt[i] = stagger ? clamp01(stagger[i]) * STAGGER_SPAN : 0;
		if (
			from.x[i] !== to.x[i] ||
			from.y[i] !== to.y[i] ||
			from.alpha[i] !== to.alpha[i]
		) {
			changed = true;
		}
	}
	return changed;
};

// Writes every song's value at t (0–1 through the transition) into
// current: song i holds still until startAt[i], then eases to its target
// by t = 1.
export const stepTransition = (
	from: Channels,
	to: Channels,
	current: Channels,
	startAt: Float32Array,
	t: number,
	easing: Easing
): void => {
	const count = current.x.length;
	if (t >= 1) {
		copyChannels(to, current);
		return;
	}
	for (let i = 0; i < count; i++) {
		const start = startAt[i];
		const local = start === 0 ? t : (t - start) / (1 - start);
		const eased = local <= 0 ? 0 : easing(local);
		current.x[i] = from.x[i] + (to.x[i] - from.x[i]) * eased;
		current.y[i] = from.y[i] + (to.y[i] - from.y[i]) * eased;
		current.alpha[i] = from.alpha[i] + (to.alpha[i] - from.alpha[i]) * eased;
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
