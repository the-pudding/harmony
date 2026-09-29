import { HOMOGENEITY_MEASURE_NAME } from "../shared/progressionHomogeneity.js";

export const MAP_COLOR_MODES = ["off", "groups", "homogeneity"] as const;
export type MapColorMode = (typeof MAP_COLOR_MODES)[number];

export const DEFAULT_MAP_COLOR_MODE: MapColorMode = "off";

export const MAP_COLOR_MODE_LABELS: Record<MapColorMode, string> = {
	off: "off",
	groups: "groups",
	homogeneity: HOMOGENEITY_MEASURE_NAME
};
