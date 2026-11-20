import { describe, expect, it } from "vitest";
import { easeCubicInOut } from "d3";
import {
	STAGGER_SPAN,
	beginTransition,
	createChannels,
	createWindows,
	lastMoveStart,
	stagedDurationMs,
	stepCrossfade,
	stepFade,
	stepTransition,
	writeStageWindows,
	type Channels,
	type StagePlan
} from "./transitionMath.js";

const channels = (
	x: number[],
	y: number[],
	alpha: number[] = x.map(() => 1),
	mix: number[] = x.map(() => 0)
): Channels => ({
	x: Float32Array.from(x),
	y: Float32Array.from(y),
	alpha: Float32Array.from(alpha),
	mix: Float32Array.from(mix)
});

const setUp = (
	current: Channels,
	target: Channels,
	stagger: Float32Array | null = null
) => {
	const count = current.x.length;
	const from = createChannels(count);
	const to = createChannels(count);
	const windows = createWindows(count);
	const changed = beginTransition(current, target, stagger, from, to, windows);
	const at = (t: number) => {
		stepTransition(from, to, current, windows, t, easeCubicInOut);
		return current;
	};
	return { from, to, windows, changed, at };
};

describe("stepTransition", () => {
	it("starts at the current values and ends exactly at the target", () => {
		const current = channels([0, 0.5], [0, 1], [1, 0]);
		const { at } = setUp(current, channels([1, 0.25], [0.5, 0], [1, 1]));
		expect([...at(0).x]).toEqual([0, 0.5]);
		expect([...at(0).alpha]).toEqual([1, 0]);
		const end = at(1);
		expect([...end.x]).toEqual([1, 0.25]);
		expect([...end.y]).toEqual([0.5, 0]);
		expect([...end.alpha]).toEqual([1, 1]);
	});

	it("moves monotonically toward the target", () => {
		const current = channels([0], [1], [0]);
		const { at } = setUp(current, channels([1], [0], [1]));
		let previous = -Infinity;
		for (let t = 0; t <= 1.0001; t += 0.05) {
			const value = at(Math.min(t, 1)).x[0];
			expect(value).toBeGreaterThanOrEqual(previous);
			expect(at(Math.min(t, 1)).y[0]).toBeCloseTo(1 - value, 5);
			previous = value;
		}
	});

	it("holds a staggered song still until its start, then catches up by the end", () => {
		const current = channels([0, 0], [0, 0]);
		const stagger = Float32Array.from([0, 1]);
		const { windows, at } = setUp(current, channels([1, 1], [0, 0]), stagger);
		expect(windows.moveStart[0]).toBe(0);
		expect(windows.moveStart[1]).toBeCloseTo(STAGGER_SPAN);
		const early = at(STAGGER_SPAN * 0.9);
		expect(early.x[0]).toBeGreaterThan(0);
		expect(early.x[1]).toBe(0);
		const later = at((1 + STAGGER_SPAN) / 2);
		expect(later.x[1]).toBeGreaterThan(0);
		expect(later.x[1]).toBeLessThan(later.x[0]);
		expect([...at(1).x]).toEqual([1, 1]);
	});

	it("retargets from wherever songs are drawn mid-flight", () => {
		const current = channels([0], [0]);
		const first = setUp(current, channels([1], [1]));
		const midway = first.at(0.5).x[0];
		expect(midway).toBeGreaterThan(0);
		expect(midway).toBeLessThan(1);

		const second = setUp(current, channels([0], [0]));
		expect(second.from.x[0]).toBe(midway);
		expect(second.at(0).x[0]).toBe(midway);
		expect(second.at(1).x[0]).toBe(0);
	});
});

