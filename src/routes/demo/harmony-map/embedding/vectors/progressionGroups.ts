import {
	allProgressionGroups,
	dominantProgressionGroupName,
	progressionGroupNameByChordProgression
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

export const groupNameByChordProgression =
	progressionGroupNameByChordProgression;

export const progressionGroupProfileFor = (
	chordProgression: string
): ProgressionGroupProfile | null => {
	const groupName = groupNameByChordProgression.get(chordProgression);
	return groupName
		? (progressionGroupProfileByName.get(groupName) ?? null)
		: null;
};

export type { WeightedProgression } from "$data/core-progressions.js";

export const dominantGroupName = dominantProgressionGroupName;
