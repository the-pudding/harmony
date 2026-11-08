import { describe, expect, it } from "vitest";
import { hoverCardVerticalShift } from "./hoverCardPosition.js";

describe("hoverCardVerticalShift", () => {
	it("leaves a card that fits alone", () => {
		expect(hoverCardVerticalShift(100, 200, 900)).toBe(0);
	});

	it("moves a card up by its bottom overflow", () => {
		expect(hoverCardVerticalShift(800, 200, 900, 16)).toBe(-116);
	});

	it("pins a card taller than the window to the top margin", () => {
		expect(hoverCardVerticalShift(300, 1000, 900, 16)).toBe(-284);
	});

	it("pushes a card above the top margin back down", () => {
		expect(hoverCardVerticalShift(-20, 100, 900, 16)).toBe(36);
	});
});
