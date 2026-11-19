// The registry, and the only place layout names live.
import { umapLayout } from "./umap.js";
import { timelineLayout } from "./timeline.js";
import type { Layout } from "./types.js";

export const layouts = {
	umap: umapLayout,
	timeline: timelineLayout
	// later: decadeBars, progressionBeeswarm
} satisfies Record<string, Layout<any>>;

export type LayoutName = keyof typeof layouts;

export type LayoutParams<Name extends LayoutName> =
	(typeof layouts)[Name] extends Layout<infer Params> ? Params : never;
