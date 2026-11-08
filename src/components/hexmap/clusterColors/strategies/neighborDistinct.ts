import { assignRegionColors } from "../../embedding/layout/hexBins.js";
import {
	CONFUSABLE_REGION_PAIRS,
	PINNED_REGION_COLORS,
	REGION_PALETTE
} from "../../components/scatter/constants.js";
import type { ClusterColorStrategy } from "../types.js";

// The original coloring: a categorical palette assigned so nearby clusters
// never share a color or use a confusable pair. Says nothing about the
// music; kept as a strategy to swap back to or compare against.
export const neighborDistinctStrategy: ClusterColorStrategy = (clusters) =>
	assignRegionColors(
		clusters,
		REGION_PALETTE,
		CONFUSABLE_REGION_PAIRS,
		undefined,
		PINNED_REGION_COLORS
	);
