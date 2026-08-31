import type { Coords } from "./types.js";

type Vec2 = [number, number];
type Matrix2x2 = [[number, number], [number, number]];

const centroid2D = (points: Vec2[]): Vec2 => {
	if (points.length === 0) return [0, 0];
	const sumX = points.reduce((s, [x]) => s + x, 0);
	const sumY = points.reduce((s, [, y]) => s + y, 0);
	return [sumX / points.length, sumY / points.length];
};

const centerPoints = (points: Vec2[], center: Vec2): Vec2[] =>
	points.map(([x, y]): Vec2 => [x - center[0], y - center[1]]);

// Cross-covariance A^T * B where A and B are arrays of 2D row vectors.
const crossCovariance2D = (a: Vec2[], b: Vec2[]): Matrix2x2 => {
	const m: Matrix2x2 = [
		[0, 0],
		[0, 0]
	];
	for (let i = 0; i < a.length; i++) {
		m[0][0] += a[i][0] * b[i][0];
		m[0][1] += a[i][0] * b[i][1];
		m[1][0] += a[i][1] * b[i][0];
		m[1][1] += a[i][1] * b[i][1];
	}
	return m;
};

type OrthoTransform = { cosTheta: number; sinTheta: number; reflect: boolean };

// Orthogonal Procrustes in 2D: find R (rotation or rotation + reflection) that
// minimizes ||A * R - B||_F. This is the closed-form 2D solution without a full
// SVD decomposition.
//
// For a pure rotation R = [[c, -s], [s, c]]:
//   tr(R * M^T) = c*(M00+M11) + s*(M10-M01)  →  max at θ = atan2(M10-M01, M00+M11)
// For a reflection R = [[c, s], [s, -c]]:
//   max tr is sqrt((M00-M11)² + (M01+M10)²)
// We pick whichever gives the higher trace.
const procrustes2D = (m: Matrix2x2): OrthoTransform => {
	const rotScore = Math.hypot(m[0][0] + m[1][1], m[1][0] - m[0][1]);
	const reflScore = Math.hypot(m[0][0] - m[1][1], m[0][1] + m[1][0]);

	if (rotScore >= reflScore) {
		const theta = Math.atan2(m[1][0] - m[0][1], m[0][0] + m[1][1]);
		return { cosTheta: Math.cos(theta), sinTheta: Math.sin(theta), reflect: false };
	}

	const theta = Math.atan2(m[0][1] + m[1][0], m[0][0] - m[1][1]);
	return { cosTheta: Math.cos(theta), sinTheta: Math.sin(theta), reflect: true };
};

const applyTransform2D = (
	[x, y]: Vec2,
	{ cosTheta, sinTheta, reflect }: OrthoTransform
): Vec2 =>
	reflect
		? [x * cosTheta + y * sinTheta, x * sinTheta - y * cosTheta]
		: [x * cosTheta - y * sinTheta, x * sinTheta + y * cosTheta];

// Rotates (and optionally reflects) the UMAP 2D layout so that it best aligns
// with the reference coordinate frame (usually the feature-axes brightness/complexity
// coords). Topology is unchanged — only the orientation of the plane is adjusted —
// so clusters remain intact and the visual map feels stable between method switches.
export const orientCoords = (
	umapCoords: Map<string, Coords>,
	referenceCoords: Map<string, { x: number; y: number }>
): Map<string, Coords> => {
	const songKeys = [...umapCoords.keys()].filter((key) =>
		referenceCoords.has(key)
	);
	if (songKeys.length < 2) return umapCoords;

	const umapPoints: Vec2[] = songKeys.map((key) => {
		const c = umapCoords.get(key)!;
		return [c.x, c.y];
	});
	const refPoints: Vec2[] = songKeys.map((key) => {
		const c = referenceCoords.get(key)!;
		return [c.x, c.y];
	});

	const umapCenter = centroid2D(umapPoints);
	const centeredUmap = centerPoints(umapPoints, umapCenter);
	const refCenter = centroid2D(refPoints);
	const centeredRef = centerPoints(refPoints, refCenter);

	const m = crossCovariance2D(centeredUmap, centeredRef);
	const transform = procrustes2D(m);

	const rotatedBySongKey = new Map(
		songKeys.map((key, i) => [key, applyTransform2D(centeredUmap[i]!, transform)])
	);

	return new Map(
		[...umapCoords.entries()].map(([key, coords]) => {
			const rotated = rotatedBySongKey.get(key);
			return [
				key,
				rotated ? { ...coords, x: rotated[0], y: rotated[1] } : coords
			];
		})
	);
};
