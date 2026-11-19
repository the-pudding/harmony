import { describe, expect, it } from "vitest";
import { COLOR_MIX_STEPS } from "./constants.js";
import { createMixFill, mixStep, STAR_FILL } from "./colorMix.js";

describe("mixStep", () => {
	it("rounds to COLOR_MIX_STEPS steps and clamps", () => {
		expect(mixStep(0)).toBe(0);
		expect(mixStep(1)).toBe(COLOR_MIX_STEPS);
		expect(mixStep(0.5)).toBe(COLOR_MIX_STEPS / 2);
		expect(mixStep(0.01)).toBe(0);
		expect(mixStep(-1)).toBe(0);
		expect(mixStep(2)).toBe(COLOR_MIX_STEPS);
	});

	it("gives few distinct values over a whole transition", () => {
		const steps = new Set<number>();
		for (let i = 0; i <= 1000; i++) steps.add(mixStep(i / 1000));
		expect(steps.size).toBe(COLOR_MIX_STEPS + 1);
	});
});

describe("createMixFill", () => {
	const fill = createMixFill(() => "#3987e5");

	it("sits between star white and the region color", () => {
		expect(fill("a", 1)).toMatch(/^rgba\(22\d,22\d,23\d,0\.85\d*\)$/);
		const channels = (step: number) =>
			fill("a", step).match(/\d+/g)!.slice(0, 3).map(Number);
		const [r1] = channels(1);
		const [r12] = channels(12);
		const [r23] = channels(23);
		expect(r1).toBeGreaterThan(r12);
		expect(r12).toBeGreaterThan(r23);
		expect(r23).toBeGreaterThan(0x39);
		expect(r1).toBeLessThan(228);
	});

	it("caches strings per song and step", () => {
		expect(fill("b", 7)).toBe(fill("b", 7));
		expect(fill("b", 7)).not.toBe(fill("b", 8));
	});

	it("reads each song's own color", () => {
		const bySong = createMixFill((songKey) =>
			songKey === "red" ? "#ff0000" : "#0000ff"
		);
		expect(bySong("red", 12)).not.toBe(bySong("blue", 12));
	});

	it("starts at the star fill", () => {
		expect(STAR_FILL).toBe("rgba(228,228,231,0.85)");
	});
});
