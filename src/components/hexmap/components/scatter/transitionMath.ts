// Transition math on typed arrays mutated in place, so frames allocate nothing.
import { easeCubicOut } from "d3";

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

// Per song, as fractions of the transition: position moves over
// [moveStart, moveEnd], color and alpha change over [tintStart, tintEnd], and
// before that alpha eases down to at most dimAlpha over [0, dimEnd]. A song
// with easeOut set moves decelerating (see Stage).
export type SongWindows = {
	moveStart: Float32Array;
	moveEnd: Float32Array;
	tintStart: Float32Array;
	tintEnd: Float32Array;
	dimAlpha: Float32Array;
	easeOut: Uint8Array;
	dimEnd: number;
};

const UNDIMMED_ALPHA = Infinity;

export const createWindows = (count: number): SongWindows => ({
	moveStart: new Float32Array(count),
	moveEnd: new Float32Array(count),
	tintStart: new Float32Array(count),
	tintEnd: new Float32Array(count),
	dimAlpha: new Float32Array(count).fill(UNDIMMED_ALPHA),
	easeOut: new Uint8Array(count),
	dimEnd: 0
});

// Every song changes everything over the whole transition.
export const writeWholeWindows = (windows: SongWindows): void => {
	windows.moveStart.fill(0);
	windows.moveEnd.fill(1);
	windows.tintStart.fill(0);
	windows.tintEnd.fill(1);
	windows.dimAlpha.fill(UNDIMMED_ALPHA);
	windows.easeOut.fill(0);
	windows.dimEnd = 0;
};

// Writes endpoints into from/to and each song's windows, tinting as it moves.
// A song the target doesn't place (NaN) fades out in place; a song with no
// position yet fades in at its target. Returns whether anything will move.
export const beginTransition = (
	current: Channels,
	target: Channels,
	stagger: Float32Array | null,
	from: Channels,
	to: Channels,
	windows: SongWindows,
	window: number | null = null
): boolean => {
	let changed = false;
	const { moveStart, moveEnd, tintStart, tintEnd } = windows;
	windows.dimAlpha.fill(UNDIMMED_ALPHA);
	windows.dimEnd = 0;
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
		moveStart[i] = stagger ? staggerStart(clamp01(stagger[i]), window) : 0;
		moveEnd[i] = window === null || !stagger ? 1 : moveStart[i] + window;
		tintStart[i] = moveStart[i];
		tintEnd[i] = moveEnd[i];
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

// A stage's songs tint in place for tintMs, then move for moveMs; with no
// tintMs they tint as they move.
// easeOut: songs set off at speed and slow to a stop, instead of easing in
// and out, so ones flying in from far off screen show up at once rather
// than spending most of their move out of sight.
export type Stage = { tintMs: number; moveMs: number; easeOut?: boolean };

// Songs move in stages, one after another and pauseMs apart. A stage's songs
// move together, except in the last, where their stagger spreads their
// starts. Songs waiting for a later stage dim to dimAlpha over the first
// dimMs, and brighten as their stage tints them.
export type StagePlan = {
	// Per song, the stage (0 first) it moves in; beyond the last means the last.
	stageOf: Uint8Array;
	stages: readonly Stage[];
	pauseMs: number;
	dimAlpha: number;
	dimMs: number;
};

const stageMs = ({ tintMs, moveMs }: Stage): number => tintMs + moveMs;

export const stagedDurationMs = ({ stages, pauseMs }: StagePlan): number =>
	stages.reduce((total, stage) => total + stageMs(stage), 0) +
	pauseMs * Math.max(0, stages.length - 1);

const stageStartMs = ({ stages, pauseMs }: StagePlan, stage: number): number =>
	stages
		.slice(0, stage)
		.reduce((total, previous) => total + stageMs(previous) + pauseMs, 0);

// When the last stage's songs start moving, as a fraction of the whole staged
// transition.
export const lastMoveStart = (plan: StagePlan): number => {
	const last = plan.stages.length - 1;
	return (
		(stageStartMs(plan, last) + plan.stages[last].tintMs) /
		Math.max(1, stagedDurationMs(plan))
	);
};

// Writes each song's windows for the staged transition.
export const writeStageWindows = (
	plan: StagePlan,
	stagger: Float32Array | null,
	windows: SongWindows
): void => {
	const total = Math.max(1, stagedDurationMs(plan));
	const last = plan.stages.length - 1;
	const tintStarts = plan.stages.map(
		(_, stage) => stageStartMs(plan, stage) / total
	);
	const moveStarts = plan.stages.map(
		({ tintMs }, stage) => tintStarts[stage] + tintMs / total
	);
	const moveEnds = plan.stages.map(
		({ moveMs }, stage) => moveStarts[stage] + moveMs / total
	);
	const { moveStart, moveEnd, tintStart, tintEnd, dimAlpha, easeOut } = windows;
	for (let i = 0; i < moveStart.length; i++) {
		const stage = Math.min(plan.stageOf[i], last);
		const tintsWhileMoving = plan.stages[stage].tintMs <= 0;
		const spread =
			stage === last && stagger
				? staggerStart(clamp01(stagger[i]), null) *
					(moveEnds[stage] - moveStarts[stage])
				: 0;
		moveStart[i] = moveStarts[stage] + spread;
		moveEnd[i] = moveEnds[stage];
		tintStart[i] = tintsWhileMoving ? moveStart[i] : tintStarts[stage];
		tintEnd[i] = tintsWhileMoving ? moveEnd[i] : moveStarts[stage];
		dimAlpha[i] = stage > 0 ? plan.dimAlpha : UNDIMMED_ALPHA;
		easeOut[i] = plan.stages[stage].easeOut ? 1 : 0;
	}
	windows.dimEnd = plan.dimMs / total;
};

// Eased progress through [start, end] at t; a zero-length window is a step.
const through = (
	t: number,
	start: number,
	end: number,
	easing: Easing
): number => {
	const span = end - start;
	const local = span > 0 ? (t - start) / span : t < start ? 0 : 1;
	return local <= 0 ? 0 : local >= 1 ? 1 : easing(local);
};

// Writes each song's value at t (0–1) into current; a song holds its from
// values until its windows open and reaches its to values as they close.
export const stepTransition = (
	from: Channels,
	to: Channels,
	current: Channels,
	windows: SongWindows,
	t: number,
	easing: Easing
): void => {
	const count = current.x.length;
	if (t >= 1) {
		copyChannels(to, current);
		return;
	}
	const { moveStart, moveEnd, tintStart, tintEnd, dimAlpha, easeOut } = windows;
	const dimmed = through(t, 0, windows.dimEnd, easing);
	for (let i = 0; i < count; i++) {
		const moved = through(
			t,
			moveStart[i],
			moveEnd[i],
			easeOut[i] ? easeCubicOut : easing
		);
		const tinted = through(t, tintStart[i], tintEnd[i], easing);
		const waitingAlpha = Math.min(from.alpha[i], dimAlpha[i]);
		const alpha = from.alpha[i] + (waitingAlpha - from.alpha[i]) * dimmed;
		current.x[i] = from.x[i] + (to.x[i] - from.x[i]) * moved;
		current.y[i] = from.y[i] + (to.y[i] - from.y[i]) * moved;
		current.alpha[i] = alpha + (to.alpha[i] - alpha) * tinted;
		current.mix[i] = from.mix[i] + (to.mix[i] - from.mix[i]) * tinted;
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
