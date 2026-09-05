import { describe, expect, it } from "vitest";
import type { SongAlgoMetrics } from "./algoMetrics.js";
import {
	aggregateCorpusComparison,
	coverageBucketStart
} from "./compareCorpus.js";
import {
	formatSignedInteger,
	formatSignedSharePercentPoints
} from "./formatComparison.js";

const metrics = (
	overrides: Partial<SongAlgoMetrics> & Pick<SongAlgoMetrics, "songKey">
): SongAlgoMetrics => ({
	title: overrides.songKey,
	artists: [],
	totalChords: 10,
	coveredChords: 8,
	coveragePercent: 80,
	coreCoveredChords: 5,
	gapCoveredChords: 3,
	coreCoveragePercent: 50,
	gapCoveragePercent: 30,
	sectionCount: 2,
	sectionsStartingCovered: 2,
	sectionStartRate: 100,
	interiorSingletonCount: 0,
	interiorUncoveredRunCount: 0,
	coveredByLength3: 3,
	coveredByLength4Plus: 5,
	meanUnitLength: 3.6,
	openingPrefixAlignedSections: 2,
	openingPrefixAlignRate: 100,
	...overrides
});

describe("aggregateCorpusComparison", () => {
	it("places coverage into 10-point buckets including 90–100", () => {
		expect(coverageBucketStart(0)).toBe(0);
		expect(coverageBucketStart(94)).toBe(90);
		expect(coverageBucketStart(100)).toBe(90);
	});

	it("summarizes v2 corpus coverage and ranks songs", () => {
		const comparison = aggregateCorpusComparison([
			metrics({
				songKey: "a",
				coveragePercent: 90,
				interiorSingletonCount: 0
			}),
			metrics({
				songKey: "b",
				coveragePercent: 70,
				interiorSingletonCount: 2
			})
		]);

		expect(comparison.stats.meanCoverage).toBe(80);
		expect(comparison.highestCoverage[0]?.songKey).toBe("a");
		expect(comparison.lowestCoverage[0]?.songKey).toBe("b");
		expect(comparison.mostInteriorHoles[0]?.songKey).toBe("b");
	});

	it("formats signed change stats", () => {
		expect(formatSignedInteger(3)).toBe("+3");
		expect(formatSignedInteger(-2)).toBe("-2");
		expect(formatSignedSharePercentPoints(0.12)).toBe("+12.0 pp");
	});
});
