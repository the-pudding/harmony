export type EmbeddingPoint = { songKey: string; x: number; y: number };

// Rescales raw embedding coordinates (whatever range UMAP happened to
// produce) to fill a worldSize x worldSize square, independently per axis —
// the fixed "world" that the pannable map's viewport moves around inside.
export const buildWorldPoints = (
	points: readonly EmbeddingPoint[],
	worldSize: number
): EmbeddingPoint[] => {
	if (points.length === 0) return [];

	const bounds = points.reduce(
		(extent, p) => ({
			minX: Math.min(extent.minX, p.x),
			maxX: Math.max(extent.maxX, p.x),
			minY: Math.min(extent.minY, p.y),
			maxY: Math.max(extent.maxY, p.y)
		}),
		{ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
	);

	const spanX = bounds.maxX - bounds.minX || 1;
	const spanY = bounds.maxY - bounds.minY || 1;

	return points.map((p) => ({
		songKey: p.songKey,
		x: ((p.x - bounds.minX) / spanX) * worldSize,
		y: ((p.y - bounds.minY) / spanY) * worldSize
	}));
};
