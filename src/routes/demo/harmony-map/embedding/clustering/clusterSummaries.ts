import { toCalendarYear } from "../../../../../data/songYear.js";
import type { GroupShare } from "../../components/groupColorBlend.js";
import type { DensityCluster } from "./densityClusters.js";

const TOP_GROUP_SHARE_COUNT = 4;

export type ClusterSummary = {
	cluster: DensityCluster;
	songCount: number;
	groupShares: GroupShare[];
	dominantGroupName: string | null;
	yearRange: { min: number; max: number } | null;
	medianYear: number | null;
};

const median = (values: readonly number[]): number => {
	const sorted = [...values].sort((first, second) => first - second);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
};

export const buildClusterSummaries = (
	clusters: readonly DensityCluster[],
	getGroupShares: (songKey: string) => readonly GroupShare[],
	getYear: (songKey: string) => number | null
): ClusterSummary[] =>
	clusters.map((cluster) => {
		const groupTotals = new Map<string, number>();
		const years: number[] = [];

		for (const songKey of cluster.songKeys) {
			for (const { groupName, share } of getGroupShares(songKey)) {
				groupTotals.set(groupName, (groupTotals.get(groupName) ?? 0) + share);
			}
			const year = getYear(songKey);
			if (year !== null) years.push(toCalendarYear(year));
		}

		const groupTotal = [...groupTotals.values()].reduce(
			(sum, share) => sum + share,
			0
		);
		const groupShares =
			groupTotal === 0
				? []
				: [...groupTotals.entries()]
						.map(([groupName, share]) => ({
							groupName,
							share: share / groupTotal
						}))
						.sort((first, second) => second.share - first.share)
						.slice(0, TOP_GROUP_SHARE_COUNT);

		const sortedYears = [...years].sort((first, second) => first - second);

		return {
			cluster,
			songCount: cluster.songKeys.length,
			groupShares,
			dominantGroupName: groupShares[0]?.groupName ?? null,
			yearRange:
				sortedYears.length === 0
					? null
					: {
							min: sortedYears[0],
							max: sortedYears[sortedYears.length - 1]
						},
			medianYear: sortedYears.length === 0 ? null : median(sortedYears)
		};
	});
