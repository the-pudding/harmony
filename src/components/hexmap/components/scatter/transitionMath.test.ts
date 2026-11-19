import { describe, expect, it } from "vitest";
import { easeCubicInOut } from "d3";
import {
	STAGGER_SPAN,
	beginTransition,
	createChannels,
	stepFade,
	stepTransition,
	type Channels
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

// A transition from current to target, ready to step.
const setUp = (
	current: Channels,
	target: Channels,
	stagger: Float32Array | null = null
) => {
	const count = current.x.length;
	const from = createChannels(count);
	const to = createChannels(count);
	const startAt = new Float32Array(count);
	const changed = beginTransition(current, target, stagger, from, to, startAt);
	const at = (t: number) => {
		stepTransition(from, to, current, startAt, t, easeCubicInOut);
		return current;
	};
	return { from, to, startAt, changed, at };
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
		const { startAt, at } = setUp(current, channels([1, 1], [0, 0]), stagger);
		expect(startAt[0]).toBe(0);
		expect(startAt[1]).toBeCloseTo(STAGGER_SPAN);
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
