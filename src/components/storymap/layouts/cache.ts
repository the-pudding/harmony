// Memoizes layouts by name, params, frame size (framed layouts only, so
// resizing never recomputes UMAP) and song table identity.
import { layouts, type LayoutName, type LayoutParams } from "./index.js";
import type { LayoutContext, LayoutResult } from "./types.js";
import type { SongTable } from "../songTable.js";

// Frame sizes churn during a resize; keep only the most recent.
const MAX_ENTRIES_PER_TABLE = 8;

const caches = new WeakMap<SongTable, Map<string, LayoutResult>>();

export const computeLayout = <Name extends LayoutName>(
	name: Name,
	params: LayoutParams<Name>,
	context: LayoutContext
): LayoutResult => {
	const { songs, frame } = context;
	let cache = caches.get(songs);
	if (!cache) {
		cache = new Map();
		caches.set(songs, cache);
	}
	const layout = layouts[name] as {
		framed: boolean;
		compute: (context: LayoutContext, params: unknown) => LayoutResult;
	};
	const frameKey = layout.framed ? `${frame.width}|${frame.height}` : "";
	const key = `${name}|${JSON.stringify(params)}|${frameKey}`;
	const hit = cache.get(key);
	if (hit) {
		// Re-insert so the stalest entry is first.
		cache.delete(key);
		cache.set(key, hit);
		return hit;
	}

	const result = layout.compute(context, params);
	cache.set(key, result);
	if (cache.size > MAX_ENTRIES_PER_TABLE) {
		cache.delete(cache.keys().next().value!);
	}
	return result;
};
