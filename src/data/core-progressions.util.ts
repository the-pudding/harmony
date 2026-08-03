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

export const coreProgressionNameByChordProgression = new Map(
	allProgressionGroups.flatMap((group) =>
		group.progressions.flatMap((progression) =>
			chordProgressionVariants(progression.chordProgression).map(
				(variant): [string, string] => [variant, progression.name]
			)
		)
	)
);

export type WeightedProgression = {
	chordProgression: string;
	matchCount: number;
};

export const dominantProgressionGroupName = (
	progressions: readonly WeightedProgression[]
): string | null => {
	const totalsByGroup = progressions.reduce(
		(totals, { chordProgression, matchCount }) => {
			const groupName =
				progressionGroupNameByChordProgression.get(chordProgression);
			if (!groupName) return totals;
			return totals.set(groupName, (totals.get(groupName) ?? 0) + matchCount);
		},
		new Map<string, number>()
	);

	return (
		[...totalsByGroup.entries()].sort(
			(first, second) =>
				second[1] - first[1] || first[0].localeCompare(second[0])
		)[0]?.[0] ?? null
	);
};
