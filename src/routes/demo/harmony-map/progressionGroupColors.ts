import {
	colorForProgressionGroupName,
	progressionGroupLegendItems,
	UNGROUPED_PROGRESSION_GROUP_COLOR,
	UNGROUPED_PROGRESSION_GROUP_LABEL,
	type ProgressionGroupLegendItem
} from "$data/core-progressions.js";

export const UNGROUPED_COLOR = UNGROUPED_PROGRESSION_GROUP_COLOR;
export const UNGROUPED_LABEL = UNGROUPED_PROGRESSION_GROUP_LABEL;

export const colorForGroupName = colorForProgressionGroupName;

export type GroupLegendItem = ProgressionGroupLegendItem;

export const groupLegendItems = progressionGroupLegendItems;
