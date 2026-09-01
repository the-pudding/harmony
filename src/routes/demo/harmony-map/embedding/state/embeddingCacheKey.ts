import { hashString } from "../../../../../utils/hashString.js";
import type { EmbeddingDimension, EmbeddingMethod } from "../reducers/index.js";
import type { BlendWeights, SongVectorOptions } from "../vectors/index.js";

export const EMBEDDING_SCHEMA_VERSION = 6;

export const buildEmbeddingCacheKey = async (
	coverageCacheKey: string,
	method: EmbeddingMethod,
	options: SongVectorOptions,
	dimension: EmbeddingDimension,
	blendWeights?: BlendWeights
): Promise<string> => {
	const input = [
		coverageCacheKey,
		method,
		String(dimension),
		JSON.stringify(options),
		blendWeights !== undefined ? JSON.stringify(blendWeights) : "",
		String(EMBEDDING_SCHEMA_VERSION)
	].join("||");
	return hashString(input);
};
