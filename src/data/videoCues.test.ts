import { describe, expect, it } from "vitest";
import { cueAt, videoCues } from "./videoCues.js";

const cues = [0, 10, 20, 30].map((startSeconds) => ({ startSeconds }));

describe("cueAt", () => {
	it("is -1 without cues", () => {
		expect(cueAt([], 5)).toBe(-1);
	});

	it("picks the last cue that has started", () => {
		expect(cueAt(cues, 0)).toBe(0);
		expect(cueAt(cues, 9.99)).toBe(0);
		expect(cueAt(cues, 10)).toBe(1);
		expect(cueAt(cues, 25)).toBe(2);
		expect(cueAt(cues, 30)).toBe(3);
		expect(cueAt(cues, 999)).toBe(3);
	});

	it("shows the first cue before it starts", () => {
		expect(cueAt([{ startSeconds: 2 }, { startSeconds: 4 }], 1)).toBe(0);
		expect(cueAt([{ startSeconds: 2 }], -1)).toBe(0);
	});

	it("handles a single cue", () => {
		expect(cueAt([{ startSeconds: 0 }], 50)).toBe(0);
	});
});

describe("videoCues", () => {
	it("lists the examples video's 38 songs in order, sorted by time", () => {
		const examples = videoCues.examples;
		expect(examples).toHaveLength(38);
		expect(examples[0]).toMatchObject({
			song: "Don't Stop Believing",
			songKey: "journey__dont-stop-believin",
			startSeconds: 0
		});
		for (let i = 1; i < examples.length; i++) {
			expect(examples[i].startSeconds).toBeGreaterThan(
				examples[i - 1].startSeconds
			);
		}
		expect(examples.filter((cue) => cue.songKey !== null)).toHaveLength(21);
		expect(examples.at(-1)!.startSeconds).toBeLessThan(33.218);
	});

	it("has no cues for dead-simple", () => {
		expect(videoCues["dead-simple"]).toBeUndefined();
	});
});