describe("color mix", () => {
	it("eases with each song's position, staggered like it", () => {
		const current = channels([0, 0], [0, 0], [1, 1], [1, 1]);
		const stagger = Float32Array.from([0, 1]);
		const { at } = setUp(
			current,
			channels([1, 1], [0, 0], [1, 1], [0, 0]),
			stagger
		);
		expect([...at(0).mix]).toEqual([1, 1]);
		const early = at(STAGGER_SPAN * 0.9);
		expect(early.mix[0]).toBeLessThan(1);
		expect(early.mix[1]).toBe(1);
		const mid = at(0.5);
		expect(mid.mix[0]).toBeCloseTo(1 - mid.x[0], 5);
		expect([...at(1).mix]).toEqual([0, 0]);
	});

	it("counts as a change, and retargets from the color drawn now", () => {
		const current = channels([0.2], [0.3], [1], [1]);
		expect(setUp(current, channels([0.2], [0.3], [1], [1])).changed).toBe(
			false
		);
		const first = setUp(current, channels([0.2], [0.3], [1], [0]));
		expect(first.changed).toBe(true);
		const midway = first.at(0.5).mix[0];
		expect(midway).toBeGreaterThan(0);
		expect(midway).toBeLessThan(1);
		const second = setUp(current, channels([0.2], [0.3], [1], [1]));
		expect(second.from.mix[0]).toBe(midway);
	});

	it("takes a song with no position yet straight to its target color", () => {
		const current = channels([NaN], [NaN], [0], [0]);
		const { from } = setUp(current, channels([0.6], [0.4], [1], [1]));
		expect(from.mix[0]).toBe(1);
	});
});

describe("beginTransition", () => {
	it("reports no change when the target is where songs already are", () => {
		const current = channels([0.2], [0.3], [1]);
		expect(setUp(current, channels([0.2], [0.3], [1])).changed).toBe(false);
		expect(setUp(current, channels([0.2], [0.3], [0])).changed).toBe(true);
	});

	it("fades out an unplaced song where it is", () => {
		const current = channels([0.2], [0.3], [1]);
		const { to } = setUp(current, channels([NaN], [NaN], [1]));
		expect(to.x[0]).toBeCloseTo(0.2);
		expect(to.y[0]).toBeCloseTo(0.3);
		expect(to.alpha[0]).toBe(0);
	});

	it("fades a song with no position yet in at its target", () => {
		const current = channels([NaN], [NaN], [0]);
		const { from, at } = setUp(current, channels([0.6], [0.4], [1]));
		expect(from.x[0]).toBeCloseTo(0.6);
		const midway = at(0.5);
		expect(midway.x[0]).toBeCloseTo(0.6);
		expect(midway.alpha[0]).toBeCloseTo(0.5);
	});
});

describe("a stagger window", () => {
	it("runs each song over the window from its own start", () => {
		const current = channels([0, 0], [0, 0], [0, 0]);
		const target = channels([0, 0], [0, 0], [1, 1]);
		const count = 2;
		const from = createChannels(count);
		const to = createChannels(count);
		const windows = createWindows(count);
		beginTransition(
			current,
			target,
			Float32Array.from([0, 1]),
			from,
			to,
			windows,
			0.25
		);
		expect(windows.moveStart[0]).toBe(0);
		expect(windows.moveStart[1]).toBeCloseTo(0.75);
		expect(windows.moveEnd[0]).toBeCloseTo(0.25);
		expect(windows.moveEnd[1]).toBeCloseTo(1);
		const at = (t: number) => {
			stepTransition(from, to, current, windows, t, (x) => x);
			return [...current.alpha];
		};
		expect(at(0.125)[0]).toBeCloseTo(0.5);
		expect(at(0.3)).toEqual([1, 0]);
		expect(at(0.875)[1]).toBeCloseTo(0.5);
	});
});

