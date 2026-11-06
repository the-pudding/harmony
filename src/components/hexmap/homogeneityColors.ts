import { homogeneityBandFor } from "../../routes/demo/shared/progressionHomogeneity.js";
import { UNGROUPED_COLOR } from "./progressionGroupColors.js";

export const homogeneityColorFor = (effectiveProgressionCount: number | null): string =>
	effectiveProgressionCount === null
		? UNGROUPED_COLOR
		: homogeneityBandFor(effectiveProgressionCount).color;
