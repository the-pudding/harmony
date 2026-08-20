// Density-based clustering (DBSCAN) over normalized [0,1]x[0,1] scatter
// positions, so "super clustered" groups of songs can be circled on the map.
// Grid-accelerated: the corpus runs to ~24k songs, so neighbor queries use a
// spatial hash instead of brute force (see buildGrid/neighborsWithin).
// Geometry (centroid/radius) is deliberately NOT computed here — the caller
// draws circles from the *live, tweening* screen positions of each cluster's
// members, so this module only decides membership.

export type ClusterPoint = { songKey: string; x: number; y: number };

// hash is a fingerprint of a cluster's exact membership (order-independent),
// used only as a per-render React-like key (e.g. to key the resolved-name
// map) — not for cluster identity. Persisted cluster names are instead
// anchored to one member song (see EmbeddingScatter's NamedCluster), so a
// name survives membership drift even though this hash does not.
export type DensityCluster = { id: number; songKeys: string[]; hash: string };

// Not cryptographic — just a fast, deterministic fingerprint of a song-key
// set, used only as a render key.
const hashSongKeys = (songKeys: readonly string[]): string => {
	const sorted = [...songKeys].sort();
	let hash = 0x811c9dc5; // FNV-1a offset basis
	for (const key of sorted) {
		for (let index = 0; index < key.length; index++) {
			hash ^= key.charCodeAt(index);
			hash = Math.imul(hash, 0x01000193);
		}
		hash ^= 0x1e; // record separator, so key concatenation can't collide
	}
	return (hash >>> 0).toString(36);
};

// Minimum neighbors (within eps) for a point to seed/extend a cluster.
export const MIN_CLUSTER_POINTS = 15;

// How many points to sample when estimating eps from k-distances. Bounds the
// one-time estimation cost independent of corpus size.
const EPS_SAMPLE_SIZE = 300;

// eps = this multiplier * the sampled median distance-to-MIN_CLUSTER_POINTSth-neighbor.
// Higher = fewer, larger, looser clusters.
const EPS_DISTANCE_MULTIPLIER = 1.3;

const MIN_EPS = 0.006;

// Target average occupancy for the coarse grid used only to *estimate* eps —
// big enough that a 3x3 block usually already has minPoints neighbors.
const ESTIMATION_CELL_TARGET_OCCUPANCY = 12;
const MAX_RING_EXPANSIONS = 6;

const UNVISITED = -1;
const NOISE = -2;

type Grid = { cellSize: number; cellsByKey: Map<string, number[]> };

const cellKeyFor = (cellX: number, cellY: number): string =>
	`${cellX},${cellY}`;

const buildGrid = (points: readonly ClusterPoint[], cellSize: number): Grid => {
	const cellsByKey = new Map<string, number[]>();
	points.forEach((point, index) => {
		const key = cellKeyFor(
			Math.floor(point.x / cellSize),
			Math.floor(point.y / cellSize)
		);
		const bucket = cellsByKey.get(key);
		if (bucket) bucket.push(index);
		else cellsByKey.set(key, [index]);
	});
	return { cellSize, cellsByKey };
};

const candidatesWithinRing = (
	grid: Grid,
	cellX: number,
	cellY: number,
	ring: number
): number[] => {
	const candidates: number[] = [];
	for (let dx = -ring; dx <= ring; dx++) {
		for (let dy = -ring; dy <= ring; dy++) {
			const bucket = grid.cellsByKey.get(cellKeyFor(cellX + dx, cellY + dy));
			if (bucket) candidates.push(...bucket);
		}
	}
	return candidates;
};

// Approximates the distance to each point's k-th nearest neighbor using the
// coarse grid instead of a brute-force scan against all n points: expand the
// search ring by ring until at least k+1 candidates are in view, then rank
// only that local, bounded set.
const kthNearestDistanceViaGrid = (
	points: readonly ClusterPoint[],
	grid: Grid,
	originIndex: number,
	k: number
): number => {
	const origin = points[originIndex];
	const cellX = Math.floor(origin.x / grid.cellSize);
	const cellY = Math.floor(origin.y / grid.cellSize);

	let ring = 1;
	let candidates = candidatesWithinRing(grid, cellX, cellY, ring);
	while (candidates.length <= k && ring < MAX_RING_EXPANSIONS) {
		ring += 1;
		candidates = candidatesWithinRing(grid, cellX, cellY, ring);
	}

	const distances = candidates
		.filter((index) => index !== originIndex)
		.map((index) =>
			Math.hypot(points[index].x - origin.x, points[index].y - origin.y)
		)
		.sort((first, second) => first - second);

	return distances[k - 1] ?? distances[distances.length - 1] ?? MIN_EPS;
};