describe("staged transitions", () => {
	// Two cluster stages (tint 50, move 100) and a last stage (move 200),
	// 50 ms apart; songs waiting dim to 0.3 over the first 50 ms. 600 ms in all.
	const plan = (stageOf: number[]): StagePlan => ({
		stageOf: Uint8Array.from(stageOf),
		stages: [
			{ tintMs: 50, moveMs: 100 },
			{ tintMs: 50, moveMs: 100 },
			{ tintMs: 0, moveMs: 200 }
		],
		pauseMs: 50,
		dimAlpha: 0.3,
		dimMs: 50
	});
	const ms = (value: number) => value / 600;

	const staged = (current: Channels, target: Channels, stageOf: number[]) => {
		const run = setUp(current, target);
		writeStageWindows(plan(stageOf), null, run.windows);
		return run;
	};

	it("moves an easeOut stage's songs decelerating, and the rest eased in and out", () => {
		const easedPlan = plan([0, 2]);
		const run = setUp(channels([0, 0], [0, 0]), channels([1, 1], [0, 0]));
		writeStageWindows(
			{
				...easedPlan,
				stages: easedPlan.stages.map((stage, index) =>
					index === 0 ? { ...stage, easeOut: true } : stage
				)
			},
			null,
			run.windows
		);
		expect(Array.from(run.windows.easeOut)).toEqual([1, 0]);
		// A quarter of the way through the first stage's move: ahead of a
		// linear move when easing out, behind it when easing in and out.
		const { x } = run.at(ms(75));
		expect(x[0]).toBeGreaterThan(0.25);
		expect(x[1]).toBe(0);
		const last = run.at(ms(450)).x[1];
		expect(last).toBeLessThan(0.25);
	});

	it("adds up the stages and the pauses between them", () => {
		expect(stagedDurationMs(plan([]))).toBe(600);
		expect(lastMoveStart(plan([]))).toBeCloseTo(ms(400));
	});

	it("tints a cluster stage before moving it, and spreads only the last by stagger", () => {
		const windows = createWindows(4);
		const stagger = Float32Array.from([1, 1, 0, 1]);
		writeStageWindows(plan([0, 1, 2, 9]), stagger, windows);
		const { moveStart, moveEnd, tintStart, tintEnd } = windows;
		expect([tintStart[0], tintEnd[0]]).toEqual([0, expect.closeTo(ms(50))]);
		expect([moveStart[0], moveEnd[0]]).toEqual([
			expect.closeTo(ms(50)),
			expect.closeTo(ms(150))
		]);
		expect(tintStart[1]).toBeCloseTo(ms(200));
		expect(moveStart[1]).toBeCloseTo(ms(250));
		expect(moveEnd[1]).toBeCloseTo(ms(350));
		expect(moveStart[2]).toBeCloseTo(ms(400));
		expect(moveStart[3]).toBeCloseTo(ms(400 + STAGGER_SPAN * 200));
		expect([tintStart[3], tintEnd[3]]).toEqual([moveStart[3], moveEnd[3]]);
		expect(moveEnd[2]).toBe(1);
		expect(moveEnd[3]).toBe(1);
	});

	it("colors a cluster stage in place, then moves it already colored", () => {
		const current = channels([0], [0], [1], [0]);
		const { at } = staged(current, channels([1], [1], [1], [1]), [0]);
		const tinting = at(ms(25));
		expect(tinting.x[0]).toBe(0);
		expect(tinting.mix[0]).toBeGreaterThan(0);
		expect(tinting.mix[0]).toBeLessThan(1);
		const tinted = at(ms(50));
		expect([tinted.x[0], tinted.mix[0]]).toEqual([0, 1]);
		const moving = at(ms(100));
		expect(moving.x[0]).toBeGreaterThan(0);
		expect(moving.mix[0]).toBe(1);
		expect(at(ms(150)).x[0]).toBe(1);
	});

	it("dims songs waiting for a later stage, and holds them dim until it", () => {
		const current = channels([0, 0, 0], [0, 0, 0], [1, 1, 0.2], [0, 0, 0]);
		const target = channels([1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]);
		const { at } = staged(current, target, [0, 1, 2]);
		const dimming = at(ms(25));
		expect(dimming.alpha[0]).toBe(1);
		expect(dimming.alpha[1]).toBeLessThan(1);
		expect(dimming.alpha[1]).toBeGreaterThan(0.3);
		const waiting = at(ms(199));
		expect(waiting.alpha[0]).toBe(1);
		expect(waiting.alpha[1]).toBeCloseTo(0.3);
		expect(waiting.alpha[2]).toBeCloseTo(0.2);
		expect([waiting.x[1], waiting.mix[1]]).toEqual([0, 0]);
		const clusterTinted = at(ms(250));
		expect([clusterTinted.alpha[1], clusterTinted.mix[1]]).toEqual([1, 1]);
		expect(clusterTinted.x[1]).toBeCloseTo(0, 5);
		expect(clusterTinted.alpha[2]).toBeCloseTo(0.2);
		const lastMoving = at(ms(500));
		expect(lastMoving.alpha[2]).toBeGreaterThan(0.2);
		expect(lastMoving.alpha[2]).toBeLessThan(1);
		expect(lastMoving.mix[2]).toBeCloseTo(lastMoving.x[2], 5);
	});

	it("ends exactly at the target", () => {
		const current = channels([0, 0, 0], [0, 0, 0], [1, 1, 1], [0, 0, 0]);
		const target = channels(
			[0.1, 0.2, 0.3],
			[0.4, 0.5, 0.6],
			[1, 0.5, 0],
			[1, 1, 0.5]
		);
		const end = staged(current, target, [0, 1, 2]).at(1);
		expect(end).toEqual(target);
	});

	it("leaves the next transition undimmed", () => {
		const current = channels([0, 0], [0, 0], [1, 1], [0, 0]);
		const target = channels([1, 1], [1, 1], [1, 1], [1, 1]);
		staged(current, target, [0, 1]).at(ms(100));
		const { at } = setUp(current, channels([0, 0], [0, 0], [1, 1], [0, 0]));
		const midway = at(0.5);
		expect(midway.alpha[0]).toBe(1);
		expect(midway.alpha[1]).toBeGreaterThan(0.3);
		expect(at(1).alpha[1]).toBe(1);
	});
});

