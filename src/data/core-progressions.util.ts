import {
	allProgressionGroups,
	type CoreProgression
} from "./core-progressions.js";

export const chordProgressionVariants = (
	chordProgression: string | string[]
): string[] =>
	Array.isArray(chordProgression) ? chordProgression : [chordProgression];

export const siblingVariantsForProgression = (
	progressions: readonly CoreProgression[],
	chordProgression: string
): string[] => {
	const owner = progressions.find((progression) =>
		chordProgressionVariants(progression.chordProgression).includes(
			chordProgression
		)
	);
	return owner
		? chordProgressionVariants(owner.chordProgression)
		: [chordProgression];
};

export const progressionGroupNameByChordProgression = new Map(
	allProgressionGroups.flatMap((group) =>
		group.progressions.flatMap((progression) =>
			chordProgressionVariants(progression.chordProgression).map(
				(variant): [string, string] => [variant, group.name]
			)
		)
	)
);

// The authored spelling to DISPLAY for a named core progression, regardless
// of which literal spelling a particular song actually matched. Matching is
// tonic-rotation-invariant, so the same named progression can read as
// different roman-numeral strings depending on which chord a song's own key
// calls "I" (e.g. one "doo wop" song matches as I-vi-IV-V, another as
// III-i-VI-VII) — those are the same shape, just rotated, so showing the
// registered spelling everywhere keeps the label consistent across songs.
// This is purely a display concern: highlighting/interaction still key off
// the literal per-song chordProgression, since that's what's actually
// covered in that song's own chart.
export const canonicalChordProgressionByName = new Map(
	allProgressionGroups.flatMap((group) =>
		group.progressions.map((progression): [string, string] => [
			progression.name,
			chordProgressionVariants(progression.chordProgression)[0]
		])
	)
);

export const coreProgressionNameByChordProgression = new Map(
	allProgressionGroups.flatMap((group) =>
		group.progressions.flatMap((progression) =>
			chordProgressionVariants(progression.chordProgression).map(
				(variant): [string, string] => [variant, progression.name]
			)
		)
	)
);

export const progressionGroupNameByProgressionName = new Map(
	allProgressionGroups.flatMap((group) =>
		group.progressions.map((progression): [string, string] => [
			progression.name,
			group.name
		])
	)
);

export const progressionGroupNameFor = (
	chordProgression: string,
	progressionName?: string
): string | null =>
	progressionGroupNameByChordProgression.get(chordProgression) ??
	(progressionName
		? (progressionGroupNameByProgressionName.get(progressionName) ?? null)
		: null);

export type WeightedProgression = {
	chordProgression: string;
	// Canonical core-progression name, when known — see
	// SongProgressionCount.name. Matching is tonic-rotation-invariant, so a
	// song's literal chordProgression spelling doesn't always match one of
	// a progression's authored variant strings even when it's really that
	// progression. `name` is rotation-proof and should be preferred.
	name?: string;
	matchCount: number;
};

const groupMatchTotals = (
	progressions: readonly WeightedProgression[]
): Map<string, number> =>
	progressions.reduce((totals, { chordProgression, name, matchCount }) => {
		const groupName =
			(name ? progressionGroupNameByProgressionName.get(name) : undefined) ??
			progressionGroupNameByChordProgression.get(chordProgression);
		if (!groupName) return totals;
		return totals.set(groupName, (totals.get(groupName) ?? 0) + matchCount);
	}, new Map<string, number>());

export const dominantProgressionGroupName = (
	progressions: readonly WeightedProgression[]
): string | null => {
	const totalsByGroup = groupMatchTotals(progressions);

	return (
		[...totalsByGroup.entries()].sort(
			(first, second) =>
				second[1] - first[1] || first[0].localeCompare(second[0])
		)[0]?.[0] ?? null
	);
};

export type ProgressionGroupShare = { groupName: string; share: number };

// Dense, ordered to match allProgressionGroups: one fraction per group
// (zero for groups the song doesn't touch), summing to 1 across all groups.
// This is also what feeds the group-blend embedding, so two songs with the
// same blend get the same vector regardless of which progressions produced it.
export const progressionGroupShareVector = (
	progressions: readonly WeightedProgression[]
): number[] => {
	const totalsByGroup = groupMatchTotals(progressions);
	const total = [...totalsByGroup.values()].reduce((sum, count) => sum + count, 0);
	if (total === 0) return allProgressionGroups.map(() => 0);

	return allProgressionGroups.map(
		(group) => (totalsByGroup.get(group.name) ?? 0) / total
	);
};

export const progressionGroupSharesForSong = (
	progressions: readonly WeightedProgression[]
): ProgressionGroupShare[] =>
	progressionGroupShareVector(progressions)
		.map((share, index) => ({
			groupName: allProgressionGroups[index].name,
			share
		}))
		.filter((entry) => entry.share > 0);
