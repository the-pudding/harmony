import {
	openStore,
	getJson,
	setJson,
	type IdbStore
} from "../../../../../utils/indexedDb.js";
import type { EmbeddingResult } from "./createEmbeddingState.svelte.js";
import type { Coords, ComponentLoading } from "../reducers/index.js";

const DB_NAME = "harmony-embeddings";
const DB_VERSION = 1;
const STORE_NAME = "embeddingResults";

type SerializedEmbeddingResult = {
	coordsByKey: [string, Coords][];
	componentLoadings: ComponentLoading[][] | null;
	explainedVariance: number[] | null;
};

const serialize = (result: EmbeddingResult): SerializedEmbeddingResult => ({
	coordsByKey: [...result.coordsByKey.entries()],
	componentLoadings: result.componentLoadings,
	explainedVariance: result.explainedVariance
});

const deserialize = (raw: SerializedEmbeddingResult): EmbeddingResult => ({
	coordsByKey: new Map(raw.coordsByKey),
	componentLoadings: raw.componentLoadings,
	explainedVariance: raw.explainedVariance
});

let storePromise: Promise<IdbStore> | null = null;

const getStore = (): Promise<IdbStore> => {
	if (!storePromise) {
		storePromise = openStore(DB_NAME, DB_VERSION, STORE_NAME);
	}
	return storePromise;
};

const memoryCache = new Map<string, EmbeddingResult>();

export const getCachedEmbedding = async (
	key: string
): Promise<EmbeddingResult | null> => {
	const memHit = memoryCache.get(key);
	if (memHit) return memHit;

	try {
		const store = await getStore();
		const idbHit = await getJson<SerializedEmbeddingResult>(store, key);
		if (idbHit) {
			const result = deserialize(idbHit);
			memoryCache.set(key, result);
			return result;
		}
	} catch {
		// IDB unavailable — proceed to compute
	}

	return null;
};

export const setCachedEmbedding = async (
	key: string,
	result: EmbeddingResult
): Promise<void> => {
	memoryCache.set(key, result);
	try {
		const store = await getStore();
		await setJson(store, key, serialize(result));
	} catch {
		// Quota exceeded or IDB unavailable — silently ignore
	}
};
