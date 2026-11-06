import { describe, expect, it } from "vitest";
import {
	buildClusterKeyIdeas,
	pickKeyGroup,
	type ClusterIdeaCandidate
} from "./clusterIdeas.js";

const candidate = (
	title: string,
	year: number,
	keyLabel = "A major",
	sharePercent = 80,
	popularity = 1000
): ClusterIdeaCandidate => ({
	songKey: title.toLowerCase().replace(/ /g, "-"),
	title,
	artists: ["Someone"],
	year,
	sharePercent,
	popularity,
	keyLabel
});

describe("pickKeyGroup", () => {
	it("takes one song per decade before doubling up, oldest first", () => {
		const group = pickKeyGroup([
			candidate("A", 1961, "A major", 90),
			candidate("B", 1962, "A major", 95),
			candidate("C", 1985),
			candidate("D", 2007)
		]);
		expect(group.map((song) => song.title)).toEqual(["B", "C", "D"]);
	});

	it("fills up to three from the same decade when it has to", () => {
		const group = pickKeyGroup([
			candidate("A", 1961),
			candidate("B", 1962),
			candidate("C", 1963)
		]);
		expect(group).toHaveLength(3);
	});

	it("counts covers of the same title once", () => {
		const group = pickKeyGroup([
			candidate("Last Kiss", 1964),
			candidate("Last Kiss", 1999),
			candidate("Other", 1975)
		]);
		expect(group).toHaveLength(2);
	});
});

describe("buildClusterKeyIdeas", () => {
	it("ranks keys by decades covered and drops weak or small groups", () => {
		const ideas = buildClusterKeyIdeas([
			candidate("A1", 1960, "A major"),
			candidate("A2", 1980, "A major"),
			candidate("A3", 2000, "A major"),
			candidate("G1", 1960, "G major", 100, 5000),
			candidate("G2", 1961, "G major", 100, 5000),
			candidate("G3", 1990, "G major", 100, 5000),
			candidate("C1", 1960, "C major"),
			candidate("C2", 1970, "C major"),
			candidate("C3", 1980, "C major", 10)
		]);
		expect(ideas.map((idea) => idea.keyLabel)).toEqual(["A major", "G major"]);
		expect(ideas[0].decadeCount).toBe(3);
	});
});

describe("without spreading across years", () => {
	it("takes the strongest songs even from one decade", () => {
		const group = pickKeyGroup(
			[
				candidate("A", 1961, "A major", 100),
				candidate("B", 1962, "A major", 100),
				candidate("C", 1963, "A major", 100),
				candidate("D", 2007, "A major", 50)
			],
			false
		);
		expect(group.map((song) => song.title)).toEqual(["A", "B", "C", "D"]);
	});

	it("ranks keys by strength alone", () => {
		const ideas = buildClusterKeyIdeas(
			[
				candidate("A1", 1960, "A major"),
				candidate("A2", 1980, "A major"),
				candidate("A3", 2000, "A major"),
				candidate("G1", 1960, "G major", 100, 5000),
				candidate("G2", 1961, "G major", 100, 5000),
				candidate("G3", 1962, "G major", 100, 5000)
			],
			false
		);
		expect(ideas.map((idea) => idea.keyLabel)).toEqual(["G major", "A major"]);
	});
});
