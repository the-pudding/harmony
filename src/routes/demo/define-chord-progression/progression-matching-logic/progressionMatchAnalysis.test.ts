import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type { SongSection } from "../../../../data/songBrowser.js";
import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import type { CoreProgression } from "$data/core-progressions.js";
import {
	aggregateVariantMatchStats,
	buildColoredHighlightSegments,
	buildCoreProgressionDisplayMatches,
	buildProgressionMatchRates,
	formatMatchRatePercent,
	pickPrimaryVariant,
	type ProgressionWithMatchStats
} from "./progressionMatchAnalysis.js";
import { matchHighlightForCoreProgression } from "../components/progressionColors.js";

const chord = (
	rootPitchClass: number,
	suffix: string,
	bassPitchClass?: number
): ParsedProgressionChord => ({
	rootPitchClass,
	suffix,
	...(bassPitchClass !== undefined ? { bassPitchClass } : {}),
	display: ""
});

const C_MAJOR = chord(0, "major");
const A_MINOR = chord(9, "minor");
const F_MAJOR = chord(5, "major");
const G_MAJOR = chord(7, "major");

const makeSection = (
	parsedProgression: ParsedProgressionChord[],
	label: string | null = null
): SongSection => ({
	label,
	chords: [],
	romanTokens: [],
	parsedProgression,
	keyLabel: null,
	scale: "major"
});

describe("buildProgressionMatchRates", () => {
	it("returns empty objects when totalSongs is 0", () => {
		expect(buildProgressionMatchRates([["I-V-vi-IV"]], 0)).toEqual({
			progressionMatchRates: {},
			progressionMatchCounts: {}
		});
	});

	it("computes the correct percentage without rounding sub-1% values away", () => {
		const { progressionMatchRates, progressionMatchCounts } =
			buildProgressionMatchRates(
				[["I-V-vi-IV"], ["I-V-vi-IV"], ["I-vi-IV-V"]],
				4
			);
		expect(progressionMatchRates["I-V-vi-IV"]).toBe(50);
		expect(progressionMatchRates["I-vi-IV-V"]).toBe(25);
		expect(progressionMatchCounts["I-V-vi-IV"]).toBe(2);
		expect(progressionMatchCounts["I-vi-IV-V"]).toBe(1);
	});

	it("preserves fractional percentages below 1%", () => {
		const { progressionMatchRates, progressionMatchCounts } =
			buildProgressionMatchRates([["I-V-vi-IV"]], 1000);
		expect(progressionMatchRates["I-V-vi-IV"]).toBe(0.1);
		expect(progressionMatchCounts["I-V-vi-IV"]).toBe(1);
	});

	it("progressions absent from all lists are not present in the result", () => {
		const { progressionMatchRates } = buildProgressionMatchRates(
			[["I-V-vi-IV"]],
			2
		);
		expect(progressionMatchRates["I-vi-iii-V"]).toBeUndefined();
	});
});

describe("aggregateVariantMatchStats", () => {
	const coverages = [
		{ matchingProgressions: ["ii-V-I"] },
		{ matchingProgressions: ["ii-V-I"] },
		{ matchingProgressions: ["ii-bii-I"] },
		{ matchingProgressions: ["I-V-vi-IV"] }
	];

	it("counts a song once when any sibling variant matched", () => {
		expect(
			aggregateVariantMatchStats(
				["ii-bii-I", "ii-bII-I", "ii-V-I"],
				coverages,
				coverages.length
			)
		).toEqual({ matchingSongCount: 3, matchRatePercent: 75 });
	});

	it("does not shrink when a zero-match exact variant is included", () => {
		const liberalOnly = aggregateVariantMatchStats(
			["ii-V-I"],
			coverages,
			coverages.length
		);
		const withExact = aggregateVariantMatchStats(
			["ii-bii-I", "ii-bII-I", "ii-V-I"],
			coverages,
			coverages.length
		);
		expect(withExact.matchingSongCount).toBeGreaterThanOrEqual(
			liberalOnly.matchingSongCount
		);
	});
});

describe("pickPrimaryVariant", () => {
	const variantRow = (
		name: string,
		chordProgression: string
	): ProgressionWithMatchStats =>
		({
			name,
			chordProgression,
			parsedProgression: [],
			scale: "major",
			description: "",
			matchCount: 0,
			coveragePercent: 0,
			isCoreProgression: true,
			highlightPalette: { fill: "", border: "" }
		}) as ProgressionWithMatchStats;

	it("falls back to the first variant when counts tie at zero", () => {
		expect(
			pickPrimaryVariant(
				[
					variantRow("jazz ii-V-I", "ii-bii-I"),
					variantRow("jazz ii-V-I", "ii-V-I")
				],
				null
			).chordProgression
		).toBe("ii-bii-I");
	});

	it("prefers the variant with the higher progression match count", () => {
		expect(
			pickPrimaryVariant(
				[
					variantRow("jazz ii-V-I", "ii-bii-I"),
					variantRow("jazz ii-V-I", "ii-V-I")
				],
				{ "ii-bii-I": 0, "ii-V-I": 12 }
			).chordProgression
		).toBe("ii-V-I");
	});
});

