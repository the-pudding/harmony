// Layouts are pure, so they're memoized in one place, never inside a layout:
// by name, params (by value), frame size (framed layouts only, so resizing
// the window never recomputes UMAP) and the song table (by identity).
import { layouts, type LayoutName, type LayoutParams } from "./index.js";
import type { LayoutContext, LayoutResult } from "./types.js";
import type { SongTable } from "../songTable.js";

// Frame sizes churn while a window is resized; keep only the few most
// recently used.
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
		// Most recently used last, so eviction drops the stalest.
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
