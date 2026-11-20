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

// Writes endpoints into from/to and each song's [start, end] fraction of the
// transition into startAt/endAt. A song the target doesn't place (NaN) fades
// out in place; a song with no position yet fades in at its target. Returns
// whether anything will move.
export const beginTransition = (
	current: Channels,
	target: Channels,
	stagger: Float32Array | null,
	from: Channels,
	to: Channels,
	startAt: Float32Array,
	endAt: Float32Array,
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
		endAt[i] = window === null || !stagger ? 1 : startAt[i] + window;
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

// Songs move in stages, one after another and pauseMs apart. A stage's songs
// move together, except in the last, where their stagger spreads their starts.
export type StagePlan = {
	// Per song, the stage (0 first) it moves in; beyond the last means the last.
	stageOf: Uint8Array;
	stageMs: readonly number[];
	pauseMs: number;
};

export const stagedDurationMs = ({ stageMs, pauseMs }: StagePlan): number =>
	stageMs.reduce((total, ms) => total + ms, 0) +
	pauseMs * Math.max(0, stageMs.length - 1);

const stageStartMs = ({ stageMs, pauseMs }: StagePlan, stage: number): number =>
	stageMs.slice(0, stage).reduce((total, ms) => total + ms + pauseMs, 0);

// As a fraction of the whole staged transition.
export const lastStageStart = (plan: StagePlan): number =>
	stageStartMs(plan, plan.stageMs.length - 1) /
	Math.max(1, stagedDurationMs(plan));

// Writes each song's [start, end] fraction of the staged transition.
export const writeStageWindows = (
	plan: StagePlan,
	stagger: Float32Array | null,
	startAt: Float32Array,
	endAt: Float32Array
): void => {
	const total = Math.max(1, stagedDurationMs(plan));
	const last = plan.stageMs.length - 1;
	const starts = plan.stageMs.map(
		(_, stage) => stageStartMs(plan, stage) / total
	);
	const ends = plan.stageMs.map((ms, stage) => starts[stage] + ms / total);
	for (let i = 0; i < startAt.length; i++) {
		const stage = Math.min(plan.stageOf[i], last);
		const start = starts[stage];
		const spread =
			stage === last && stagger
				? staggerStart(clamp01(stagger[i]), null) * (ends[stage] - start)
				: 0;
		startAt[i] = start + spread;
		endAt[i] = ends[stage];
	}
};

// Writes each song's value at t (0–1) into current; a song holds its from
// values until its start and reaches its to values at its end.
export const stepTransition = (
	from: Channels,
	to: Channels,
	current: Channels,
	startAt: Float32Array,
	endAt: Float32Array,
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
		const span = endAt[i] - start;
		const local = span > 0 ? (t - start) / span : t < start ? 0 : 1;
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
