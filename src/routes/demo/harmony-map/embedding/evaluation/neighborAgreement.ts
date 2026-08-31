import { cosineSimilarity } from "../vectors/nearestNeighbors.js";
import type { SongVector } from "../vectors/songVectors.js";
import type { Coords } from "../reducers/types.js";

export const NEIGHBOR_AGREEMENT_K = 8;

const euclideanDistance2D = (a: Coords, b: Coords): number =>
	Math.hypot(a.x - b.x, a.y - b.y);

const nearest2DNeighborKeys = (
	songKey: string,
	coordsByKey: Map<string, Coords>,
	k: number
): Set<string> => {
	const target = coordsByKey.get(songKey);
	if (!target) return new Set();

	const candidates: { key: string; dist: number }[] = [];
	for (const [key, coords] of coordsByKey) {
		if (key === songKey) continue;
		candidates.push({ key, dist: euclideanDistance2D(target, coords) });
	}
	candidates.sort((a, b) => a.dist - b.dist);

	return new Set(candidates.slice(0, k).map(({ key }) => key));
};

const nearestHighDimNeighborKeys = (
	vector: SongVector,
	vectors: readonly SongVector[],
	k: number
): Set<string> => {
	const candidates: { key: string; sim: number }[] = [];
	for (const other of vectors) {
		if (other.songKey === vector.songKey) continue;
		candidates.push({
			key: other.songKey,
			sim: cosineSimilarity(vector.weighted, other.weighted)
		});
	}
	candidates.sort((a, b) => b.sim - a.sim);

	return new Set(candidates.slice(0, k).map(({ key }) => key));
};

// Trustworthiness proxy: mean fraction of each song's k high-dimensional cosine
// neighbors that also appear in its k nearest 2D neighbors. Score in [0, 1];
// higher means the 2D layout faithfully preserves high-dim proximity.
export const computeNeighborAgreement = (
	coordsByKey: Map<string, Coords>,
	vectors: readonly SongVector[],
	k: number = NEIGHBOR_AGREEMENT_K
): number => {
	if (vectors.length <= k) return 0;

	const totalOverlap = vectors.reduce((sum, vector) => {
		const neighbors2D = nearest2DNeighborKeys(vector.songKey, coordsByKey, k);
		const neighborsHD = nearestHighDimNeighborKeys(vector, vectors, k);
		const overlap = [...neighborsHD].filter((key) => neighbors2D.has(key)).length;
		return sum + overlap / k;
	}, 0);

	return totalOverlap / vectors.length;
};