describe("stepCrossfade", () => {
	it("fades a moving song out where it was, then in where it's going", () => {
		const current = channels([0.2], [0.2], [1], [0]);
		const { from, to } = setUp(current, channels([0.8], [0.6], [1], [1]));
		stepCrossfade(from, to, current, 0.25);
		expect(current.x[0]).toBeCloseTo(0.2);
		expect(current.alpha[0]).toBeCloseTo(0.5);
		expect(current.mix[0]).toBe(0);
		stepCrossfade(from, to, current, 0.75);
		expect(current.x[0]).toBeCloseTo(0.8);
		expect(current.y[0]).toBeCloseTo(0.6);
		expect(current.alpha[0]).toBeCloseTo(0.5);
		expect(current.mix[0]).toBe(1);
		stepCrossfade(from, to, current, 1);
		expect(current.alpha[0]).toBe(1);
	});

	it("fades a song that stays put straight to its new alpha", () => {
		const current = channels([0.2], [0.2], [1]);
		const { from, to } = setUp(current, channels([0.2], [0.2], [0.35]));
		stepCrossfade(from, to, current, 0.5);
		expect(current.alpha[0]).toBeCloseTo(0.675);
	});
});

describe("stepFade", () => {
	it("rises and falls at their own rates", () => {
		expect(stepFade(0, 1, 250, 500, 200)).toBe(0.5);
		expect(stepFade(1, 0, 100, 500, 200)).toBe(0.5);
	});

	it("stops at the target", () => {
		expect(stepFade(0.9, 1, 500, 500, 200)).toBe(1);
		expect(stepFade(0.1, 0, 500, 500, 200)).toBe(0);
		expect(stepFade(0.4, 0.4, 16, 500, 200)).toBe(0.4);
	});
});
