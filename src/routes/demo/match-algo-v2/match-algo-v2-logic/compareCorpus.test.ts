import { describe, expect, it } from "vitest";
import type { SongAlgoMetrics } from "./algoMetrics.js";
import {
	aggregateCorpusComparison,
	coverageBucketStart,
	compareSongMetrics
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

	it("reports v2 as better on coverage and interior holes when means improve", () => {
		const comparison = aggregateCorpusComparison([
			{
				v1: metrics({
					songKey: "a",
					coveragePercent: 70,
					interiorSingletonCount: 2,
					sectionStartRate: 50
				}),
				v2: metrics({
					songKey: "a",
					coveragePercent: 90,
					interiorSingletonCount: 0,
					sectionStartRate: 100
				})
			},
			{
				v1: metrics({
					songKey: "b",
					coveragePercent: 80,
					interiorSingletonCount: 1,
					sectionStartRate: 100
				}),
				v2: metrics({
					songKey: "b",
					coveragePercent: 80,
					interiorSingletonCount: 1,
					sectionStartRate: 100
				})
			}
		]);

		expect(comparison.verdicts.coverage).toBe("better");
		expect(comparison.verdicts.interiorHoles).toBe("better");
		expect(comparison.verdicts.sectionStarts).toBe("better");
		expect(comparison.winLoss.v2HigherCoverage).toBe(1);
		expect(comparison.winLoss.coverageTie).toBe(1);
		expect(comparison.improvedByCoverage[0]?.songKey).toBe("a");
		expect(comparison.worseByCoverage).toHaveLength(0);
	});

	it("formats signed change stats", () => {
		expect(formatSignedInteger(3)).toBe("+3");
		expect(formatSignedInteger(-2)).toBe("-2");
		expect(formatSignedSharePercentPoints(0.12)).toBe("+12.0 pp");
	});

	it("lists songs where v2 coverage drops", () => {
		const comparison = aggregateCorpusComparison([
			{
				v1: metrics({ songKey: "drop", coveragePercent: 95 }),
				v2: metrics({ songKey: "drop", coveragePercent: 70 })
			}
		]);
		expect(comparison.verdicts.coverage).toBe("worse");
		expect(comparison.worseByCoverage[0]?.songKey).toBe("drop");
		expect(compareSongMetrics(
			metrics({ songKey: "drop", coveragePercent: 95 }),
			metrics({ songKey: "drop", coveragePercent: 70 })
		).coverageDelta).toBe(-25);
	});
});
