// How hex map clusters get their colors. Each strategy takes every cluster
// (name, progressions, position, size) and returns a color per name; the
// map then fades that color per hex by progression share (see
// createRegionFills). To change how clusters are colored, write a new
// strategy in ./strategies and point CLUSTER_COLOR_STRATEGY at it.
import { createSignatureChordStrategy } from "./strategies/signatureChord.js";
import type { ClusterColorStrategy } from "./types.js";

export type { ClusterColorInput, ClusterColorStrategy } from "./types.js";
export { createSignatureChordStrategy } from "./strategies/signatureChord.js";
export { neighborDistinctStrategy } from "./strategies/neighborDistinct.js";

export const CLUSTER_COLOR_STRATEGY: ClusterColorStrategy =
	createSignatureChordStrategy();
