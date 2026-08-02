import {
	allProgressionGroups,
	chordProgressionVariants
} from "$data/core-progressions.js";

export type ProgressionGroupProfile = {
	name: string;
	index: number;
	brightness: number;
};

const majorShare = (scales: readonly string[]): number =>
	scales.length === 0
		? 0
		: scales.filter((scale) => scale === "major").length / scales.length;

export const progressionGroupProfiles: ProgressionGroupProfile[] =
	allProgressionGroups.map((group, index) => ({
		name: group.name,
		index,
		brightness: majorShare(
			group.progressions.map((progression) => progression.scale)
		)
	}));

export const progressionGroupProfileByName = new Map(
	progressionGroupProfiles.map((profile) => [profile.name, profile])
);

export const groupNameByChordProgression = new Map(
	allProgressionGroups.flatMap((group) =>
		group.progressions.flatMap((progression) =>
			chordProgressionVariants(progression.chordProgression).map(
				(variant): [string, string] => [variant, group.name]
			)
		)
	)
);

export const progressionGroupProfileFor = (
	chordProgression: string
): ProgressionGroupProfile | null => {
	const groupName = groupNameByChordProgression.get(chordProgression);
	return groupName
		? (progressionGroupProfileByName.get(groupName) ?? null)
		: null;
};

export type WeightedProgression = {
	chordProgression: string;
	matchCount: number;
};

export const dominantGroupName = (
	progressions: readonly WeightedProgression[]
): string | null => {
	const totalsByGroup = progressions.reduce(
		(totals, { chordProgression, matchCount }) => {
			const groupName = groupNameByChordProgression.get(chordProgression);
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
