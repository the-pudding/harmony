import { describe, expect, it } from "vitest";
import { formatTimestamp, roundToMilliseconds } from "./songTime.js";

describe("formatTimestamp", () => {
	it("formats minutes and zero-padded seconds", () => {
		expect(formatTimestamp(65.5)).toBe("1:05.50");
		expect(formatTimestamp(3)).toBe("0:03.00");
	});
});

describe("roundToMilliseconds", () => {
	it("rounds to three decimals", () => {
		expect(roundToMilliseconds(1.23456)).toBe(1.235);
	});
});