const boundsOf = (
	points: readonly ClusterPoint[]
): { width: number; height: number } => {
	const extent = points.reduce(
		(accumulator, point) => ({
			minX: Math.min(accumulator.minX, point.x),
			maxX: Math.max(accumulator.maxX, point.x),
			minY: Math.min(accumulator.minY, point.y),
			maxY: Math.max(accumulator.maxY, point.y)
		}),
		{ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
	);
	return {
		width: Math.max(extent.maxX - extent.minX, MIN_EPS),
		height: Math.max(extent.maxY - extent.minY, MIN_EPS)
	};
};

const estimateEps = (
	points: readonly ClusterPoint[],
	minPoints: number
): number => {
	if (points.length <= minPoints) return MIN_EPS;

	const { width, height } = boundsOf(points);
	const estimationCellSize = Math.max(
		MIN_EPS,
		Math.sqrt(
			(width * height * ESTIMATION_CELL_TARGET_OCCUPANCY) / points.length
		)
	);
	const estimationGrid = buildGrid(points, estimationCellSize);

	const sampleStep = Math.max(1, Math.floor(points.length / EPS_SAMPLE_SIZE));
	const samples: number[] = [];
	for (let index = 0; index < points.length; index += sampleStep) {
		samples.push(
			kthNearestDistanceViaGrid(points, estimationGrid, index, minPoints)
		);
	}
	samples.sort((first, second) => first - second);
	const median = samples[Math.floor(samples.length / 2)] ?? MIN_EPS;
	return Math.max(MIN_EPS, median * EPS_DISTANCE_MULTIPLIER);
};

// eps <= grid.cellSize, so the 9 cells surrounding a point's own cell are
// guaranteed to cover every point within eps of it.
const neighborsWithin = (
	points: readonly ClusterPoint[],
	grid: Grid,
	originIndex: number,
	eps: number
): number[] => {
	const origin = points[originIndex];
	const cellX = Math.floor(origin.x / grid.cellSize);
	const cellY = Math.floor(origin.y / grid.cellSize);
	const epsSquared = eps * eps;
	const found: number[] = [];

	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			const bucket = grid.cellsByKey.get(cellKeyFor(cellX + dx, cellY + dy));
			if (!bucket) continue;
			for (const candidateIndex of bucket) {
				const candidate = points[candidateIndex];
				const distX = candidate.x - origin.x;
				const distY = candidate.y - origin.y;
				if (distX * distX + distY * distY <= epsSquared)
					found.push(candidateIndex);
			}
		}
	}

	return found;
};

const clustersFromLabels = (
	points: readonly ClusterPoint[],
	labels: readonly number[]
): DensityCluster[] => {
	const memberIndicesByCluster = new Map<number, number[]>();
	labels.forEach((label, index) => {
		if (label < 0) return;
		const bucket = memberIndicesByCluster.get(label);
		if (bucket) bucket.push(index);
		else memberIndicesByCluster.set(label, [index]);
	});

	return [...memberIndicesByCluster.entries()]
		.map(([id, memberIndices]) => {
			const songKeys = memberIndices.map((index) => points[index].songKey);
			return { id, songKeys, hash: hashSongKeys(songKeys) };
		})
		.sort((first, second) => second.songKeys.length - first.songKeys.length);
};

export const findDensityClusters = (
	points: readonly ClusterPoint[],
	minPoints: number = MIN_CLUSTER_POINTS
): DensityCluster[] => {
	if (points.length < minPoints) return [];

	const eps = estimateEps(points, minPoints);
	const grid = buildGrid(points, eps);

	const labels = new Array<number>(points.length).fill(UNVISITED);
	let nextClusterId = 0;

	for (let index = 0; index < points.length; index++) {
		if (labels[index] !== UNVISITED) continue;

		const seedNeighbors = neighborsWithin(points, grid, index, eps);
		if (seedNeighbors.length < minPoints) {
			labels[index] = NOISE;
			continue;
		}

		const clusterId = nextClusterId++;
		labels[index] = clusterId;
		const queue = [...seedNeighbors];

		while (queue.length > 0) {
			const currentIndex = queue.pop()!;
			if (labels[currentIndex] === NOISE) labels[currentIndex] = clusterId;
			if (labels[currentIndex] !== UNVISITED) continue;
			labels[currentIndex] = clusterId;

			const currentNeighbors = neighborsWithin(points, grid, currentIndex, eps);
			if (currentNeighbors.length >= minPoints) queue.push(...currentNeighbors);
		}
	}

	return clustersFromLabels(points, labels);
};
