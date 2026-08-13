import {
	allProgressionGroups,
	progressionGroupLegendItems,
	UNGROUPED_PROGRESSION_GROUP_LABEL
} from "$data/core-progressions.js";
import {
	chordProgressionVariants,
	dominantProgressionGroupName
} from "$data/core-progressions.util.js";
import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";

const PERCENT_SCALE = 100;

export type ProgressionShareItem = {
	name: string;
	sharePercent: number;
	songCount: number;
};

export type ProgressionGroupShare = {
	label: string;
	color: string;
	sharePercent: number;
	songCount: number;
	progressions: ProgressionShareItem[];
};

// Family share is exclusive (one dominant group per song, via
// dominantProgressionGroupName), so shares sum to ~100%. Progression share
// within a family is "did this progression appear as a final match anywhere
// in the song" (not just the dominant one), so a family's children can sum
// to more than the family's own share.
export const buildProgressionGroupShares = (
	songCoverages: readonly SongCoverageEntry[]
): ProgressionGroupShare[] => {
	const songCount = songCoverages.length;
	if (songCount === 0) return [];

	const groupCounts = new Map<string, number>();
	for (const entry of songCoverages) {
		const groupName = dominantProgressionGroupName(entry.progressionCounts);
		const label = groupName ?? UNGROUPED_PROGRESSION_GROUP_LABEL;
		groupCounts.set(label, (groupCounts.get(label) ?? 0) + 1);
	}

	const matchedVariantKeysBySong = songCoverages.map(
		(entry) => new Set(entry.progressionCounts.map((count) => count.chordProgression))
	);

	const progressionCountByName = new Map<string, number>();
	for (const group of allProgressionGroups) {
		for (const progression of group.progressions) {
			const variants = new Set(chordProgressionVariants(progression.chordProgression));
			const matchingSongCount = matchedVariantKeysBySong.filter((matchedVariants) =>
				[...variants].some((variant) => matchedVariants.has(variant))
			).length;
			progressionCountByName.set(progression.name, matchingSongCount);
		}
	}

	const progressionsByGroupName = new Map(
		allProgressionGroups.map((group) => [
			group.name,
			[...group.progressions]
				.map((progression): ProgressionShareItem => {
					const count = progressionCountByName.get(progression.name) ?? 0;
					return {
						name: progression.name,
						songCount: count,
						sharePercent: (count / songCount) * PERCENT_SCALE
					};
				})
				.sort(
					(a, b) => b.sharePercent - a.sharePercent || a.name.localeCompare(b.name)
				)
		])
	);

	return [...progressionGroupLegendItems]
		.map((item): ProgressionGroupShare => {
			const count = groupCounts.get(item.label) ?? 0;
			return {
				label: item.label,
				color: item.color,
				songCount: count,
				sharePercent: (count / songCount) * PERCENT_SCALE,
				progressions: progressionsByGroupName.get(item.label) ?? []
			};
		})
		.sort(
			(a, b) => b.sharePercent - a.sharePercent || a.label.localeCompare(b.label)
		);
};
