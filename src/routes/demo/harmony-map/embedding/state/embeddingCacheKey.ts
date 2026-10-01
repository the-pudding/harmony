import { hashString } from "../../../../../utils/hashString.js";
import {
	UMAP_MIN_DISTANCE,
	type EmbeddingDimension,
	type EmbeddingMethod
} from "../reducers/index.js";
import type { BlendWeights, SongVectorOptions } from "../vectors/index.js";

export const EMBEDDING_SCHEMA_VERSION = 7;

export const buildEmbeddingCacheKey = async (
	coverageCacheKey: string,
	method: EmbeddingMethod,
	options: SongVectorOptions,
	dimension: EmbeddingDimension,
	blendWeights?: BlendWeights,
	umapMinDist: number = UMAP_MIN_DISTANCE
): Promise<string> => {
	const input = [
		coverageCacheKey,
		method,
		String(dimension),
		JSON.stringify(options),
		blendWeights !== undefined ? JSON.stringify(blendWeights) : "",
		String(EMBEDDING_SCHEMA_VERSION),
		// Omitted at the default so layouts cached before minDist was
		// configurable still resolve to the same key.
		...(umapMinDist === UMAP_MIN_DISTANCE ? [] : [`minDist=${umapMinDist}`])
	].join("||");
	return hashString(input);
};