describe("buildCoreProgressionDisplayMatches", () => {
	const sampleCores: CoreProgression[] = [
		{
			name: "axis of awesome",
			chordProgression: "I-V-vi-IV",
			scale: "major",
			description: ""
		},
		{
			name: "doo wop",
			chordProgression: "I-vi-IV-V",
			scale: "major",
			description: ""
		}
	];

	it("returns one entry per core with zero stats when songMatches is null", () => {
		const rows = buildCoreProgressionDisplayMatches(sampleCores, null, null);
		expect(rows).toHaveLength(sampleCores.length);
		expect(rows.map((row) => row.name)).toEqual(["axis of awesome", "doo wop"]);
		for (const row of rows) {
			expect(row.matchCount).toBe(0);
			expect(row.coveragePercent).toBe(0);
			expect(row.isCoreProgression).toBe(true);
		}
	});

	it("uses the matched variant and song stats when songMatches contains a core hit", () => {
		const axisVariant = "I-V-vi-IV";
		const axisParsed = romanTokensToParsedProgression(
			axisVariant.split("-"),
			"major"
		)!;
		const songMatches: ProgressionWithMatchStats[] = [
			{
				name: "axis of awesome",
				chordProgression: axisVariant,
				parsedProgression: axisParsed,
				scale: "major",
				description: "",
				matchCount: 3,
				coveragePercent: 40,
				...matchHighlightForCoreProgression(
					true,
					axisVariant,
					"axis of awesome"
				)
			}
		];
		const rows = buildCoreProgressionDisplayMatches(
			sampleCores,
			songMatches,
			null
		);
		const axisRow = rows.find((row) => row.name === "axis of awesome");
		expect(axisRow?.chordProgression).toBe(axisVariant);
		expect(axisRow?.matchCount).toBe(3);
		expect(axisRow?.coveragePercent).toBe(40);
		const dooWopRow = rows.find((row) => row.name === "doo wop");
		expect(dooWopRow?.matchCount).toBe(0);
		expect(dooWopRow?.coveragePercent).toBe(0);
	});
});

describe("formatMatchRatePercent", () => {
	it("shows integers for rates at or above 1%", () => {
		expect(formatMatchRatePercent(50)).toBe("50");
		expect(formatMatchRatePercent(1)).toBe("1");
	});

	it("shows up to two decimal places for non-zero rates below 1%", () => {
		expect(formatMatchRatePercent(0.1)).toBe("0.1");
		expect(formatMatchRatePercent(0.12)).toBe("0.12");
		expect(formatMatchRatePercent(0.125)).toBe("0.13");
	});

	it("shows 0 for zero rates", () => {
		expect(formatMatchRatePercent(0)).toBe("0");
	});
});

const highlightedIndices = (
	section: SongSection,
	sectionIndex: number,
	annotations: Parameters<typeof buildColoredHighlightSegments>[2]
): number[] =>
	buildColoredHighlightSegments(section, sectionIndex, annotations)
		.filter((segment) => segment.palette !== null)
		.flatMap((segment) => segment.indices);

describe("buildColoredHighlightSegments — slash bass display", () => {
	const C_SHARP = 1;
	const E_FLAT = 3;
	const A_FLAT = 8;
	const E = 4;
	const PLAIN_VI_VII_III = [
		chord(C_SHARP, "major"),
		chord(E_FLAT, "major"),
		chord(A_FLAT, "major")
	];
	const SLASH_VI_VII_III = [
		chord(C_SHARP, "major"),
		chord(E_FLAT, "major"),
		chord(A_FLAT, "major", E)
	];
	const CLAIMED_POSITIONS = [0, 1, 2, 3, 4, 5];
	const palette = { fill: "#000", border: "#000" };

	it("highlights original indices for a slash-bass template over plain triads", () => {
		const section = makeSection([...PLAIN_VI_VII_III, ...PLAIN_VI_VII_III]);
		expect(
			highlightedIndices(section, 0, [
				{
					parsedProgression: SLASH_VI_VII_III,
					palette,
					highlightPositionsBySection: [CLAIMED_POSITIONS]
				}
			])
		).toEqual(CLAIMED_POSITIONS);
	});
});

describe("buildColoredHighlightSegments — collapse repeated chords for display", () => {
	const I_VI_IV = [C_MAJOR, A_MINOR, F_MAJOR];
	const I_I_VI_IV_LOOP = [
		C_MAJOR,
		C_MAJOR,
		A_MINOR,
		F_MAJOR,
		C_MAJOR,
		C_MAJOR,
		A_MINOR,
		F_MAJOR
	];
	const TATTOO_VERSE_TOKENS = ["I", "I", "vi", "IV", "I", "I", "vi", "IV"];
	const palette = { fill: "#000", border: "#000" };

	const makeTokenSection = (
		parsedProgression: ParsedProgressionChord[],
		romanTokens: string[]
	): SongSection => ({
		...makeSection(parsedProgression),
		romanTokens
	});

	it("groups I I vi IV as I-vi-IV highlight units, not I I vi then IV I I", () => {
		const section = makeTokenSection(I_I_VI_IV_LOOP, TATTOO_VERSE_TOKENS);
		const claimedPositions = TATTOO_VERSE_TOKENS.map((_, index) => index);
		const segments = buildColoredHighlightSegments(section, 0, [
			{
				parsedProgression: I_VI_IV,
				palette,
				chordProgression: "I-vi-IV",
				highlightPositionsBySection: [claimedPositions]
			}
		]).filter((segment) => segment.palette !== null);

		expect(segments.map((segment) => segment.indices)).toEqual([
			[0, 2, 3],
			[4, 6, 7]
		]);
		expect(
			segments.map((segment) =>
				segment.indices.map((position) => section.romanTokens[position])
			)
		).toEqual([
			["I", "vi", "IV"],
			["I", "vi", "IV"]
		]);
	});

	it("shows a single token for an unmatched repeated chord", () => {
		const section = makeTokenSection(
			[C_MAJOR, C_MAJOR, G_MAJOR],
			["I", "I", "V"]
		);
		const segments = buildColoredHighlightSegments(section, 0, []);
		expect(segments.map((segment) => segment.indices)).toEqual([[0, 2]]);
	});
});
