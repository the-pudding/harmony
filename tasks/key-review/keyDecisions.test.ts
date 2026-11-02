import { describe, expect, it } from "vitest";
import type { SongKeySnapshot } from "./ledger.js";
import {
	decisionMatchesSnapshot,
	decisionOutcome,
	normalizeDecisionForApply,
	validateDecision,
	type KeyDecision
} from "./keyDecisions.js";

const COMMON_MODES = ["major", "minor", "mixolydian", "dorian"];

const snapshot: SongKeySnapshot = {
	songKey: "artist__song",
	labeledKey: "C",
	labeledScale: "major",
	labeledCapo: 0,
	source: "UG",
	url: "",
	title: "Song",
	artist: "Artist"
};
const snapshots = new Map([[snapshot.songKey, snapshot]]);

const decision = (overrides: Partial<KeyDecision>): KeyDecision => ({
	songKey: snapshot.songKey,
	labeled: "C major",
	verdict: "corrected",
	key: "A",
	scale: "minor",
	confidence: "high",
	note: "",
	...overrides
});

describe("validateDecision", () => {
	it("accepts a well-formed correction", () => {
		expect(validateDecision(decision({}), snapshots, COMMON_MODES)).toEqual([]);
	});

	it("rejects confirmations that change the key", () => {
		expect(
			validateDecision(
				decision({ verdict: "confirmed" }),
				snapshots,
				COMMON_MODES
			)
		).toHaveLength(1);
	});

	it("rejects corrections that change nothing", () => {
		expect(
			validateDecision(
				decision({ key: "C", scale: "major" }),
				snapshots,
				COMMON_MODES
			)
		).toHaveLength(1);
	});

	it("requires a note to justify a rare mode", () => {
		expect(
			validateDecision(decision({ scale: "phrygian" }), snapshots, COMMON_MODES)
		).toHaveLength(1);
		expect(
			validateDecision(
				decision({ scale: "phrygian", note: "bII-i vamp throughout" }),
				snapshots,
				COMMON_MODES
			)
		).toEqual([]);
	});

	it("rejects unknown songs, bad notes and out-of-range transposes", () => {
		expect(
			validateDecision(
				decision({ songKey: "nobody__nothing" }),
				snapshots,
				COMMON_MODES
			)
		).toEqual(["unknown songKey"]);
		expect(
			validateDecision(decision({ key: "H" }), snapshots, COMMON_MODES)
		).toHaveLength(1);
		expect(
			validateDecision(decision({ transpose: 12 }), snapshots, COMMON_MODES)
		).toHaveLength(1);
	});

	it("rejects giving both a recorded key and a transpose", () => {
		expect(
			validateDecision(
				decision({ recordedKey: "Bb", transpose: 1 }),
				snapshots,
				COMMON_MODES
			)
		).toHaveLength(1);
	});
});

describe("decisionOutcome", () => {
	it("derives the shortest transposition from the recorded key", () => {
		expect(decisionOutcome(decision({ key: "G", recordedKey: "Ab" }))).toEqual({
			key: "Ab",
			transpose: 1
		});
		expect(decisionOutcome(decision({ key: "C", recordedKey: "G" }))).toEqual({
			key: "G",
			transpose: -5
		});
	});

	it("keeps an explicit transpose when no recorded key is given", () => {
		expect(decisionOutcome(decision({ key: "F", transpose: -7 }))).toEqual({
			key: "F",
			transpose: -7
		});
	});
	it("turns confirmed into corrected when recordedKey changes pitch", () => {
		expect(
			normalizeDecisionForApply(
				decision({ verdict: "confirmed", recordedKey: "G" }),
				snapshot
			).verdict
		).toBe("corrected");
	});
});

describe("decisionMatchesSnapshot", () => {
	it("detects decisions made against an older scrape", () => {
		expect(decisionMatchesSnapshot(decision({}), snapshot)).toBe(true);
		expect(
			decisionMatchesSnapshot(decision({ labeled: "G major" }), snapshot)
		).toBe(false);
	});
});
