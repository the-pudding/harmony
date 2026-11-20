// Layout registry.
import { umapLayout } from "./umap.js";
import { timelineLayout } from "./timeline.js";
import { offstageLayout } from "./offstage.js";
import type { Layout } from "./types.js";

export const layouts = {
	umap: umapLayout,
	timeline: timelineLayout,
	offstage: offstageLayout
} satisfies Record<string, Layout<any>>;

export type LayoutName = keyof typeof layouts;

export type LayoutParams<Name extends LayoutName> =
	(typeof layouts)[Name] extends Layout<infer Params> ? Params : never;
