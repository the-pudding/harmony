import { describe, expect, it } from "vitest";
import type { SongInput } from "../../src/chord-processing/types.js";
import type { LedgerRow, SongKeySnapshot } from "./ledger.js";
import { rekeySection } from "./rekeySong.js";

const PERFECT_FIFTH = 7;

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

const ledgerRow = (overrides: Partial<LedgerRow>): LedgerRow => ({
	songKey: snapshot.songKey,
	labeledKey: snapshot.labeledKey,
	labeledScale: snapshot.labeledScale,
	labeledCapo: snapshot.labeledCapo,
	verdict: "corrected",
	key: "C",
	scale: "major",
	transpose: 0,
	method: "agent",
	confidence: "high",
	flagReasons: "",
	reviewedAt: "",
	note: "",
	...overrides
});

const section = (overrides: Partial<SongInput> = {}): SongInput => ({
	id: "artist__song__verse",
	songKey: snapshot.songKey,
	title: "Song (Verse)",
	artists: ["Artist"],
	key: "C",
	scale: "major",
	progression: [
		{ noteName: "C", suffix: "major" },
		{ noteName: "A", suffix: "minor7" },
		{ noteName: "F", suffix: "major", bassNoteName: "A" },
		{ noteName: "G", suffix: "major" }
	],
	romanTokens: ["I", "vi7", "IV/3", "V"],
	...overrides
});

describe("rekeySection", () => {
	it("relabels to the relative minor without moving any pitches", () => {
		const rekeyed = rekeySection(
			section(),
			ledgerRow({ key: "A", scale: "minor" }),
			snapshot
		);
		expect(rekeyed.key).toBe("A");
		expect(rekeyed.scale).toBe("minor");
		expect(rekeyed.romanTokens).toEqual(["III", "i7", "VI/3", "VII"]);
		expect(rekeyed.progression).toEqual(section().progression);
	});

	it("relabels to mixolydian on the fifth", () => {
		const rekeyed = rekeySection(
			section(),
			ledgerRow({ key: "G", scale: "mixolydian" }),
			snapshot
		);
		expect(rekeyed.romanTokens).toEqual(["IV", "ii7", "VII/3", "I"]);
	});

	it("undoes a bogus capo shift while keeping the roman numerals", () => {
		const rekeyed = rekeySection(
			section(),
			ledgerRow({ key: "F", transpose: -PERFECT_FIFTH }),
			snapshot
		);
		expect(rekeyed.key).toBe("F");
		expect(rekeyed.romanTokens).toEqual(section().romanTokens);
		expect(rekeyed.progression).toEqual([
			{ noteName: "F", suffix: "major" },
			{ noteName: "D", suffix: "minor7" },
			{ noteName: "Bb", suffix: "major", bassNoteName: "D" },
			{ noteName: "C", suffix: "major" }
		]);
	});

	it("only transposes sections that modulate away from the labeled key", () => {
		const modulated = section({ key: "D", scale: "major" });
		const rekeyed = rekeySection(
			modulated,
			ledgerRow({ key: "A", scale: "minor" }),
			snapshot
		);
		expect(rekeyed).toEqual(modulated);
	});

	it("leaves confirmed songs untouched", () => {
		const original = section();
		expect(
			rekeySection(original, ledgerRow({ verdict: "confirmed" }), snapshot)
		).toBe(original);
	});
});
