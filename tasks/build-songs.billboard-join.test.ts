import { describe, expect, it } from "vitest";
import {
	loadBillboardIndex,
	loadTrackerIndex,
	trackerKey
} from "./build-songs.js";

const BILLBOARD_JOIN_TEST_TIMEOUT_MS = 15_000;

describe("build-songs Billboard join", () => {
	it("diverges from tracker.slug when kebabCase strips punctuation from slug fields", () => {
		expect(trackerKey("10cc", "i-m-not-in-love")).toBe(
			"10cc__i-m-not-in-love"
		);
		expect(trackerKey("10cc", "I'm Not In Love")).toBe("10cc__im-not-in-love");
		expect(trackerKey("10cc", "i-m-not-in-love")).not.toBe(
			trackerKey("10cc", "I'm Not In Love")
		);
	});

	it(
		"attaches chart year via tracker.slug for apostrophe titles",
		() => {
			const trackerIndex = loadTrackerIndex();
			const billboardIndex = loadBillboardIndex(trackerIndex);
			const slug = "10cc__i-m-not-in-love";
			const humanKey = trackerKey("10cc", "I'm Not In Love");

			expect(slug).not.toBe(humanKey);
			expect(trackerIndex.get(slug)?.song).toBe("I'm Not In Love");
			expect(billboardIndex.get(humanKey)?.year).toBeTypeOf("number");
			expect(billboardIndex.get(slug)?.year).toBe(
				billboardIndex.get(humanKey)?.year
			);
		},
		BILLBOARD_JOIN_TEST_TIMEOUT_MS
	);

	it(
		"attaches chart year via tracker.slug for + and ! titles",
		() => {
			const trackerIndex = loadTrackerIndex();
			const billboardIndex = loadBillboardIndex(trackerIndex);

			expect(billboardIndex.get("ariana-grande__34-35")?.year).toBeTypeOf(
				"number"
			);
			expect(billboardIndex.get("3oh-3__don-t-trust-me")?.year).toBeTypeOf(
				"number"
			);
		},
		BILLBOARD_JOIN_TEST_TIMEOUT_MS
	);
});
