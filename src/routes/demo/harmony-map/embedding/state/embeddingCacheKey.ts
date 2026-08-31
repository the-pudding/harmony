import { hashString } from "../../../../../utils/hashString.js";
import type { EmbeddingDimension, EmbeddingMethod } from "../reducers/index.js";
import type { SongVectorOptions } from "../vectors/index.js";

export const EMBEDDING_SCHEMA_VERSION = 2;

export const buildEmbeddingCacheKey = async (
	coverageCacheKey: string,
	method: EmbeddingMethod,
	options: SongVectorOptions,
	dimension: EmbeddingDimension
): Promise<string> => {
	const input = [
		coverageCacheKey,
		method,
		String(dimension),
		JSON.stringify(options),
		String(EMBEDDING_SCHEMA_VERSION)
	].join("||");
	return hashString(input);
};
