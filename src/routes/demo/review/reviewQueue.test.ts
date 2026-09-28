import { describe, expect, it } from "vitest";
import { assignedReviewerIndex, computeReviewQueue, queueForReviewer } from "./reviewQueue.js";
import type { SongCoverageEntry, SongProgressionCount } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";

const makeCount = (
	coveragePercent: number,
	isCore: boolean
): SongProgressionCount => ({
	chordProgression: "I-IV-V",
	name: "some progression",
	scale: "major",
	matchCount: 1,
	chorusMatchCount: 1,
	coveragePercent,
	isCore
});

const makeEntry = (
	songKey: string,
	counts: SongProgressionCount[]
): SongCoverageEntry => ({
	songKey,
	title: songKey,
	artists: ["Someone"],
	coveragePercent: counts.reduce((sum, c) => sum + c.coveragePercent, 0),
	matchingProgressions: counts.filter((c) => c.isCore).map((c) => c.name),
	progressionCounts: counts,
	biasOverrides: []
});

describe("computeReviewQueue", () => {
	it("puts high-coverage, all-non-core songs first (tier 1)", () => {
		const entries = [
			makeEntry("all-filler", [makeCount(80, false)]),
			makeEntry("has-core", [makeCount(80, true)])
		];
		const queue = computeReviewQueue(entries, new Set());
		expect(queue[0].songKey).toBe("all-filler");
		expect(queue[0].tier).toBe(1);
	});

	it("does not tier-1 a low-coverage all-non-core song (not deceptively 'done')", () => {
		const entries = [makeEntry("low-filler", [makeCount(10, false)])];
		const queue = computeReviewQueue(entries, new Set());
		expect(queue[0].tier).toBe(3);
	});

	it("puts mixed songs where non-core dominates in tier 2", () => {
		const entries = [
			makeEntry("mostly-filler", [makeCount(20, true), makeCount(60, false)])
		];
		const queue = computeReviewQueue(entries, new Set());
		expect(queue[0].tier).toBe(2);
	});

	it("puts mostly-core songs in tier 3", () => {
		const entries = [
			makeEntry("mostly-core", [makeCount(70, true), makeCount(10, false)])
		];
		const queue = computeReviewQueue(entries, new Set());
		expect(queue[0].tier).toBe(3);
	});

	it("within tier 3, sorts ascending by total coverage", () => {
		const entries = [
			makeEntry("high", [makeCount(90, true)]),
			makeEntry("low", [makeCount(10, true)])
		];
		const queue = computeReviewQueue(entries, new Set());
		expect(queue.map((r) => r.songKey)).toEqual(["low", "high"]);
	});

	it("excludes already-reviewed songs", () => {
		const entries = [
			makeEntry("reviewed", [makeCount(80, false)]),
			makeEntry("unreviewed", [makeCount(10, true)])
		];
		const queue = computeReviewQueue(entries, new Set(["reviewed"]));
		expect(queue.map((r) => r.songKey)).toEqual(["unreviewed"]);
	});

	it("returns an empty array when every song is reviewed", () => {
		const entries = [makeEntry("s1", [makeCount(50, true)])];
		expect(computeReviewQueue(entries, new Set(["s1"]))).toEqual([]);
	});
});

describe("assignedReviewerIndex / queueForReviewer", () => {
	it("is deterministic for a given seed and songKey", () => {
		const a = assignedReviewerIndex("some-song", 1, 2);
		const b = assignedReviewerIndex("some-song", 1, 2);
		expect(a).toBe(b);
	});

	it("splits a large set of songs roughly evenly between two reviewers", () => {
		const songKeys = Array.from({ length: 2000 }, (_, i) => `song-${i}`);
		const counts = [0, 0];
		for (const key of songKeys) counts[assignedReviewerIndex(key, 1, 2)]++;
		// Hash-based split, not exact — just needs to be in the ballpark of half.
		expect(counts[0]).toBeGreaterThan(800);
		expect(counts[1]).toBeGreaterThan(800);
	});

	it("changes at least some assignments when the seed changes", () => {
		const songKeys = Array.from({ length: 200 }, (_, i) => `song-${i}`);
		const before = songKeys.map((k) => assignedReviewerIndex(k, 1, 2));
		const after = songKeys.map((k) => assignedReviewerIndex(k, 2, 2));
		expect(before).not.toEqual(after);
	});

	it("queueForReviewer only returns songs assigned to that reviewer index", () => {
		const entries = Array.from({ length: 50 }, (_, i) =>
			makeEntry(`song-${i}`, [makeCount(50, true)])
		);
		const queue = computeReviewQueue(entries, new Set());
		const mine = queueForReviewer(queue, 0, 1, 2);
		const theirs = queueForReviewer(queue, 1, 1, 2);
		expect(mine.every((r) => assignedReviewerIndex(r.songKey, 1, 2) === 0)).toBe(true);
		expect(theirs.every((r) => assignedReviewerIndex(r.songKey, 1, 2) === 1)).toBe(true);
		expect(mine.length + theirs.length).toBe(queue.length);
	});

	it("preserves the original queue's tier/coverage ordering within a reviewer's subset", () => {
		const entries = [
			makeEntry("high", [makeCount(90, true)]),
			makeEntry("mid", [makeCount(50, true)]),
			makeEntry("low", [makeCount(10, true)])
		];
		const queue = computeReviewQueue(entries, new Set());
		const mine = queueForReviewer(queue, 0, 1, 2);
		const queueOrder = queue.map((r) => r.songKey);
		const mineOrder = mine.map((r) => r.songKey);
		expect(mineOrder).toEqual(queueOrder.filter((k) => mineOrder.includes(k)));
	});
});
