import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import type { AllSongsCoverageResult } from "./index.js";
import { openStore, getJson, setJson, type IdbStore } from "../../../../utils/indexedDb.js";
import { buildCoverageCacheKey } from "./coverageCacheKey.js";

const DB_NAME = "harmony-coverage";
const DB_VERSION = 1;
const STORE_NAME = "allSongsCoverage";

let storePromise: Promise<IdbStore> | null = null;

const getStore = (): Promise<IdbStore> => {
	if (!storePromise) {
		storePromise = openStore(DB_NAME, DB_VERSION, STORE_NAME);
	}
	return storePromise;
};

const memoryCache = new Map<string, AllSongsCoverageResult>();

export const getCachedCoverage = async (
	progressions: CoreProgression[],
	songs: GroupedSong[]
): Promise<{ key: string; result: AllSongsCoverageResult | null }> => {
	const key = await buildCoverageCacheKey(progressions, songs);

	const memHit = memoryCache.get(key);
	if (memHit) return { key, result: memHit };

	try {
		const store = await getStore();
		const idbHit = await getJson<AllSongsCoverageResult>(store, key);
		if (idbHit) {
			memoryCache.set(key, idbHit);
			return { key, result: idbHit };
		}
	} catch {
		// IDB unavailable — proceed to compute
	}

	return { key, result: null };
};

export const setCachedCoverage = async (
	key: string,
	result: AllSongsCoverageResult
): Promise<void> => {
	memoryCache.set(key, result);
	try {
		const store = await getStore();
		await setJson(store, key, result);
	} catch {
		// Quota exceeded or IDB unavailable — silently ignore
	}
};
