import { schemeTableau10 } from "d3";
import { progressionGroupProfiles } from "./embedding/vectors/progressionGroups.js";

export const UNGROUPED_COLOR = "#52525b";
export const UNGROUPED_LABEL = "no core match";

export const GROUP_COLOR_LEGEND_TITLE = "color = top core group";

export const GROUP_COLOR_LEGEND_EXPLANATION =
	"Each matched core progression adds its occurrence count to the group it belongs to; the group with the highest total colors the song. Gap-fill progressions belong to no group and never count, so a song whose only matches are gap fills stays grey.";

export const groupColorByName = new Map(
	progressionGroupProfiles.map((profile) => [
		profile.name,
		schemeTableau10[profile.index % schemeTableau10.length]
	])
);

export const colorForGroupName = (groupName: string | null): string =>
	groupName === null
		? UNGROUPED_COLOR
		: (groupColorByName.get(groupName) ?? UNGROUPED_COLOR);

export type GroupLegendItem = { label: string; color: string };

export const groupLegendItems: GroupLegendItem[] = [
	...progressionGroupProfiles.map((profile) => ({
		label: profile.name,
		color: colorForGroupName(profile.name)
	})),
	{ label: UNGROUPED_LABEL, color: UNGROUPED_COLOR }
];
