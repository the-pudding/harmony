import {
	allProgressionGroups,
	progressionGroupLegendItems,
	UNGROUPED_PROGRESSION_GROUP_LABEL
} from "$data/core-progressions.js";
import { dominantProgressionGroupName } from "$data/core-progressions.util.js";
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
	parentGroupName: string | null;
};

// Family share is exclusive (one dominant group per song, via
// dominantProgressionGroupName), so shares sum to ~100%. Progression share
// within a family is "did the algo select this named core progression as a
// final match anywhere in the song" (not just the dominant one), so a
// family's children can sum to more than the family's own share. Identity is
// the canonical name — never the literal roman spelling — because matching
// is tonic-rotation-invariant and a song can match under an un-authored
// rotation (e.g. axis of awesome as vi-IV-I-V).
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

	const matchedNamesBySong = songCoverages.map(
		(entry) => new Set(entry.matchingProgressions)
	);

	const progressionCountByName = new Map<string, number>();
	for (const group of allProgressionGroups) {
		for (const progression of group.progressions) {
			const matchingSongCount = matchedNamesBySong.filter((matchedNames) =>
				matchedNames.has(progression.name)
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
				progressions: progressionsByGroupName.get(item.label) ?? [],
				parentGroupName: item.parentGroupName
			};
		})
		.sort(
			(a, b) => b.sharePercent - a.sharePercent || a.label.localeCompare(b.label)
		);
};

// Returns song keys whose dominant group matches groupLabel, optionally further
// narrowed to songs where the algo selected the named core progression.
export const songKeysMatchingGroupFilter = (
	songCoverages: readonly SongCoverageEntry[],
	groupLabel: string,
	progressionName: string | null
): Set<string> =>
	new Set(
		songCoverages
			.filter((entry) => {
				const dominant = dominantProgressionGroupName(entry.progressionCounts);
				const dominantLabel = dominant ?? UNGROUPED_PROGRESSION_GROUP_LABEL;
				if (dominantLabel !== groupLabel) return false;
				if (progressionName === null) return true;
				return entry.matchingProgressions.includes(progressionName);
			})
			.map((entry) => entry.songKey)
	);
