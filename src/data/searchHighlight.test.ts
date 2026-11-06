import { describe, expect, it } from "vitest";
import { highlightSegments } from "./searchHighlight.js";

const marked = (text: string, words: string[]) =>
	highlightSegments(text, words)
		.map((segment) => (segment.match ? `[${segment.text}]` : segment.text))
		.join("");

describe("highlightSegments", () => {
	it("marks every occurrence of each word, ignoring case", () => {
		expect(marked("Jazz Doo Wop", ["doo", "jazz"])).toBe("[Jazz] [Doo] Wop");
		expect(marked("Bye Bye Bye", ["bye"])).toBe("[Bye] [Bye] [Bye]");
	});

	it("matches through accents and apostrophes", () => {
		expect(marked("Beyoncé", ["beyonce"])).toBe("[Beyoncé]");
		expect(marked("Don’t Stop", ["dont"])).toBe("[Don’t] Stop");
	});

	it("leaves unmatched text alone", () => {
		expect(marked("Hello", ["xyz"])).toBe("Hello");
		expect(marked("Hello", [])).toBe("Hello");
	});
});
