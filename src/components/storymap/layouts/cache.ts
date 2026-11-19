// Layouts are pure, so they're memoized in one place, never inside a layout:
// by name, params (by value), frame size and the song table (by identity).
import { layouts, type LayoutName, type LayoutParams } from "./index.js";
import type { LayoutContext, LayoutResult } from "./types.js";
import type { SongTable } from "../songTable.js";

// Frame sizes churn while a window is resized; keep only the latest few.
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
	const key = `${name}|${JSON.stringify(params)}|${frame.width}|${frame.height}`;
	const hit = cache.get(key);
	if (hit) return hit;

	const layout = layouts[name] as {
		compute: (context: LayoutContext, params: unknown) => LayoutResult;
	};
	const result = layout.compute(context, params);
	cache.set(key, result);
	if (cache.size > MAX_ENTRIES_PER_TABLE) {
		cache.delete(cache.keys().next().value!);
	}
	return result;
};
