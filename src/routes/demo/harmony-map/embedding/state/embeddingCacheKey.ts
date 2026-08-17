import { hashString } from "../../../../../utils/hashString.js";
import type { EmbeddingMethod } from "../reducers/index.js";
import type { SongVectorOptions } from "../vectors/index.js";

export const EMBEDDING_SCHEMA_VERSION = 1;

export const buildEmbeddingCacheKey = async (
	coverageCacheKey: string,
	method: EmbeddingMethod,
	options: SongVectorOptions
): Promise<string> => {
	const input = [
		coverageCacheKey,
		method,
		JSON.stringify(options),
		String(EMBEDDING_SCHEMA_VERSION)
	].join("||");
	return hashString(input);
};
