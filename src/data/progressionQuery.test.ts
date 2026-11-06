import { describe, expect, it } from "vitest";
import {
	MATCH_CONTAINS,
	MATCH_STARTS_WITH,
	detectQuery,
	matchProgression,
	matchRank,
	progressionSpelling
} from "./progressionQuery.js";

const codesOf = (text: string): number[] => {
	const query = detectQuery(text);
	if (query.kind === "text") throw new Error(`"${text}" read as text`);
	return query.codes;
};

describe("detectQuery", () => {
	it.each(["taylor swift", "Am I Blue", "I Will Survive", "Hello", "V", "Em", "C C"])(
		"reads %s as a song/artist search",
		(text) => {
			expect(detectQuery(text).kind).toBe("text");
		}
	);

	it("reads roman numerals", () => {
		expect(detectQuery("ii V I")).toMatchObject({
			kind: "roman",
			romanTokens: ["ii", "V", "I"]
		});
		expect(detectQuery("I-V-vi-IV").kind).toBe("roman");
		expect(detectQuery("ii7 V7 Imaj7").kind).toBe("roman");
		expect(detectQuery("i bVI bVII").kind).toBe("roman");
	});

	it("reads chord names and translates them to roman numerals", () => {
		expect(detectQuery("Dm G C")).toMatchObject({
			kind: "chords",
			romanTokens: ["ii", "V", "I"],
			keyLabel: "C major"
		});
		expect(detectQuery("Dm7 G7 Cmaj7")).toMatchObject({
			romanTokens: ["ii", "V", "I"]
		});
		expect(detectQuery("Am F C G")).toMatchObject({
			kind: "chords",
			romanTokens: ["i", "VI", "III", "VII"],
			keyLabel: "A minor"
		});
		expect(detectQuery("G D Em C")).toMatchObject({
			romanTokens: ["I", "V", "vi", "IV"],
			keyLabel: "G major"
		});
	});

	it("matches chord names and their roman translation the same way", () => {
		expect(codesOf("Dm G C")).toEqual(codesOf("ii V I"));
		expect(codesOf("G D Em C")).toEqual(codesOf("I V vi IV"));
	});

	it("reads accidentals against major and plain numerals against minor", () => {
		expect(codesOf("i bVI bVII")).toEqual(codesOf("i VI VII"));
	});
});

describe("matchRank", () => {
	it("ranks starts-with above contains", () => {
		expect(matchRank(codesOf("I V"), "I-V-vi-IV")).toBe(MATCH_STARTS_WITH);
		expect(matchRank(codesOf("vi IV"), "I-V-vi-IV")).toBe(MATCH_CONTAINS);
		expect(matchRank(codesOf("ii V"), "I-V-vi-IV")).toBeNull();
	});

	it("matches across the loop", () => {
		expect(matchRank(codesOf("IV I"), "I-V-vi-IV")).toBe(MATCH_CONTAINS);
	});

	it("treats relative major and minor as the same progression", () => {
		expect(matchRank(codesOf("Am F C G"), "vi-IV-I-V")).toBe(MATCH_STARTS_WITH);
		expect(matchRank(codesOf("vi IV I V"), "i-VI-III-VII")).toBe(
			MATCH_STARTS_WITH
		);
	});

	it("matches core progressions by name", () => {
		expect(matchRank(codesOf("I IV V"), "happy walk up")).toBe(MATCH_STARTS_WITH);
	});

	it("reads data tokens with extensions and annotations", () => {
		expect(matchRank(codesOf("ii V I"), "ii7/V-V7sus4-Imaj7")).toBe(
			MATCH_STARTS_WITH
		);
		expect(matchRank(codesOf("I V"), "I(no3)-V(no3)")).toBe(MATCH_STARTS_WITH);
	});
});

describe("progressionSpelling", () => {
	it("spells core progressions by their roman numerals", () => {
		expect(progressionSpelling("happy walk up")).toBe("I–IV–V");
		expect(progressionSpelling("V-I-bII-I")).toBe("V–I–bII–I");
	});
});

describe("matchProgression", () => {
	const marked = (query: string, name: string) => {
		const match = matchProgression(codesOf(query), name);
		return match?.tokens
			.map((token, index) => (match.matched[index] ? `[${token}]` : token))
			.join("-");
	};

	it("marks the matched sub-progression", () => {
		expect(marked("I V", "I-V-vi-IV")).toBe("[I]-[V]-vi-IV");
		expect(marked("vi IV", "I-V-vi-IV")).toBe("I-V-[vi]-[IV]");
		expect(marked("IV I", "I-V-vi-IV")).toBe("[I]-V-vi-[IV]");
	});

	it("marks repeated chords the query folded together", () => {
		expect(marked("I IV", "I-I-IV-V")).toBe("[I]-[I]-[IV]-V");
	});

	it("marks the spelling of the matching core variant", () => {
		expect(marked("I IV", "happy walk up")).toBe("[I]-[IV]-V");
	});
});
