import type { Coords } from "./types.js";

type Vec2 = { x: number; y: number };

export const ALIGNMENT_ANGLE_STEP_DEGREES = 5;
export const ALIGNMENT_ANGLE_MIN_DEGREES = -180;
export const ALIGNMENT_ANGLE_MAX_DEGREES = 180;
export const PROGRESSION_REFERENCE_METHOD = "umap" as const;

export type AlignmentResult = {
	coordsByKey: Map<string, Coords>;
	rotationDegrees: number;
};

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const centroid = (points: readonly Vec2[]): Vec2 => {
	if (points.length === 0) return { x: 0, y: 0 };
	const sum = points.reduce(
		(acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
		{ x: 0, y: 0 }
	);
	return { x: sum.x / points.length, y: sum.y / points.length };
};

const rmsRadius = (points: readonly Vec2[], center: Vec2): number => {
	if (points.length === 0) return 0;
	const sumSquares = points.reduce((sum, point) => {
		const dx = point.x - center.x;
		const dy = point.y - center.y;
		return sum + dx * dx + dy * dy;
	}, 0);
	return Math.sqrt(sumSquares / points.length);
};

const rotateAbout = (point: Vec2, center: Vec2, cosTheta: number, sinTheta: number): Vec2 => {
	const dx = point.x - center.x;
	const dy = point.y - center.y;
	return {
		x: center.x + dx * cosTheta - dy * sinTheta,
		y: center.y + dx * sinTheta + dy * cosTheta
	};
};

const totalSquaredDistance = (a: readonly Vec2[], b: readonly Vec2[]): number => {
	let sum = 0;
	for (let index = 0; index < a.length; index++) {
		const dx = a[index]!.x - b[index]!.x;
		const dy = a[index]!.y - b[index]!.y;
		sum += dx * dx + dy * dy;
	}
	return sum;
};

const alignmentCandidateDegrees = (): readonly number[] => {
	const candidates: number[] = [];
	for (
		let degrees = ALIGNMENT_ANGLE_MIN_DEGREES;
		degrees < ALIGNMENT_ANGLE_MAX_DEGREES;
		degrees += ALIGNMENT_ANGLE_STEP_DEGREES
	) {
		candidates.push(degrees);
	}
	return candidates;
};

const sharedPoints = (
	coordsByKey: Map<string, Coords>,
	referenceCoords: Map<string, { x: number; y: number }>
): { source: Vec2[]; reference: Vec2[]; songKeys: string[] } => {
	const songKeys = [...coordsByKey.keys()].filter((key) => referenceCoords.has(key));
	const source = songKeys.map((key) => {
		const coords = coordsByKey.get(key)!;
		return { x: coords.x, y: coords.y };
	});
	const reference = songKeys.map((key) => {
		const coords = referenceCoords.get(key)!;
		return { x: coords.x, y: coords.y };
	});
	return { source, reference, songKeys };
};

const toUnitShape = (points: readonly Vec2[]): Vec2[] => {
	const center = centroid(points);
	const scale = rmsRadius(points, center);
	if (scale === 0) {
		return points.map(() => ({ x: 0, y: 0 }));
	}
	return points.map((point) => ({
		x: (point.x - center.x) / scale,
		y: (point.y - center.y) / scale
	}));
};

export const alignCoordsToReferenceByAngleSearch = (
	coordsByKey: Map<string, Coords>,
	referenceCoords: Map<string, { x: number; y: number }>
): AlignmentResult => {
	const { source, reference, songKeys } = sharedPoints(coordsByKey, referenceCoords);
	if (songKeys.length < 2) {
		return { coordsByKey, rotationDegrees: 0 };
	}

	const sourceShape = toUnitShape(source);
	const referenceShape = toUnitShape(reference);
	const shapeCenter = { x: 0, y: 0 };

	let bestDegrees = 0;
	let bestDistance = Number.POSITIVE_INFINITY;

	for (const degrees of alignmentCandidateDegrees()) {
		const radians = degreesToRadians(degrees);
		const cosTheta = Math.cos(radians);
		const sinTheta = Math.sin(radians);
		const rotated = sourceShape.map((point) =>
			rotateAbout(point, shapeCenter, cosTheta, sinTheta)
		);
		const distance = totalSquaredDistance(rotated, referenceShape);
		if (distance < bestDistance) {
			bestDistance = distance;
			bestDegrees = degrees;
		}
	}

	if (bestDegrees === 0) {
		return { coordsByKey, rotationDegrees: 0 };
	}

	const radians = degreesToRadians(bestDegrees);
	const cosTheta = Math.cos(radians);
	const sinTheta = Math.sin(radians);
	const sourceCenter = centroid(source);
	const rotatedBySongKey = new Map(
		songKeys.map((key, index) => [
			key,
			rotateAbout(source[index]!, sourceCenter, cosTheta, sinTheta)
		])
	);

	const alignedCoords = new Map(
		[...coordsByKey.entries()].map(([key, coords]) => {
			const rotated = rotatedBySongKey.get(key);
			return [
				key,
				rotated ? { ...coords, x: rotated.x, y: rotated.y } : coords
			];
		})
	);

	return { coordsByKey: alignedCoords, rotationDegrees: bestDegrees };
};
