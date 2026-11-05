import { describe, expect, it } from "vitest";
import { MAX_UNDO_STEPS, popUndoEntry, pushUndoEntry } from "./undoHistory.js";

const isSame = (a: number, b: number) => a === b;

describe("pushUndoEntry", () => {
	it("appends entries and keeps only the most recent steps", () => {
		expect(pushUndoEntry([1, 2], 3)).toEqual([1, 2, 3]);
		const full = Array.from({ length: MAX_UNDO_STEPS }, (_, index) => index);
		const pushed = pushUndoEntry(full, MAX_UNDO_STEPS);
		expect(pushed).toHaveLength(MAX_UNDO_STEPS);
		expect(pushed.at(-1)).toBe(MAX_UNDO_STEPS);
		expect(pushed[0]).toBe(1);
	});
});

describe("popUndoEntry", () => {
	it("returns the most recent entry and the remaining stack", () => {
		expect(popUndoEntry([1, 2], 3, isSame)).toEqual({
			entry: 2,
			remaining: [1]
		});
	});

	it("skips entries identical to the current state", () => {
		expect(popUndoEntry([1, 3, 3], 3, isSame)).toEqual({
			entry: 1,
			remaining: []
		});
	});

	it("returns null when nothing would change", () => {
		expect(popUndoEntry([], 3, isSame)).toBeNull();
		expect(popUndoEntry([3], 3, isSame)).toBeNull();
	});
});
